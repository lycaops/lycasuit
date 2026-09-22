'use client';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Loader from '@/components/Loader';
import { useAuth } from '@incentive/lib/AuthContext';
import UserNotRegisteredError from '@incentive/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="lo-screen">
    <Loader size={128} />
  </div>
);

const PlatformLoginRedirect = () => {
  useEffect(() => {
    window.location.replace('/auth/login');
  }, []);

  return <DefaultFallback />;
};

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
    return <PlatformLoginRedirect />;
  }

  return <Outlet />;
}
