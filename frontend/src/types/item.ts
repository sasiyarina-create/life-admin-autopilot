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

export interface ExtractedItem {
  type: ItemType | null;
  merchant: string | null;
  subscription: string | null;
  vendorName: string | null;
  amount: number | null;
  currency: string | null;
  frequency: 'monthly' | 'weekly' | 'yearly' | 'unknown' | null;
  renewalDate: string | null;
  cancelBefore: string | null;
  cancelByDate: string | null;
  status: ItemStatus;
  confidence: number;
  notes: string | null;
}

export type ItemDraft = ExtractedItem & {
  sourceType: SourceType;
  sourceRawText: string | null;
};

export interface UpcomingItem extends Item {
  attention: {
    deadlineType: 'cancelByDate' | 'renewalDate';
    deadline: string;
    daysUntil: number;
  };
}
