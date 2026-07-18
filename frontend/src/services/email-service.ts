import { request } from './api';

export function generateEmailDraft(id: string): Promise<string> {
  return request<{ email: string }>(`/api/items/${id}/draft-email`, { method: 'POST' }).then((response) => response.email);
}
