'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import BillingGate from '@/components/BillingGate';
import { StoreProvider } from '@/app/contexts/StoreContext';
import SummaryClient from './SummaryClient';

export default function SalesSummaryPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <StoreProvider>
        <AdminLayout>
          <BillingGate>
            <SummaryClient />
          </BillingGate>
        </AdminLayout>
      </StoreProvider>
    </ProtectedRoute>
  );
}
