import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/lib/providers/AuthProvider';
import { setAuthTokenGetter } from '@/lib/api/config';
import { OrgProvider } from '@/lib/context/OrgContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import ProfilePage from '@/pages/ProfilePage';
import MahycoDashboardPage from '@/pages/MahycoDashboardPage';
import BatchProcessingPage from '@/pages/BatchProcessingPage';
import PlaygroundPage from '@/pages/PlaygroundPage';
import HistoryPage from '@/pages/HistoryPage';
import SettingsPage from '@/pages/SettingsPage';

function AppRoutes() {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth();

  // Keep API config in sync with auth token
  if (isAuthenticated && getAccessTokenSilently) {
    setAuthTokenGetter(getAccessTokenSilently);
  } else if (!isLoading) {
    setAuthTokenGetter(null);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--bg)">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={isAuthenticated ? (
          <OrgProvider>
            <DashboardLayout />
          </OrgProvider>
        ) : <Navigate to="/login" replace />}
      >
        <Route index element={<MahycoDashboardPage />} />
        <Route path="batch" element={<BatchProcessingPage />} />
        <Route path="playground" element={<PlaygroundPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        toastOptions={{
          style: {
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          },
          success: {
            iconTheme: { primary: 'var(--color-success)', secondary: 'var(--surface-raised)' },
          },
          error: {
            iconTheme: { primary: 'var(--color-danger)', secondary: 'var(--surface-raised)' },
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
