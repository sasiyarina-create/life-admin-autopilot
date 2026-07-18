import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AttentionItems } from '../components/AttentionItems';
import { ItemTable } from '../components/ItemTable';
import { SummaryCard } from '../components/SummaryCard';
import { useItems } from '../hooks/useItems';
import { useUpcomingItems } from '../hooks/useUpcomingItems';
import type { ItemStatus, ItemType } from '../types/item';
import type { ItemSort } from '../services/item-service';

function normalizeCurrency(currency: string) {
  const currencyMap: Record<string, string> = {
    RM: 'MYR',
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
  };

  return currencyMap[currency] || currency;
}

function getRecurringSummary(items: ReturnType<typeof useItems>['items']) {
  const subscriptions = items.filter(
    (item) => item.type === 'SUBSCRIPTION' && item.status === 'ACTIVE' && item.amount !== null,
  );

  const currencies = [
    ...new Set(
      subscriptions
        .map((item) => item.currency)
        .filter((currency): currency is string => Boolean(currency)),
    ),
  ];

  if (subscriptions.length === 0) {
    return { value: '—', detail: 'No active subscriptions with an amount' };
  }

  if (currencies.length !== 1 || subscriptions.some((item) => !item.currency)) {
    return { value: 'Mixed', detail: 'Active subscriptions use more than one currency' };
  }

  const amount = subscriptions.reduce(
    (total, item) => total + (item.amount ?? 0),
    0,
  );

  return {
    value: new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: normalizeCurrency(currencies[0]),
      maximumFractionDigits: 2,
    }).format(amount),
    detail: 'Active subscriptions only',
  };
}

export function DashboardPage() {
  const [typeFilter, setTypeFilter] = useState<ItemType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<ItemSort>('cancelByDate');
  const { items, isLoading, error, reload } = useItems(sortBy);
  const upcoming = useUpcomingItems();
  const recurringSummary = getRecurringSummary(items);
  const reviewCount = items.filter((item) => item.status === 'NEEDS_REVIEW').length;
  const visibleItems = items.filter(
    (item) => (typeFilter === 'ALL' || item.type === typeFilter) && (statusFilter === 'ALL' || item.status === statusFilter),
  );
  const nearest = upcoming.items[0];
  const deadlineDetail = upcoming.isLoading
    ? 'Loading deadline details…'
    : nearest
      ? `${nearest.attention.daysUntil === 0 ? 'Due today' : `${nearest.attention.daysUntil} days until nearest deadline`}`
      : 'No deadlines in the next 14 days';

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Life admin, in one place.
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Track the details behind your recurring commitments and important records.
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
        >
          Add document
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Monthly recurring spending"
          value={recurringSummary.value}
          detail={recurringSummary.detail}
        />

        <SummaryCard
          label="Items needing review"
          value={String(reviewCount)}
          detail="Records marked for follow-up"
          tone="amber"
        />

        <SummaryCard
          label="Upcoming deadlines"
          value={upcoming.isLoading ? '—' : String(upcoming.items.length)}
          detail={deadlineDetail}
          tone={nearest?.attention.daysUntil !== undefined && nearest.attention.daysUntil <= 7 ? 'amber' : 'slate'}
        />
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Needs Attention This Week</h2>
            <p className="mt-1 text-sm text-slate-500">Renewal and cancellation deadlines within the next 14 days.</p>
          </div>
          {!upcoming.isLoading && <span className="text-sm text-slate-500">{upcoming.items.length} upcoming</span>}
        </div>
        {upcoming.isLoading && <div className="h-44 animate-pulse rounded-2xl bg-slate-200" role="status"><span className="sr-only">Loading upcoming deadlines</span></div>}
        {upcoming.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700" role="alert">Could not load upcoming deadlines. <button type="button" onClick={upcoming.reload} className="font-semibold underline">Try again</button></div>}
        {!upcoming.isLoading && !upcoming.error && <AttentionItems items={upcoming.items} />}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Your items
            </h2>
            <p className="mt-1 text-sm text-slate-500">Filter and sort your saved records.</p>
          </div>

          {!isLoading && !error && (
            <span className="text-sm text-slate-500">
              {visibleItems.length} of {items.length} total
            </span>
          )}
        </div>

        <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">Type<select className="mt-1.5" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ItemType | 'ALL')}><option value="ALL">All types</option><option value="SUBSCRIPTION">Subscription</option><option value="BILL">Bill</option><option value="WARRANTY">Warranty</option><option value="APPOINTMENT">Appointment</option><option value="OTHER">Other</option></select></label>
          <label className="text-sm font-medium text-slate-700">Status<select className="mt-1.5" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ItemStatus | 'ALL')}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="NEEDS_REVIEW">Needs review</option><option value="CANCELLED">Cancelled</option><option value="EXPIRED">Expired</option></select></label>
          <label className="text-sm font-medium text-slate-700">Sort by<select className="mt-1.5" value={sortBy} onChange={(event) => setSortBy(event.target.value as ItemSort)}><option value="renewalDate">Renewal date</option><option value="cancelByDate">Cancel date</option><option value="vendorName">Vendor name</option></select></label>
        </div>

        {isLoading && (
          <div
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            role="status"
          >
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 space-y-3">
              <div className="h-12 animate-pulse rounded bg-slate-100" />
              <div className="h-12 animate-pulse rounded bg-slate-100" />
              <div className="h-12 animate-pulse rounded bg-slate-100" />
            </div>
            <span className="sr-only">Loading items</span>
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900"
            role="alert"
          >
            <p className="font-semibold">Could not load your items</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>

            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-inset ring-rose-200 transition hover:bg-rose-100"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && <ItemTable items={visibleItems} />}
      </section>
    </div>
  );
}
