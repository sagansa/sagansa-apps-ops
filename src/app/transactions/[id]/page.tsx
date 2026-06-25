'use client';

import { use } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { StoreProvider } from '@/app/contexts/StoreContext';
import TransactionDetailClient from './TransactionDetailClient';

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ProtectedRoute requiredRole="admin">
      <StoreProvider>
        <AdminLayout>
          <TransactionDetailClient orderId={id} />
        </AdminLayout>
      </StoreProvider>
    </ProtectedRoute>
  );
}