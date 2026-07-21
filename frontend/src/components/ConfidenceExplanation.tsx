import type { ItemDraft } from '../types/item';

type ConfidenceSource = Pick<ItemDraft, 'vendorName' | 'amount' | 'currency' | 'renewalDate' | 'cancelByDate' | 'sourceRawText'> & Partial<Pick<ItemDraft, 'subscription' | 'frequency'>> & { confidence: number | null };
const knownVendors = new Set(['netflix', 'spotify', 'adobe', 'microsoft', 'google', 'apple', 'amazon', 'canva', 'icloud']);

function reasonsFor(item: ConfidenceSource): string[] {
  const source = `${item.sourceRawText ?? ''} ${item.subscription ?? ''} ${item.vendorName ?? ''}`.toLowerCase();
  const reasons: string[] = [];
  if (item.vendorName && knownVendors.has(item.vendorName.toLowerCase())) reasons.push('Known subscription vendor recognised');
  else if (item.vendorName) reasons.push('Vendor name extracted from the source');
  if (item.frequency && item.frequency !== 'unknown') reasons.push(`${item.frequency[0].toUpperCase()}${item.frequency.slice(1)} recurring wording detected`);
  else if (/monthly|annual|yearly|weekly|per month|per year|per week/.test(source)) reasons.push('Recurring billing wording detected');
  if (/invoice|receipt|billing|payment|charged|paid/.test(source)) reasons.push('Billing or invoice language detected');
  if (item.amount !== null && item.currency) reasons.push('Amount and currency extracted successfully');
  if (item.renewalDate || item.cancelByDate) reasons.push('Important date recognised');
  return reasons;
}

export function ConfidenceExplanation({ item }: { item: ConfidenceSource }) {
  if (item.confidence === null) return null;
  const reasons = reasonsFor(item);
  const confidence = Math.round(item.confidence * 100);
  return <details className="confidence-popover"><summary aria-label={`Extraction confidence ${confidence} percent. Show explanation`}>Confidence {confidence}%</summary><div><strong>Why this confidence?</strong>{reasons.length ? <ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>The source did not contain enough distinct signals for a detailed explanation.</p>}</div></details>;
}
