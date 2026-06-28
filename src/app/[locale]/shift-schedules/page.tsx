'use client';

import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TenantProvider } from '@/app/contexts/TenantContext';
import { ShiftStoreProvider } from '@/app/contexts/ShiftStoreContext';
import ShiftSchedulesContent from './ShiftSchedulesContent';

export default function ShiftSchedulesPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <TenantProvider>
        <ShiftStoreProvider>
          <AdminLayout>
            <ShiftSchedulesContent />
          </AdminLayout>
        </ShiftStoreProvider>
      </TenantProvider>
    </ProtectedRoute>
  );
}
