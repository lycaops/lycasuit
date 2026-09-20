'use client';
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useCustomAuth } from '@assistance/lib/customAuth';
import Layout from '@assistance/components/Layout';

export default function CustomProtectedRoute() {
  const { currentUser, loading, loggingOut } = useCustomAuth();

  if (loading || loggingOut) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-destructive border-t-foreground rounded-full animate-spin"></div>
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