import type { UpcomingItem } from '../types/item';

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return '—';
  return currency ? `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function humanize(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function attentionLabel(item: UpcomingItem) {
  const days = item.attention.daysUntil;
  const dayText = days === 1 ? '1 day' : `${days} days`;
  return item.attention.deadlineType === 'cancelByDate'
    ? `Cancel ${item.vendorName} in ${dayText}`
    : `Renews in ${dayText}`;
}

export function AttentionItems({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-500">No renewals or cancellation deadlines in the next 14 days.</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => {
        const isUrgent = item.attention.daysUntil <= 7;
        return (
          <article key={item.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${isUrgent ? 'border-rose-400 ring-1 ring-rose-100' : 'border-slate-200'}`}>
            <p className={`text-sm font-semibold ${isUrgent ? 'text-rose-700' : 'text-indigo-700'}`}>{attentionLabel(item)}</p>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div><h3 className="font-semibold text-slate-950">{item.vendorName}</h3><p className="mt-1 text-sm text-slate-500">{humanize(item.type)} · {formatAmount(item.amount, item.currency)}</p></div>
              <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.attention.daysUntil === 0 ? 'Due today' : `${item.attention.daysUntil} days`}</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm"><div><dt className="text-slate-500">Renewal date</dt><dd className="mt-1 font-medium text-slate-700">{formatDate(item.renewalDate)}</dd></div><div><dt className="text-slate-500">Cancel by</dt><dd className="mt-1 font-medium text-slate-700">{formatDate(item.cancelByDate)}</dd></div></dl>
          </article>
        );
      })}
    </div>
  );
}
