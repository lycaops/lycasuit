'use client';
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Loader from '@/components/Loader';
import { useCustomAuth } from '@assistance/lib/customAuth';
import Layout from '@assistance/components/Layout';

export default function CustomProtectedRoute() {
  const { currentUser, loading, loggingOut } = useCustomAuth();

  if (loading || loggingOut) {
    return (
      <div className="lo-screen" style={{ '--lo-screen-bg': 'var(--background)' }}>
        <Loader size={128} />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}