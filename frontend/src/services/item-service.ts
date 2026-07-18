import type { Item, ItemDraft, UpcomingItem } from '../types/item';
import { request } from './api';

interface ItemsResponse {
  items: Item[];
}

export type ItemSort = 'cancelByDate' | 'renewalDate' | 'vendorName';

export function getItems(sortBy: ItemSort = 'cancelByDate'): Promise<Item[]> {
  return request<ItemsResponse>(`/api/items?sortBy=${sortBy}&sortOrder=asc`).then((response) => response.items);
}

export function getUpcomingItems(): Promise<UpcomingItem[]> {
  return request<{ items: UpcomingItem[] }>('/api/items/upcoming').then((response) => response.items);
}

export function createItem(draft: ItemDraft): Promise<Item> {
  const { sourceType, sourceRawText, merchant: _merchant, subscription: _subscription, frequency: _frequency, cancelBefore: _cancelBefore, ...extracted } = draft;
  const subscriptionNote = draft.subscription
    ? `${draft.subscription} subscription${draft.frequency && draft.frequency !== 'unknown' ? ` billed ${draft.frequency}` : ''}.`
    : null;
  return request<{ item: Item }>('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...extracted,
      type: extracted.type ?? 'OTHER',
      vendorName: extracted.vendorName ?? '',
      sourceType,
      sourceRawText,
      notes: extracted.notes?.trim() || subscriptionNote,
    }),
  }).then((response) => response.item);
}
