import { google, type gmail_v1 } from 'googleapis';
import { prisma } from '../prisma/client.js';
import { normalizeCurrency } from '../utils/currency.js';
import { extractDocument, type ExtractedItem } from './extraction.service.js';
import { AppError } from '../utils/app-error.js';

const gmailScope = 'https://www.googleapis.com/auth/gmail.readonly';
const relevantPattern = /\b(subscription|renew|renewal|monthly|annual|membership|invoice|receipt|payment|paid|billing|charge|charged|premium|plan|warranty|insurance|policy|streaming|license|licence|utilities?|banking|internet|phone plan|netflix|spotify|adobe|microsoft|google one|apple|gym|amazon prime|canva|icloud)\b|(?:\brm\s*\d)|(?:\busd\s*\d)|\$\s*\d/i;
const irrelevantPattern = /\b(otp|one[- ]time password|verification code|verify your|password reset|sign[- ]in attempt|github notification|social notification|calendar invite|unsubscribe|newsletter|marketing|promotion|discount|special offer|flash sale|shipping update|out for delivery|food delivery|order delivered|spam)\b/i;
const importableTypes = new Set(['SUBSCRIPTION', 'BILL', 'WARRANTY', 'APPOINTMENT']);

export type GmailSyncSummary = {
  scanned: number;
  relevant: number;
  pending: number;
  imported: number;
  skipped: number;
  duplicates: number;
  failed: number;
};

function oauth() {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_REDIRECT_URI: redirectUri } = process.env;
  if (!clientId || !clientSecret || !redirectUri) throw new AppError('Gmail OAuth is not configured.', 503);
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function assertGmailCredentials(client: ReturnType<typeof oauth>): void {
  if (!client.credentials.access_token && !client.credentials.refresh_token) {
    throw new AppError('Gmail authorization is unavailable. Please reconnect Gmail.', 401);
  }
}

function logSkip(messageId: string, reason: string): void {
  console.info(`[Gmail sync] Skipped ${messageId}: ${reason}`);
}

function logFailure(messageId: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : 'Unknown error';
  console.warn(`[Gmail sync] Failed ${messageId}: ${detail}`);
}

export function getGoogleAuthUrl(state: string): string {
  return oauth().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: [gmailScope], state });
}

export async function finishGoogleAuth(code: string, email: string): Promise<void> {
  const client = oauth();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new AppError('Google did not return offline access. Reconnect Gmail and approve access.', 400);
  client.setCredentials(tokens);
  assertGmailCredentials(client);
  await prisma.gmailConnection.upsert({
    where: { id: 'default' },
    create: { id: 'default', email, refreshToken: tokens.refresh_token },
    update: { email, refreshToken: tokens.refresh_token },
  });
}

export async function getGmailStatus() {
  const connection = await prisma.gmailConnection.findUnique({ where: { id: 'default' } });
  return { connected: Boolean(connection), email: connection?.email ?? null, lastSync: connection?.lastSyncAt ?? null, emailsImported: connection?.importedCount ?? 0, lastScanned: connection?.lastScanned ?? 0, lastRelevant: connection?.lastRelevant ?? 0, lastDuplicates: connection?.lastDuplicates ?? 0, lastIgnored: connection?.lastIgnored ?? 0 };
}

function decode(value?: string | null): string {
  return Buffer.from((value ?? '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function htmlToText(html: string): string {
  const withoutNonContent = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  const withBreaks = withoutNonContent.replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, '\n');
  const untagged = withBreaks.replace(/<[^>]+>/g, ' ');
  return untagged
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number(decimal)))
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function collectBodyParts(part: gmail_v1.Schema$MessagePart, plain: string[], html: string[]): void {
  if (part.filename) return;
  if (part.mimeType === 'text/plain' && part.body?.data) plain.push(decode(part.body.data));
  if (part.mimeType === 'text/html' && part.body?.data) html.push(htmlToText(decode(part.body.data)));
  for (const child of part.parts ?? []) collectBodyParts(child, plain, html);
}

function messageBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';
  const plain: string[] = [];
  const html: string[] = [];
  collectBodyParts(payload, plain, html);
  return (plain.join('\n').trim() || html.join('\n').trim()).slice(0, 30_000);
}

function isLikelyRelevant(subject: string, sender: string, body: string): boolean {
  const preview = `${subject}\n${sender}\n${body.slice(0, 4_000)}`;
  return relevantPattern.test(preview) && !irrelevantPattern.test(preview);
}

