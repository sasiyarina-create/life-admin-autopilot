import { GoogleGenAI } from '@google/genai';
import { normalizeCurrency } from '../utils/currency.js';

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

const instructions = `Extract personal life-administration information from the supplied document or email.
Return only a JSON object with every one of these fields: type, merchant, subscription, vendorName, amount, currency, frequency, renewalDate, cancelBefore, cancelByDate, status, confidence, notes. Never use Markdown or code fences. Never invent values. Use null whenever a value is missing, ambiguous, or cannot be established. type must be SUBSCRIPTION, BILL, WARRANTY, APPOINTMENT, OTHER, or null. status must be ACTIVE, CANCELLED, EXPIRED, or NEEDS_REVIEW. frequency must be monthly, weekly, yearly, unknown, or null. confidence must be a number from 0 to 1. Use YYYY-MM-DD for renewalDate, cancelBefore, and cancelByDate. For subscriptions, merchant is the company name, subscription is the full plan name, vendorName should equal merchant, and frequency is monthly, weekly, yearly, or unknown. Treat phrases such as "per month" as monthly. Set cancelBefore and cancelByDate to the same date when the text says "Cancel before". Use NEEDS_REVIEW when important information is missing or unclear. Lower confidence when information is incomplete or uncertain.`;

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
  const currency = amountMatch ? normalizeCurrency(amountMatch[1]) : null;
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
  return { ...extracted, currency: normalizeCurrency(extracted.currency) };
}

function parseImageDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Could not extract information. Please enter manually.');
  return { mimeType: match[1], data: match[2] };
}

function removeMarkdownCodeFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

export async function extractDocument(input: ExtractionInput): Promise<ExtractedItem> {
  if (input.kind === 'text') {
    const simpleExtraction = extractSimpleSubscriptionEmail(input.text);
    if (simpleExtraction) return simpleExtraction;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) throw new Error('Could not extract information. Please enter manually.');

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = input.kind === 'image'
      ? [
          { text: `${instructions}\n\nExtract information from this image.` },
          { inlineData: parseImageDataUrl(input.dataUrl) },
        ]
      : `${instructions}\n\nSource text:\n${input.text}`;
    const response = await ai.models.generateContent({ model, contents });
    const text = response.text;
    if (!text) throw new Error('Could not extract information. Please enter manually.');
    return validateExtraction(JSON.parse(removeMarkdownCodeFences(text)) as unknown);
  } catch {
    throw new Error('Could not extract information. Please enter manually.');
  }
}
