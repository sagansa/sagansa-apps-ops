'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { StoreProvider } from '@/app/contexts/StoreContext';
import SummaryClient from './SummaryClient';

export default function SalesSummaryPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <StoreProvider>
        <AdminLayout>
          <SummaryClient />
        </AdminLayout>
      </StoreProvider>
    </ProtectedRoute>
  );
}