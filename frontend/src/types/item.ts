export type ItemType = 'SUBSCRIPTION' | 'BILL' | 'WARRANTY' | 'APPOINTMENT' | 'OTHER';
export type ItemStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'NEEDS_REVIEW';
export type SourceType = 'EMAIL' | 'PHOTO' | 'MANUAL';

export interface Item {
  id: string;
  type: ItemType;
  vendorName: string;
  amount: number | null;
  currency: string | null;
  renewalDate: string | null;
  cancelByDate: string | null;
  status: ItemStatus;
  sourceType: SourceType;
  sourceRawText: string | null;
  confidence: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
