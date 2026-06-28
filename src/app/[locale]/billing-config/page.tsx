'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import BillingConfigClient from './BillingConfigClient';

export default function BillingConfigPage() {
  return (
    <ProtectedRoute requiredRole="super-admin">
      <AdminLayout>
        <BillingConfigClient />
      </AdminLayout>
    </ProtectedRoute>
  );
}
