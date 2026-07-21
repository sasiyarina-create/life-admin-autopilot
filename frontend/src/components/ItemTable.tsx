import { ArrowUpRight, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Item, ItemStatus } from '../types/item';
import { formatCurrency } from '../utils/currency';

const statuses: Record<ItemStatus, string> = { ACTIVE: 'success', CANCELLED: 'neutral', EXPIRED: 'danger', NEEDS_REVIEW: 'warning' };
const readable = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const amount = (item: Item) => formatCurrency(item.amount, item.currency);

export function ItemTable({ items }: { items: Item[] }) {
  if (!items.length) return <div className="empty-state"><strong>No records match these filters</strong><span>Try changing your filters or add a new document.</span></div>;
  return <div className="table-wrap"><table><thead><tr><th>Record</th><th>Amount</th><th>Renewal</th><th>Cancel by</th><th>Status</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><Link className="record-link" to={`/items/${item.id}`}><strong>{item.vendorName}</strong><span>{readable(item.type)} <ArrowUpRight size={13} /></span></Link></td><td>{amount(item)}</td><td>{date(item.renewalDate)}</td><td>{date(item.cancelByDate)}</td><td><span className={`status ${statuses[item.status]}`}>{readable(item.status)}</span></td><td><Link className="table-action" to={`/email/${item.id}`}><Mail size={15} />Email</Link></td></tr>)}</tbody></table></div>;
}
