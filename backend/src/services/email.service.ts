import type { Item } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import { formatCurrency } from '../utils/currency.js';

type EmailIntent = 'cancellation' | 'refund or dispute' | 'warranty claim';

function getEmailIntent(item: Item): EmailIntent {
  const context = `${item.type} ${item.notes ?? ''}`.toLowerCase();

  if (
    item.type === 'WARRANTY' ||
    /warranty|repair|defect|fault/.test(context)
  ) {
    return 'warranty claim';
  }

  if (
    /refund|dispute|incorrect|unauthori[sz]ed|charged twice|billing error/.test(
      context
    )
  ) {
    return 'refund or dispute';
  }

  return 'cancellation';
}

function formatItemContext(item: Item): string {
  return [
    `Vendor: ${item.vendorName}`,
    `Item type: ${item.type}`,
    `Amount: ${formatCurrency(item.amount, item.currency)}`,
    `Renewal date: ${item.renewalDate?.toISOString().slice(0, 10) ?? 'Unknown'}`,
    `Cancellation deadline: ${item.cancelByDate?.toISOString().slice(0, 10) ?? 'Unknown'}`,
    `Notes: ${item.notes ?? 'None'}`,
  ].join('\n');
}

/**
 * Generates an editable email draft only.
 * It NEVER sends the email.
 */
export async function generateEmailDraft(item: Item): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!apiKey || !model) {
    throw new Error('Unable to generate email.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const intent = getEmailIntent(item);
    const response = await ai.models.generateContent({
      model,
      contents: `Write a concise, professional ${intent} email using the item details below.
Return only plain text. Do not use Markdown, JSON, code fences, commentary, or alternative drafts.
Include a Subject line, greeting, focused body, requested action, and courteous closing.
Do not invent account numbers, order numbers, or facts not supplied.

${formatItemContext(item)}`,
    });

    const email = response.text?.trim();
    if (!email) {
      throw new Error('Unable to generate email.');
    }

    return email;
  } catch {
    throw new Error('Unable to generate email.');
  }
}
