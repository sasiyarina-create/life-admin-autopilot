import type { PendingImport, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/app-error.js';
import { normalizeCurrency } from '../utils/currency.js';

const types = new Set(['SUBSCRIPTION', 'BILL', 'WARRANTY', 'APPOINTMENT']);

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError('Dates must use YYYY-MM-DD.', 400);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new AppError('Invalid date.', 400);
  return date;
}

function itemData(pending: PendingImport): Prisma.ItemCreateInput {
  if (!pending.vendor.trim()) throw new AppError('Vendor is required.', 400);
  if (!types.has(pending.type)) throw new AppError('Choose a valid subscription type.', 400);
  if (pending.amount !== null && (!Number.isFinite(pending.amount) || pending.amount < 0)) throw new AppError('Amount must be a positive number.', 400);
  return {
    vendorName: pending.vendor.trim(), type: pending.type, amount: pending.amount,
    currency: normalizeCurrency(pending.currency), renewalDate: pending.renewalDate,
    cancelByDate: pending.cancelByDate, status: pending.confidence >= 0.8 ? 'ACTIVE' : 'NEEDS_REVIEW',
    sourceType: 'EMAIL', sourceRawText: pending.preview, confidence: pending.confidence,
    notes: pending.notes?.trim() || null,
  };
}

export async function listPendingImports() {
  const [items, imported, ignored] = await Promise.all([
    prisma.pendingImport.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
    prisma.gmailImport.count({ where: { itemId: { not: null } } }),
    prisma.gmailImport.count({ where: { itemId: null } }),
  ]);
  const averageConfidence = items.length ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length : 0;
  return { items, summary: { pending: items.length, alreadyImported: imported, ignored, averageConfidence } };
}

export async function updatePendingImport(id: string, input: { vendor?: string; type?: string; amount?: number | null; currency?: string | null; renewalDate?: string | null; cancelByDate?: string | null; notes?: string | null }) {
  if (input.vendor !== undefined && !input.vendor.trim()) throw new AppError('Vendor is required.', 400);
  if (input.type !== undefined && !types.has(input.type)) throw new AppError('Choose a valid subscription type.', 400);
  if (input.amount !== undefined && input.amount !== null && (!Number.isFinite(input.amount) || input.amount < 0)) throw new AppError('Amount must be a positive number.', 400);
  const data: Prisma.PendingImportUpdateInput = {};
  if (input.vendor !== undefined) data.vendor = input.vendor.trim();
  if (input.type !== undefined) data.type = input.type;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.currency !== undefined) data.currency = normalizeCurrency(input.currency);
  if (input.renewalDate !== undefined) data.renewalDate = validDate(input.renewalDate);
  if (input.cancelByDate !== undefined) data.cancelByDate = validDate(input.cancelByDate);
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  return prisma.pendingImport.update({ where: { id }, data });
}

export async function importPendingImport(id: string) {
  return prisma.$transaction(async (transaction) => {
    const pending = await transaction.pendingImport.findUnique({ where: { id } });
    if (!pending) throw new AppError('Review item not found.', 404);
    const existing = await transaction.gmailImport.findUnique({ where: { gmailMessageId: pending.gmailMessageId } });
    if (existing) throw new AppError('This Gmail message has already been processed.', 409);
    const item = await transaction.item.create({ data: itemData(pending) });
    await transaction.gmailImport.create({ data: { gmailMessageId: pending.gmailMessageId, sender: pending.sender, subject: pending.subject, itemId: item.id } });
    await transaction.pendingImport.delete({ where: { id } });
    await transaction.gmailConnection.update({ where: { id: 'default' }, data: { importedCount: { increment: 1 } } }).catch(() => undefined);
    return item;
  });
}

export async function ignorePendingImport(id: string): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const pending = await transaction.pendingImport.findUnique({ where: { id } });
    if (!pending) throw new AppError('Review item not found.', 404);
    await transaction.gmailImport.create({ data: { gmailMessageId: pending.gmailMessageId, sender: pending.sender, subject: pending.subject } });
    await transaction.pendingImport.delete({ where: { id } });
  });
}

export async function bulkPendingImports(ids: string[] | undefined, action: 'import' | 'ignore') {
  const pending = await prisma.pendingImport.findMany({ where: { status: 'PENDING', ...(ids?.length ? { id: { in: ids } } : {}) }, select: { id: true } });
  let completed = 0;
  let failed = 0;
  for (const item of pending) {
    try {
      if (action === 'import') await importPendingImport(item.id);
      else await ignorePendingImport(item.id);
      completed++;
    } catch {
      failed++;
    }
  }
  return { completed, failed };
}
