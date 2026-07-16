import type { Prisma } from '@prisma/client';
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
