'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import RoleList from './RoleList';
import { RoleProvider } from '@/app/contexts/RoleContext';

export default function RolesPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <RoleProvider>
        <AdminLayout>
          <RoleList />
        </AdminLayout>
      </RoleProvider>
    </ProtectedRoute>
  );
}