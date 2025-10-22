'use client';

import ProtectedRoute from '@/app/components/ProtectedRoute';
import AdminLayout from '@/app/components/AdminLayout';
import PermissionList from './PermissionList';
import { PermissionProvider } from '@/app/contexts/PermissionContext';

export default function PermissionsPage() {
  return (
    <ProtectedRoute requiredRole="super-admin">
      <PermissionProvider>
        <AdminLayout>
          <PermissionList />
        </AdminLayout>
      </PermissionProvider>
    </ProtectedRoute>
  );
}