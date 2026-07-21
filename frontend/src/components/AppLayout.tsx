import { BarChart3, Bell, CircleUserRound, History, Inbox, LayoutDashboard, LogOut, Settings2, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../hooks/useAuth';
import { request } from '../services/api';

const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload', icon: UploadCloud },
  { to: '/ai-inbox', label: 'AI Inbox', icon: Inbox },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/imports', label: 'Import history', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings2 },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [gmail, setGmail] = useState<{ connected: boolean; email: string | null } | null>(null);
  const navigate = useNavigate();
  useEffect(() => { void request<{ connected: boolean; email: string | null }>('/api/gmail/status').then(setGmail).catch(() => undefined); }, []);
  async function signOut() {
    await logout();
    navigate('/login');
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink to="/" className="brand" aria-label="Tendly home"><img className="brand-mark" src={logo} alt="" /><span>Tendly</span></NavLink>
      <p className="workspace-label">Workspace</p>
      <nav className="sidebar-nav">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18} />{label}</NavLink>)}</nav>
      <div className="sidebar-account"><div className="sidebar-footer"><div className="avatar">{user?.picture ? <img src={user.picture} alt="" /> : <CircleUserRound size={18} />}</div><div><strong>{user?.name ?? 'Personal space'}</strong><span>{user?.email ?? 'Signed in'}</span></div><button className="logout-button" onClick={() => void signOut()} aria-label="Log out"><LogOut size={16} /></button></div><p className={`connection-state ${gmail?.connected ? 'connected' : ''}`}><i />{gmail?.connected ? `Gmail connected${gmail.email ? ` · ${gmail.email}` : ''}` : 'Gmail not connected'}</p><p className="version-label">Tendly · Version 1.0<br />Built for Hackathon 2026</p></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="mobile-brand"><img src={logo} alt="" />Tendly</div><button className="icon-button" aria-label="Notifications"><Bell size={19} /></button></header><main className="content"><Outlet /></main></div>
  </div>;
}
