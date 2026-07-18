import type { Item, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type { ItemSortField, SortOrder } from '../utils/item-validation.js';

export function listItems(sortField: ItemSortField, sortOrder: SortOrder) {
  const orderBy: Prisma.ItemOrderByWithRelationInput = { [sortField]: sortOrder };
  return prisma.item.findMany({ orderBy });
}

export function createItem(data: Prisma.ItemCreateInput) {
  return prisma.item.create({ data });
}

export function updateItem(id: string, data: Prisma.ItemUpdateInput) {
  return prisma.item.update({ where: { id }, data });
}

export function deleteItem(id: string) {
  return prisma.item.delete({ where: { id } });
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type DeadlineType = 'cancelByDate' | 'renewalDate';

export type UpcomingDeadline = Item & {
  attention: {
    deadlineType: DeadlineType;
    deadline: Date;
    daysUntil: number;
  };
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysUntil(deadline: Date, from: Date): number {
  return Math.round((startOfUtcDay(deadline).getTime() - startOfUtcDay(from).getTime()) / DAY_IN_MS);
}

function getNearestAttention(item: Item, from: Date): UpcomingDeadline['attention'] | null {
  const candidates = [
    ...(item.cancelByDate ? [{ deadlineType: 'cancelByDate' as const, deadline: item.cancelByDate }] : []),
    ...(item.renewalDate ? [{ deadlineType: 'renewalDate' as const, deadline: item.renewalDate }] : []),
  ]
    .map((candidate) => ({ ...candidate, daysUntil: daysUntil(candidate.deadline, from) }))
    .filter((candidate) => candidate.daysUntil >= 0 && candidate.daysUntil <= 14)
    .sort((left, right) => left.daysUntil - right.daysUntil);

  const nearest = candidates[0];
  return nearest
    ? { deadlineType: nearest.deadlineType, deadline: nearest.deadline, daysUntil: nearest.daysUntil }
    : null;
}

/** Returns only items whose nearest renewal or cancellation deadline is in the next 14 calendar days. */
export async function getUpcomingDeadlines(now = new Date()): Promise<UpcomingDeadline[]> {
  const from = startOfUtcDay(now);
  const through = new Date(from.getTime() + 14 * DAY_IN_MS);
  const items = await prisma.item.findMany({
    where: {
      OR: [
        { cancelByDate: { gte: from, lte: through } },
        { renewalDate: { gte: from, lte: through } },
      ],
    },
  });

  return items
    .map((item) => {
      const attention = getNearestAttention(item, now);
      return attention ? { ...item, attention } : null;
    })
    .filter((item): item is UpcomingDeadline => item !== null)
    .sort((left, right) => left.attention.daysUntil - right.attention.daysUntil);
}
