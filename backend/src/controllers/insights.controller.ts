import type { Request, Response } from 'express';
import { prisma } from '../prisma/client.js';
import { getUpcomingDeadlines } from '../services/item.service.js';
import { normalizeCurrency } from '../utils/currency.js';

export async function getInsights(_request: Request, response: Response): Promise<void> {
  const [items, upcoming, recentImports] = await Promise.all([
    prisma.item.findMany(), getUpcomingDeadlines(), prisma.gmailImport.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  const active = items.filter((item) => item.status === 'ACTIVE');
  const subscriptions = active.filter((item) => item.type === 'SUBSCRIPTION');
  const bills = active.filter((item) => item.type === 'BILL');
  const recurring = [...subscriptions, ...bills].filter((item) => item.amount !== null);
  const currencies = [...new Set(recurring.map((item) => normalizeCurrency(item.currency)).filter((currency): currency is string => Boolean(currency)))];
  const recurringCurrency = currencies.length === 1 ? currencies[0] : null;
  const monthly = recurring.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const potentialSavings = items.filter((item) => item.type === 'SUBSCRIPTION' && item.status === 'NEEDS_REVIEW' && item.amount !== null).reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const latestGmailSync = await prisma.gmailConnection.findUnique({ where: { id: 'default' }, select: { lastSyncAt: true } });
  const activities = [
    ...items.flatMap((item) => [
      { id: `created-${item.id}`, at: item.createdAt, kind: item.sourceType === 'EMAIL' ? 'imported' : 'uploaded', description: item.sourceType === 'EMAIL' ? `${item.vendorName} was imported from Gmail` : `${item.vendorName} was added to Tendly` },
      ...(item.updatedAt.getTime() - item.createdAt.getTime() > 1_000 ? [{ id: `updated-${item.id}`, at: item.updatedAt, kind: 'updated', description: `${item.vendorName} was updated` }] : []),
    ]),
    ...(latestGmailSync?.lastSyncAt ? [{ id: `gmail-sync-${latestGmailSync.lastSyncAt.toISOString()}`, at: latestGmailSync.lastSyncAt, kind: 'synced', description: 'Gmail inbox was synced' }] : []),
  ].sort((left, right) => right.at.getTime() - left.at.getTime()).slice(0, 8);
  response.json({ subscriptions: subscriptions.length, recurringBills: bills.length, warranties: active.filter((item) => item.type === 'WARRANTY').length, monthlySpending: monthly, yearlySpending: monthly * 12, potentialSavings, recurringCurrency, upcomingRenewals: upcoming.filter((item) => item.attention.deadlineType === 'renewalDate').length, upcomingCancellations: upcoming.filter((item) => item.attention.deadlineType === 'cancelByDate').length, recentImports, activities });
}
