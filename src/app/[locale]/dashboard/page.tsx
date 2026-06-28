'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { StoreProvider } from '@/app/contexts/StoreContext';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <StoreProvider>
        <AdminLayout>
          <DashboardClient />
        </AdminLayout>
      </StoreProvider>
    </ProtectedRoute>
  );
}