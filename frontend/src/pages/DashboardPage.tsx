import { useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, FileUp, ListFilter, MailCheck, PencilLine, Plus, ReceiptText, Search, Settings2, Sparkles, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AttentionItems } from '../components/AttentionItems';
import { ItemTable } from '../components/ItemTable';
import { SummaryCard } from '../components/SummaryCard';
import { useAuth } from '../hooks/useAuth';
import { useItems } from '../hooks/useItems';
import { useUpcomingItems } from '../hooks/useUpcomingItems';
import { request } from '../services/api';
import { useToast } from '../components/ToastProvider';
import type { ItemSort } from '../services/item-service';
import type { ItemStatus, ItemType } from '../types/item';
import { formatCurrency, normalizeCurrency } from '../utils/currency';

const types: Array<ItemType | 'ALL'> = ['ALL', 'SUBSCRIPTION', 'BILL', 'WARRANTY', 'APPOINTMENT', 'OTHER'];
const statuses: Array<ItemStatus | 'ALL'> = ['ALL', 'ACTIVE', 'NEEDS_REVIEW', 'CANCELLED', 'EXPIRED'];
const readable = (value: string) => value === 'ALL' ? 'All' : value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

type GmailStatus = { connected: boolean; email: string | null; lastSync: string | null; emailsImported: number };
type GmailSyncResult = GmailStatus & { scanned: number; relevant: number; pending: number; imported: number; skipped: number; duplicates: number; failed: number };
type Activity = { id: string; at: string; kind: 'imported' | 'uploaded' | 'updated' | 'synced'; description: string };
type Insights = { subscriptions: number; recurringBills: number; warranties: number; monthlySpending: number; yearlySpending: number; potentialSavings: number; recurringCurrency: string | null; activities: Activity[] };

function recurring(items: ReturnType<typeof useItems>['items']) {
  const active = items.filter((item) => item.type === 'SUBSCRIPTION' && item.status === 'ACTIVE' && item.amount !== null);
  const currency = normalizeCurrency(active[0]?.currency);
  if (!active.length) return '—';
  if (!currency || active.some((item) => normalizeCurrency(item.currency) !== currency)) return 'Mixed';
  return formatCurrency(active.reduce((total, item) => total + (item.amount ?? 0), 0), currency);
}

function money(value: number, currency: string | null): string {
  if (value === 0) return '—';
  if (!currency) return 'Mixed currencies';
  return formatCurrency(value, currency);
}

