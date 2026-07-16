import { Link } from 'react-router-dom';
import { ItemTable } from '../components/ItemTable';
import { SummaryCard } from '../components/SummaryCard';
import { useItems } from '../hooks/useItems';

function getRecurringSummary(items: ReturnType<typeof useItems>['items']) {
  const subscriptions = items.filter(
    (item) => item.type === 'SUBSCRIPTION' && item.status === 'ACTIVE' && item.amount !== null,
  );
  const currencies = [...new Set(subscriptions.map((item) => item.currency).filter((currency): currency is string => Boolean(currency)))];

  if (subscriptions.length === 0) return { value: '—', detail: 'No active subscriptions with an amount' };
  if (currencies.length !== 1 || subscriptions.some((item) => !item.currency)) {
    return { value: 'Mixed', detail: 'Active subscriptions use more than one currency' };
  }

  const amount = subscriptions.reduce((total, item) => total + (item.amount ?? 0), 0);
  return {
    value: new Intl.NumberFormat(undefined, { style: 'currency', currency: currencies[0], maximumFractionDigits: 2 }).format(amount),
    detail: 'Active subscriptions only',
  };
}

export function DashboardPage() {
  const { items, isLoading, error, reload } = useItems();
  const recurringSummary = getRecurringSummary(items);
  const reviewCount = items.filter((item) => item.status === 'NEEDS_REVIEW').length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Life admin, in one place.</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Track the details behind your recurring commitments and important records.</p>
        </div>
        <Link to="/upload" className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">
          Add document
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Monthly recurring spending" value={recurringSummary.value} detail={recurringSummary.detail} />
        <SummaryCard label="Items needing review" value={String(reviewCount)} detail="Records marked for follow-up" tone="amber" />
        <SummaryCard label="Upcoming deadlines" value="—" detail="Deadline calculation arrives in a later milestone" tone="slate" />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Your items</h2>
            <p className="mt-1 text-sm text-slate-500">Sorted by cancel-by date.</p>
          </div>
          {!isLoading && !error && <span className="text-sm text-slate-500">{items.length} total</span>}
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" role="status">
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
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900" role="alert">
            <p className="font-semibold">Could not load your items</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
            <button type="button" onClick={reload} className="mt-4 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-inset ring-rose-200 transition hover:bg-rose-100">
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && <ItemTable items={items} />}
      </section>
    </div>
  );
}
