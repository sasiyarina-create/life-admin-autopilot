import { Route, Routes } from 'react-router-dom';

function ScaffoldPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900">
      <section className="max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-indigo-600">Life Admin Autopilot</p>
        <h1 className="mt-2 text-2xl font-semibold">Project scaffold ready</h1>
        <p className="mt-3 text-slate-600">The dashboard and workflows will be added in subsequent milestones.</p>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<ScaffoldPage />} />
    </Routes>
  );
}
