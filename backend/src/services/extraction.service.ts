import OpenAI from 'openai';

export type ExtractedItem = {
  type: 'SUBSCRIPTION' | 'BILL' | 'WARRANTY' | 'APPOINTMENT' | 'OTHER' | null;
  merchant: string | null;
  subscription: string | null;
  vendorName: string | null;
  amount: number | null;
  currency: string | null;
  frequency: 'monthly' | 'weekly' | 'yearly' | 'unknown' | null;
  renewalDate: string | null;
  cancelBefore: string | null;
  cancelByDate: string | null;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'NEEDS_REVIEW';
  confidence: number;
  notes: string | null;
};

export type ExtractionInput =
  | { kind: 'image'; dataUrl: string }
  | { kind: 'text'; text: string };

const extractionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'merchant', 'subscription', 'vendorName', 'amount', 'currency', 'frequency', 'renewalDate', 'cancelBefore', 'cancelByDate', 'status', 'confidence', 'notes'],
  properties: {
    type: { anyOf: [{ enum: ['SUBSCRIPTION', 'BILL', 'WARRANTY', 'APPOINTMENT', 'OTHER'] }, { type: 'null' }] },
    merchant: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    subscription: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    vendorName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    amount: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    currency: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    frequency: { anyOf: [{ enum: ['monthly', 'weekly', 'yearly', 'unknown'] }, { type: 'null' }] },
    renewalDate: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    cancelBefore: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    cancelByDate: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    status: { enum: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'NEEDS_REVIEW'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
} as const;

const instructions = `Extract personal life-administration information from the supplied document or email.
Return only fields supported by the provided JSON schema. Never invent values. Use null whenever a value is missing, ambiguous, or cannot be established. Use YYYY-MM-DD for renewalDate, cancelBefore, and cancelByDate. For subscriptions, merchant is the company name, subscription is the full plan name, vendorName should equal merchant, and frequency is monthly, weekly, yearly, or unknown. Treat phrases such as "per month" as monthly. Set cancelBefore and cancelByDate to the same date when the text says "Cancel before". Use NEEDS_REVIEW when important information is missing or unclear. Lower confidence when information is incomplete or uncertain.`;

function toIsoDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.replace(/(\d{1,2})(st|nd|rd|th)/i, '$1').match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (!match) return null;
  const month = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(match[1].toLowerCase());
  const day = Number(match[2]);
  const year = Number(match[3]);
  const check = new Date(Date.UTC(year, month, day));
  if (month < 0 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month || check.getUTCDate() !== day) return null;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Handles common short renewal notices without requiring an LLM request. This
 * makes simple pasted emails resilient to configuration or model failures.
 */
function extractSimpleSubscriptionEmail(text: string): ExtractedItem | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const planMatch = normalized.match(/(?:^|\byour\s+)([a-z][a-z0-9&.' -]*?)\s+subscription\b/i);
  const subscription = planMatch?.[1]?.replace(/^your\s+/i, '').trim() || null;
  const merchant = subscription?.split(/\s+/)[0] ?? null;
  const amountMatch = normalized.match(/\bfor\s+(RM|MYR|USD|EUR|GBP|\$|€|£)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? Number(amountMatch[2].replace(/,/g, '')) : null;
  const currency = amountMatch ? amountMatch[1].toUpperCase() : null;
  const renewalDate = toIsoDate(normalized.match(/\brenews\s+on\s+([a-z]+\s+\d{1,2},?\s+\d{4})/i)?.[1]);
  const cancelBefore = toIsoDate(normalized.match(/\bcancel\s+before\s+([a-z]+\s+\d{1,2},?\s+\d{4})/i)?.[1]);
  const frequency = /\b(per\s+month|monthly)\b/i.test(normalized)
    ? 'monthly'
    : /\b(per\s+week|weekly)\b/i.test(normalized)
      ? 'weekly'
      : /\b(per\s+year|annually|yearly)\b/i.test(normalized)
        ? 'yearly'
        : subscription
          ? 'unknown'
          : null;

  if (!subscription && !amountMatch && !renewalDate && !cancelBefore) return null;

  const isComplete = Boolean(merchant && subscription && amount !== null && currency && frequency && frequency !== 'unknown' && renewalDate && cancelBefore);
  return {
    type: subscription ? 'SUBSCRIPTION' : null,
    merchant,
    subscription,
    vendorName: merchant,
    amount,
    currency,
    frequency,
    renewalDate,
    cancelBefore,
    cancelByDate: cancelBefore,
    status: isComplete ? 'ACTIVE' : 'NEEDS_REVIEW',
    confidence: isComplete ? 0.98 : 0.6,
    notes: subscription ? `${subscription} subscription${frequency && frequency !== 'unknown' ? ` billed ${frequency}` : ''}.` : null,
  };
}

function validateExtraction(value: unknown): ExtractedItem {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid structured extraction.');
  const item = value as Record<string, unknown>;
  const isStringOrNull = (field: string) => typeof item[field] === 'string' || item[field] === null;
  const isNumberOrNull = (field: string) => typeof item[field] === 'number' || item[field] === null;
  if (
    !['SUBSCRIPTION', 'BILL', 'WARRANTY', 'APPOINTMENT', 'OTHER', null].includes(item.type as string | null) ||
    !['ACTIVE', 'CANCELLED', 'EXPIRED', 'NEEDS_REVIEW'].includes(item.status as string) ||
    typeof item.confidence !== 'number' ||
    item.confidence < 0 ||
    item.confidence > 1 ||
    !isStringOrNull('vendorName') ||
    !isStringOrNull('merchant') ||
    !isStringOrNull('subscription') ||
    !isNumberOrNull('amount') ||
    !isStringOrNull('currency') ||
    !['monthly', 'weekly', 'yearly', 'unknown', null].includes(item.frequency as string | null) ||
    !isStringOrNull('renewalDate') ||
    !isStringOrNull('cancelBefore') ||
    !isStringOrNull('cancelByDate') ||
    !isStringOrNull('notes')
  ) {
    throw new Error('Structured extraction did not match the expected schema.');
  }
  const extracted = item as unknown as ExtractedItem;
  if (!extracted.type || !extracted.vendorName || extracted.amount === null) {
    extracted.status = 'NEEDS_REVIEW';
  }
  return extracted;
}

/** Uses OpenAI Structured Outputs; response text is JSON only under the strict schema above. */
export async function extractDocument(input: ExtractionInput): Promise<ExtractedItem> {
  if (input.kind === 'text') {
    const simpleExtraction = extractSimpleSubscriptionEmail(input.text);
    if (simpleExtraction) return simpleExtraction;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error('AI extraction is not configured.');

  const client = new OpenAI({ apiKey, timeout: 30_000 });
  const documentContent =
    input.kind === 'image'
      ? [{ type: 'input_image' as const, image_url: input.dataUrl, detail: 'high' as const }]
      : [{ type: 'input_text' as const, text: input.text }];

  const response = await client.responses.create({
    model,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: instructions }] },
      { role: 'user', content: documentContent },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'life_admin_item_extraction',
        strict: true,
        schema: extractionSchema,
      },
    },
  });

  if (!response.output_text) throw new Error('No structured extraction returned.');
  return validateExtraction(JSON.parse(response.output_text) as unknown);
}
