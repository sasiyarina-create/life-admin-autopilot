import type { ExtractedItem } from '../types/item';
import { request } from './api';

interface ExtractionResponse {
  success: boolean;
  item?: ExtractedItem;
  message?: string;
}

function getExtraction(response: ExtractionResponse): ExtractedItem {
  if (!response.success || !response.item) throw new Error(response.message ?? 'Could not extract information. Please enter manually.');
  return response.item;
}

export function extractFromImage(file: File): Promise<ExtractedItem> {
  const body = new FormData();
  body.append('file', file);
  return request<ExtractionResponse>('/api/extract', { method: 'POST', body }).then(getExtraction);
}

export function extractFromText(text: string): Promise<ExtractedItem> {
  return request<ExtractionResponse>('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).then(getExtraction);
}
