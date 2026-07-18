import type { Item } from '@prisma/client';
import OpenAI from 'openai';

type EmailIntent = 'cancellation' | 'refund or dispute' | 'warranty claim';

function getEmailIntent(item: Item): EmailIntent {
  const context = `${item.type} ${item.notes ?? ''}`.toLowerCase();
  if (item.type === 'WARRANTY' || /warranty|repair|defect|fault/.test(context)) return 'warranty claim';
  if (/refund|dispute|incorrect|unauthori[sz]ed|charged twice|billing error/.test(context)) return 'refund or dispute';
  return 'cancellation';
}

function formatItemContext(item: Item): string {
  return [
    `Vendor: ${item.vendorName}`,
    `Item type: ${item.type}`,
    `Amount: ${item.amount ?? 'Unknown'}${item.currency ? ` ${item.currency}` : ''}`,
    `Renewal date: ${item.renewalDate?.toISOString().slice(0, 10) ?? 'Unknown'}`,
    `Cancellation deadline: ${item.cancelByDate?.toISOString().slice(0, 10) ?? 'Unknown'}`,
    `Notes: ${item.notes ?? 'None'}`,
  ].join('\n');
}

/** Generates an editable email draft only; it never sends the message. */
export async function generateEmailDraft(item: Item): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error('Email generation is not configured.');

  const client = new OpenAI({ apiKey, timeout: 30_000 });
  const intent = getEmailIntent(item);
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [{
          type: 'input_text',
          text: 'Write a concise, professional customer-service email. Return plain text only—no JSON, markdown fences, commentary, or alternative drafts. Include a clear Subject line, greeting, focused body, requested action, and courteous closing. Do not invent account numbers, order numbers, or facts not supplied.',
        }],
      },
      {
        role: 'user',
        content: [{
          type: 'input_text',
          text: `Draft a ${intent} email using the following item details:\n${formatItemContext(item)}`,
        }],
      },
    ],
  });

  const email = response.output_text.trim();
  if (!email) throw new Error('No email draft returned.');
  return email;
}
