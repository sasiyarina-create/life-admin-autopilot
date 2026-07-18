import { Link } from 'react-router-dom';
import type { Item, ItemStatus } from '../types/item';

const statusStyles: Record<ItemStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CANCELLED: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  EXPIRED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  NEEDS_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return '—';
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
    } catch {
      // Fall through to a plain numeric value when legacy data contains an invalid currency code.
    }
  }
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function humanize(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ItemTable({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="font-medium text-slate-900">No life admin items yet</p>
        <p className="mt-1 text-sm text-slate-500">Your saved subscriptions, bills, warranties, and appointments will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[840px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Vendor</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Renewal date</th>
              <th className="px-5 py-4">Cancel by date</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="transition hover:bg-slate-50">
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{humanize(item.type)}</td>
                <td className="px-5 py-4 font-medium text-slate-900">
                  <Link to={`/items/${item.id}`} className="hover:text-indigo-700 hover:underline">
                    {item.vendorName}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatAmount(item.amount, item.currency)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(item.renewalDate)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(item.cancelByDate)}</td>
                <td className="whitespace-nowrap px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[item.status]}`}>
                    {humanize(item.status)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <Link to={`/email/${item.id}`} className="rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">Generate Email</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
