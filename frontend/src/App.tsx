import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { EmailDraftPage } from './pages/EmailDraftPage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { UploadPage } from './pages/UploadPage';
import { SettingsPage } from './pages/SettingsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ImportHistoryPage } from './pages/ImportHistoryPage';
import { LoginPage } from './pages/LoginPage';
import { WelcomePage } from './pages/WelcomePage';
import { AIInboxPage } from './pages/AIInboxPage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ToastProvider';

function SessionLoading() {
  return <div className="app-loading" role="status">Loading Tendly…</div>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, user } = useAuth();
  if (isLoading) return <SessionLoading />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { isLoading, user } = useAuth();
  if (isLoading) return <SessionLoading />;
  return user ? <Navigate to="/" replace /> : <LoginPage />;
}

function OnboardingRoute() {
  const { isLoading, onboardingCompleted, user } = useAuth();
  if (isLoading) return <SessionLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return onboardingCompleted ? <Navigate to="/" replace /> : <WelcomePage />;
}

export default function App() {
  return (
    <AuthProvider>
    <ToastProvider>
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/welcome" element={<OnboardingRoute />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/items/:id" element={<ItemDetailPage />} />
        <Route path="/email/:id" element={<EmailDraftPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/imports" element={<ImportHistoryPage />} />
        <Route path="/ai-inbox" element={<AIInboxPage />} />
      </Route>
    </Routes>
    </ToastProvider>
    </AuthProvider>
  );
}
