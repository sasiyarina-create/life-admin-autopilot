import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { EmailDraftPage } from './pages/EmailDraftPage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { UploadPage } from './pages/UploadPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/items/:id" element={<ItemDetailPage />} />
        <Route path="/email/:id" element={<EmailDraftPage />} />
      </Route>
    </Routes>
  );
}
