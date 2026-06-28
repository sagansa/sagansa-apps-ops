'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import BillingClient from './BillingClient';

export default function BillingPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout>
        <BillingClient />
      </AdminLayout>
    </ProtectedRoute>
  );
}
