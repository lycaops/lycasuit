'use client';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Loader from '@/components/Loader';
import { useAuth } from '@assistance/lib/AuthContext';
import UserNotRegisteredError from '@assistance/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="lo-screen" style={{ position: 'fixed', inset: 0, zIndex: 1000, width: '100vw', minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#fff' }}>
  <Loader size={128} />
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}
