'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { StoreProvider } from '@/app/contexts/StoreContext';
import ChartClient from './ChartClient';

export default function SalesChartPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <StoreProvider>
        <AdminLayout>
          <ChartClient />
        </AdminLayout>
      </StoreProvider>
    </ProtectedRoute>
  );
}