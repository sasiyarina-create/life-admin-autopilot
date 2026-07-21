import { request } from './api';
import { normalizeCurrency } from '../utils/currency';
import type { Item, ItemType } from '../types/item';

export type PendingImport = {
  id: string; gmailMessageId: string; sender: string | null; subject: string | null; preview: string;
  vendor: string; type: ItemType; amount: number | null; currency: string | null; renewalDate: string | null;
  cancelByDate: string | null; confidence: number; confidenceReasons: string; notes: string | null; createdAt: string;
};
export type PendingSummary = { pending: number; alreadyImported: number; ignored: number; averageConfidence: number };
export type GmailSyncStats = { lastScanned: number; lastRelevant: number; lastDuplicates: number; lastIgnored: number };

export function getPendingImports() { return request<{ items: PendingImport[]; summary: PendingSummary }>('/api/pending-imports'); }
export function updatePendingImport(id: string, data: Partial<Pick<PendingImport, 'vendor' | 'type' | 'amount' | 'currency' | 'renewalDate' | 'cancelByDate' | 'notes'>>) { return request<{ item: PendingImport }>(`/api/pending-imports/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data.currency === undefined ? data : { ...data, currency: normalizeCurrency(data.currency) }) }); }
export function importPendingImport(id: string) { return request<{ item: Item }>(`/api/pending-imports/${id}/import`, { method: 'POST' }); }
export function ignorePendingImport(id: string) { return request<void>(`/api/pending-imports/${id}/ignore`, { method: 'POST' }); }
export function bulkPendingImports(ids: string[] | undefined, action: 'import' | 'ignore') { return request<{ completed: number; failed: number }>('/api/pending-imports/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, action }) }); }
