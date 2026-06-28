'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import BillingGate from '@/components/BillingGate';
import { StoreProvider } from '@/app/contexts/StoreContext';
import ChartClient from './ChartClient';

export default function SalesChartPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <StoreProvider>
        <AdminLayout>
          <BillingGate>
            <ChartClient />
          </BillingGate>
        </AdminLayout>
      </StoreProvider>
    </ProtectedRoute>
  );
}
