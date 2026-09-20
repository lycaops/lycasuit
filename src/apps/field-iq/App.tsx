'use client';
import { AuthProvider, useAuth } from '@fieldiq/contexts/AuthContext';
import Login from '@fieldiq/components/Login';
import Dashboard from '@fieldiq/components/Dashboard';
import Loader from '@/components/Loader';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="lo-screen" style={{ '--lo-screen-bg': '#f4f7fb', position: 'fixed', inset: 0, zIndex: 1000, width: '100vw', minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#f4f7fb' }}>
        <Loader size={128} />
      </div>
    );
  }

  if (!user) return <Login />;
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