function validDate(value: string | null): Date | null {
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function confidenceReasons(extracted: ExtractedItem, source: string): string[] {
  const normalized = source.toLowerCase();
  const reasons: string[] = [];
  const knownVendors = new Set(['netflix', 'spotify', 'adobe', 'microsoft', 'google', 'apple', 'amazon', 'canva', 'icloud']);
  if (extracted.vendorName && knownVendors.has(extracted.vendorName.toLowerCase())) reasons.push('Known vendor recognised');
  else if (extracted.vendorName) reasons.push('Vendor name extracted from the email');
  if (extracted.frequency && extracted.frequency !== 'unknown') reasons.push(`${extracted.frequency[0].toUpperCase()}${extracted.frequency.slice(1)} recurring payment detected`);
  else if (/monthly|annual|yearly|weekly|per month|per year|per week/.test(normalized)) reasons.push('Recurring payment wording detected');
  if (/invoice|receipt|billing|payment|charged|paid/.test(normalized)) reasons.push('Billing keywords detected');
  if (extracted.amount !== null && extracted.currency) reasons.push('Amount extracted successfully');
  if (extracted.renewalDate || extracted.cancelByDate) reasons.push('Important date extracted');
  return reasons;
}

function validatedItem(extracted: ExtractedItem): { data: Parameters<typeof prisma.item.create>[0]['data']; reason: string | null } {
  const vendorName = extracted.vendorName?.trim() ?? '';
  if (!vendorName) return { data: {} as Parameters<typeof prisma.item.create>[0]['data'], reason: 'Missing vendor' };
  if (!extracted.type || !importableTypes.has(extracted.type)) return { data: {} as Parameters<typeof prisma.item.create>[0]['data'], reason: 'Missing service type' };
  if (!Number.isFinite(extracted.confidence) || extracted.confidence < 0.65) return { data: {} as Parameters<typeof prisma.item.create>[0]['data'], reason: 'Gemini confidence too low' };
  if (extracted.amount !== null && (!Number.isFinite(extracted.amount) || extracted.amount < 0)) return { data: {} as Parameters<typeof prisma.item.create>[0]['data'], reason: 'Invalid amount' };
  if ((extracted.renewalDate && !validDate(extracted.renewalDate)) || (extracted.cancelByDate && !validDate(extracted.cancelByDate))) return { data: {} as Parameters<typeof prisma.item.create>[0]['data'], reason: 'Invalid date' };

  return {
    data: {
      type: extracted.type,
      vendorName,
      amount: extracted.amount,
      currency: normalizeCurrency(extracted.currency),
      renewalDate: validDate(extracted.renewalDate),
      cancelByDate: validDate(extracted.cancelByDate),
      status: extracted.status,
      sourceType: 'EMAIL',
      sourceRawText: null,
      confidence: extracted.confidence,
      notes: extracted.notes?.trim() || null,
    },
    reason: null,
  };
}

export async function syncGmail(): Promise<GmailSyncSummary & Awaited<ReturnType<typeof getGmailStatus>>> {
  const connection = await prisma.gmailConnection.findUnique({ where: { id: 'default' } });
  if (!connection) throw new AppError('Connect Gmail before syncing.', 401);

  const auth = oauth();
  auth.setCredentials({ refresh_token: connection.refreshToken });
  assertGmailCredentials(auth);
  const gmail = google.gmail({ version: 'v1', auth });
  const listed = await gmail.users.messages.list({ userId: 'me', maxResults: 50, q: 'category:primary' });
  const summary: GmailSyncSummary = { scanned: 0, relevant: 0, pending: 0, imported: 0, skipped: 0, duplicates: 0, failed: 0 };

  for (const entry of listed.data.messages ?? []) {
    if (!entry.id) continue;
    const messageId = entry.id;
    summary.scanned++;

    try {
      const [importedMessage, pendingMessage] = await Promise.all([
        prisma.gmailImport.findUnique({ where: { gmailMessageId: messageId } }),
        prisma.pendingImport.findUnique({ where: { gmailMessageId: messageId } }),
      ]);
      if (importedMessage || pendingMessage) {
        summary.duplicates++;
        logSkip(messageId, 'Duplicate Gmail message');
        continue;
      }

      const message = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
      const headers = new Map((message.data.payload?.headers ?? []).map((header) => [header.name?.toLowerCase() ?? '', header.value ?? '']));
      const subject = headers.get('subject') ?? '';
      const sender = headers.get('from') ?? '';
      const body = messageBody(message.data.payload);

      if (!isLikelyRelevant(subject, sender, body)) {
        summary.skipped++;
        logSkip(messageId, 'Not subscription related');
        continue;
      }
      summary.relevant++;

      const text = `Subject: ${subject}\nFrom: ${sender}\nDate: ${headers.get('date') ?? ''}\n\n${body}`;
      let extracted: ExtractedItem;
      try {
        extracted = await extractDocument({ kind: 'text', text });
      } catch (error) {
        summary.failed++;
        const detail = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`[Gmail sync] Failed ${messageId}: Gemini API error (${detail})`);
        continue;
      }

      const candidate = validatedItem({ ...extracted, confidence: Math.max(extracted.confidence, 0.65) });
      if (candidate.reason) {
        summary.skipped++;
        logSkip(messageId, candidate.reason);
        continue;
      }

      await prisma.pendingImport.create({
        data: {
          gmailMessageId: messageId,
          sender,
          subject,
          preview: body.slice(0, 1_500),
          vendor: extracted.vendorName?.trim() ?? '',
          type: extracted.type ?? 'OTHER',
          amount: extracted.amount,
          currency: normalizeCurrency(extracted.currency),
          renewalDate: validDate(extracted.renewalDate),
          cancelByDate: validDate(extracted.cancelByDate),
          confidence: extracted.confidence,
          confidenceReasons: JSON.stringify(confidenceReasons(extracted, text)),
          notes: extracted.notes?.trim() || null,
        },
      });
      summary.pending++;
    } catch (error) {
      summary.failed++;
      logFailure(messageId, error);
    }
  }

  await prisma.gmailConnection.update({ where: { id: 'default' }, data: { lastSyncAt: new Date(), lastScanned: summary.scanned, lastRelevant: summary.relevant, lastDuplicates: summary.duplicates, lastIgnored: summary.skipped } });
  return { ...summary, ...(await getGmailStatus()) };
}

export async function disconnectGmail() {
  await prisma.gmailConnection.deleteMany();
}