const activityIcon = { imported: MailCheck, uploaded: ReceiptText, updated: PencilLine, synced: CheckCircle2 };
const timeAgo = (value: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success } = useToast();
  const [type, setType] = useState<ItemType | 'ALL'>('ALL');
  const [status, setStatus] = useState<ItemStatus | 'ALL'>('ALL');
  const [sort, setSort] = useState<ItemSort>('cancelByDate');
  const [query, setQuery] = useState('');
  const records = useItems(sort);
  const upcoming = useUpcomingItems();
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  async function refreshOverview() {
    const [gmailStatus, overview] = await Promise.all([
      request<GmailStatus>('/api/gmail/status'),
      request<Insights>('/api/insights'),
    ]);
    setGmail(gmailStatus);
    setInsights(overview);
  }

  useEffect(() => { void refreshOverview().catch(() => undefined); }, []);

  async function sync() {
    setSyncing(true);
    setSyncError('');
    try {
      const result = await request<GmailSyncResult>('/api/gmail/sync', { method: 'POST' });
      await refreshOverview();
      records.reload();
      upcoming.reload();
      success(`Gmail synced · ${result.scanned} scanned · ${result.pending} ready for review.`);
      navigate('/ai-inbox');
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Unable to sync Gmail.');
    } finally {
      setSyncing(false);
    }
  }

  const visible = records.items.filter((item) => (type === 'ALL' || item.type === type) && (status === 'ALL' || item.status === status) && item.vendorName.toLowerCase().includes(query.toLowerCase()));
  const nearest = upcoming.items[0];
  const firstName = user?.name.split(' ')[0] ?? 'there';

  return <div className="page-stack">
    <section className="page-hero dashboard-hero">
      <div><span className="eyebrow">Today’s overview</span><h1>Good morning,<br />{firstName}.</h1><p>Here’s what’s happening today. {upcoming.items.length} deadlines are approaching, with {money(insights?.potentialSavings ?? 0, insights?.recurringCurrency ?? null)} in potential monthly savings.</p></div>
      <Link to="/upload" className="button primary"><Plus size={18} />Add record</Link>
    </section>
    <section className="quick-actions" aria-labelledby="quick-actions-title"><div><span className="eyebrow" id="quick-actions-title">Quick actions</span></div><div><Link to="/upload"><FileUp size={16} />Import document</Link><button onClick={() => void sync()} disabled={!gmail?.connected || syncing}><MailCheck size={16} />Sync Gmail</button><a href="#records"><Sparkles size={16} />Generate draft</a><Link to="/settings"><Settings2 size={16} />Settings</Link></div></section>
    <section className="dashboard-intro">
      <article className="today-panel"><span className="eyebrow">Today</span><h2>{nearest ? (nearest.attention.deadlineType === 'cancelByDate' ? `${nearest.vendorName} cancellation deadline ${nearest.attention.daysUntil <= 1 ? 'tomorrow' : `in ${nearest.attention.daysUntil} days`}.` : `${nearest.vendorName} renews in ${nearest.attention.daysUntil} days.`) : 'You’re all caught up.'}</h2><p>{nearest ? 'Tendly keeps the next important action in view, so nothing slips through the cracks.' : 'Nothing requires your attention today.'}</p><strong>{money(insights?.potentialSavings ?? 0, insights?.recurringCurrency ?? null)} <span>potential monthly savings</span></strong></article>
      <article className="gmail-card"><p><MailCheck size={17} />Gmail</p><strong>{gmail?.connected ? 'Connected' : 'Not connected'}</strong><span>{gmail?.email ?? 'Connect your inbox for read-only imports'}</span>{gmail?.connected ? <button className="button secondary" onClick={() => void sync()} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync now'}</button> : <Link className="button secondary" to="/settings">Connect Gmail</Link>}{syncError && <small className="inline-error">{syncError}</small>}</article>
    </section>
    <section className="insights-panel"><div><span className="eyebrow">Smart insights</span><h2>{insights?.subscriptions ?? '—'} subscriptions, thoughtfully organised.</h2><p>{insights ? `${money(insights.monthlySpending, insights.recurringCurrency)}/month recurring · ${insights.warranties} warranties tracked · ${upcoming.items.length} deadlines approaching.` : 'Calculating your overview…'}</p></div><Link to="/analytics" className="text-link">View analytics</Link></section>
    <section className="metrics"><SummaryCard icon={<Sparkles size={20} />} label="Subscriptions" value={String(insights?.subscriptions ?? 0)} numericValue={insights?.subscriptions ?? null} detail="Currently active" /><SummaryCard icon={<Wallet size={20} />} label="Monthly spending" value={recurring(records.items)} numericValue={insights?.monthlySpending ?? null} formatValue={(value) => money(value, insights?.recurringCurrency ?? null)} detail="Subscriptions and bills" /><SummaryCard icon={<AlertCircle size={20} />} label="Potential savings" value="—" numericValue={insights?.potentialSavings ?? null} formatValue={(value) => money(value, insights?.recurringCurrency ?? null)} detail="Records needing review" /><SummaryCard icon={<CalendarClock size={20} />} label="Upcoming deadlines" value={upcoming.isLoading ? '—' : String(upcoming.items.length)} numericValue={upcoming.isLoading ? null : upcoming.items.length} detail={nearest ? `${nearest.attention.daysUntil} days until next` : 'Nothing in the next 14 days'} /></section>
    <section><div className="section-heading"><div><span className="eyebrow">Priority queue</span><h2>Needs attention</h2></div><span className="section-note">Next 14 days</span></div>{upcoming.isLoading ? <div className="skeleton-cards"><i /><i /></div> : upcoming.error ? <div className="inline-error">Could not load deadlines. <button onClick={upcoming.reload}>Try again</button></div> : <AttentionItems items={upcoming.items} />}</section>
    <section className="activity-section"><div className="section-heading"><div><span className="eyebrow">Your workspace</span><h2>Recent activity</h2></div></div>{insights?.activities.length ? <ol className="activity-timeline">{insights.activities.map((activity) => { const Icon = activityIcon[activity.kind]; return <li key={activity.id}><span className="activity-icon"><Icon size={15} aria-hidden="true" /></span><div><strong>{activity.description}</strong><time dateTime={activity.at}>{timeAgo(activity.at)}</time></div></li>; })}</ol> : <div className="empty-state compact"><CheckCircle2 size={22} /><strong>No recent activity yet</strong><span>Import Gmail or add your first record to get started.</span></div>}</section>
    <section className="records-section" id="records"><div className="section-heading"><div><span className="eyebrow">All records</span><h2>Your life admin</h2></div><span className="section-note">{visible.length} records</span></div><div className="toolbar"><label className="search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vendor" /></label><div className="filters"><label><ListFilter size={16} /><select value={type} onChange={(event) => setType(event.target.value as ItemType | 'ALL')}>{types.map((value) => <option key={value}>{readable(value)}</option>)}</select></label><label><select value={status} onChange={(event) => setStatus(event.target.value as ItemStatus | 'ALL')}>{statuses.map((value) => <option key={value}>{readable(value)}</option>)}</select></label><label><select value={sort} onChange={(event) => setSort(event.target.value as ItemSort)}><option value="cancelByDate">Cancel date</option><option value="renewalDate">Renewal date</option><option value="vendorName">Vendor name</option></select></label></div></div>{records.isLoading ? <div className="table-skeleton" /> : records.error ? <div className="inline-error">Could not load records. <button onClick={records.reload}>Try again</button></div> : <ItemTable items={visible} />}</section>
  </div>;
}
