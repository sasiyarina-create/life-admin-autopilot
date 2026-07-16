import type { Item } from '../types/item';
import { request } from './api';

interface ItemsResponse {
  items: Item[];
}

export function getItems(): Promise<Item[]> {
  return request<ItemsResponse>('/api/items?sortBy=cancelByDate&sortOrder=asc').then((response) => response.items);
}
