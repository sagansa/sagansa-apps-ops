'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { StoreProvider } from '@/app/contexts/StoreContext';
import TransactionsClient from './TransactionsClient';

export default function TransactionsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <StoreProvider>
        <AdminLayout>
          <TransactionsClient />
        </AdminLayout>
      </StoreProvider>
    </ProtectedRoute>
  );
}