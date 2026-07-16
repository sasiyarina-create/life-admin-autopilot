import type { Prisma } from '@prisma/client';
import { AppError } from './app-error.js';

const itemTypes = ['SUBSCRIPTION', 'BILL', 'WARRANTY', 'APPOINTMENT', 'OTHER'] as const;
const itemStatuses = ['ACTIVE', 'CANCELLED', 'EXPIRED', 'NEEDS_REVIEW'] as const;
const sourceTypes = ['EMAIL', 'PHOTO', 'MANUAL'] as const;

type ItemInput = Prisma.ItemCreateInput;
type MutableItemInput = Prisma.ItemUpdateInput;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') throw new AppError(`${field} must be a string.`, 400);
  return value.trim();
}

function optionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new AppError(`${field} must be a valid ISO date string.`, 400);
  }
  return new Date(value);
}

function optionalNumber(
  value: unknown,
  field: string,
  options: { min?: number; max?: number } = {},
): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError(`${field} must be a finite number.`, 400);
  }
  if (options.min !== undefined && value < options.min) {
    throw new AppError(`${field} must be at least ${options.min}.`, 400);
  }
  if (options.max !== undefined && value > options.max) {
    throw new AppError(`${field} must be at most ${options.max}.`, 400);
  }
  return value;
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  field: string,
  values: T,
): T[number] | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new AppError(`${field} must be one of: ${values.join(', ')}.`, 400);
  }
  return value as T[number];
}

function readInput(body: unknown, partial: boolean): MutableItemInput {
  if (!isRecord(body)) throw new AppError('Request body must be a JSON object.', 400);

  const data: MutableItemInput = {};
  const vendorName = optionalString(body.vendorName, 'vendorName');
  if (!partial && (!vendorName || vendorName.length === 0)) {
    throw new AppError('vendorName is required.', 400);
  }
  if (partial && body.vendorName !== undefined && (!vendorName || vendorName.length === 0)) {
    throw new AppError('vendorName cannot be empty.', 400);
  }
  if (vendorName !== undefined && vendorName !== null) data.vendorName = vendorName;

  const type = enumValue(body.type, 'type', itemTypes);
  if (!partial && !type) throw new AppError('type is required.', 400);
  if (type !== undefined) data.type = type;

  const status = enumValue(body.status, 'status', itemStatuses);
  if (status !== undefined) data.status = status;
  const sourceType = enumValue(body.sourceType, 'sourceType', sourceTypes);
  if (sourceType !== undefined) data.sourceType = sourceType;

  const amount = optionalNumber(body.amount, 'amount', { min: 0 });
  if (amount !== undefined) data.amount = amount;
  const confidence = optionalNumber(body.confidence, 'confidence', { min: 0, max: 1 });
  if (confidence !== undefined) data.confidence = confidence;

  const renewalDate = optionalDate(body.renewalDate, 'renewalDate');
  if (renewalDate !== undefined) data.renewalDate = renewalDate;
  const cancelByDate = optionalDate(body.cancelByDate, 'cancelByDate');
  if (cancelByDate !== undefined) data.cancelByDate = cancelByDate;

  for (const field of ['currency', 'sourceRawText', 'notes'] as const) {
    const value = optionalString(body[field], field);
    if (value !== undefined) data[field] = value;
  }

  if (partial && Object.keys(data).length === 0) {
    throw new AppError('Provide at least one item field to update.', 400);
  }

  return data;
}

export function validateCreateItem(body: unknown): ItemInput {
  return readInput(body, false) as ItemInput;
}

export function validateUpdateItem(body: unknown): MutableItemInput {
  return readInput(body, true);
}

export function validateItemId(id: string): string {
  if (!/^c[a-z0-9]{8,}$/i.test(id)) {
    throw new AppError('Invalid item ID.', 400);
  }
  return id;
}

export type ItemSortField = 'cancelByDate' | 'renewalDate';
export type SortOrder = 'asc' | 'desc';

export function validateSort(query: Record<string, unknown>): { field: ItemSortField; order: SortOrder } {
  const field = query.sortBy ?? 'cancelByDate';
  const order = query.sortOrder ?? 'asc';
  if (field !== 'cancelByDate' && field !== 'renewalDate') {
    throw new AppError('sortBy must be cancelByDate or renewalDate.', 400);
  }
  if (order !== 'asc' && order !== 'desc') {
    throw new AppError('sortOrder must be asc or desc.', 400);
  }
  return { field, order };
}
