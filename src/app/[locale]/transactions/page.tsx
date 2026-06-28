'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import BillingGate from '@/components/BillingGate';
import { StoreProvider } from '@/app/contexts/StoreContext';
import TransactionsClient from './TransactionsClient';

export default function TransactionsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <StoreProvider>
        <AdminLayout>
          <BillingGate>
            <TransactionsClient />
          </BillingGate>
        </AdminLayout>
      </StoreProvider>
    </ProtectedRoute>
  );
}
