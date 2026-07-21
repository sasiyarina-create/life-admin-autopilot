import { CalendarClock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UpcomingItem } from '../types/item';
import { formatCurrency } from '../utils/currency';

const date = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(value)) : '—';
export function AttentionItems({ items }: { items: UpcomingItem[] }) {
  if (!items.length) return <div className="empty-state compact"><CalendarClock size={22} /><strong>Nothing needs your attention</strong><span>You have no renewal or cancellation deadlines in the next 14 days.</span></div>;
  return <div className="attention-grid">{items.map((item) => { const urgent = item.attention.daysUntil <= 7; const cancellation = item.attention.deadlineType === 'cancelByDate'; return <Link key={item.id} to={`/items/${item.id}`} className={`attention-card ${urgent ? 'urgent' : ''}`}><div className="attention-card-top"><span className="attention-kind">{cancellation ? 'Cancellation window' : 'Upcoming renewal'}</span><span className="days-chip">{item.attention.daysUntil === 0 ? 'Today' : `${item.attention.daysUntil}d`}</span></div><strong>{cancellation ? `Cancel ${item.vendorName}` : `${item.vendorName} renews`}</strong><p>{cancellation ? `Cancel by ${date(item.cancelByDate)}` : `Renews ${date(item.renewalDate)}`}</p><span className="attention-meta">{item.amount === null ? 'Amount unknown' : formatCurrency(item.amount, item.currency)} <ChevronRight size={15} /></span></Link>; })}</div>;
}
