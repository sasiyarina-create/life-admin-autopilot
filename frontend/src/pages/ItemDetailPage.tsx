import { Link, useParams } from 'react-router-dom';

export function ItemDetailPage() {
  const { id } = useParams();

  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
      <p className="text-sm font-semibold text-indigo-600">Coming next</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Item details</h1>
      <p className="mx-auto mt-3 max-w-lg text-slate-600">The detail workflow for item {id ? <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">{id}</code> : 'records'} will be added in a later milestone.</p>
      <Link to="/" className="mt-6 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-600">
        Back to dashboard
      </Link>
    </section>
  );
}
