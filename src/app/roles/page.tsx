'use client';

import ProtectedRoute from '@/app/components/ProtectedRoute';
import AdminLayout from '@/app/components/AdminLayout';
import RoleList from './RoleList';
import { RoleProvider } from '@/app/contexts/RoleContext';

export default function RolesPage() {
  return (
    <ProtectedRoute requiredRole="super-admin">
      <RoleProvider>
        <AdminLayout>
          <RoleList />
        </AdminLayout>
      </RoleProvider>
    </ProtectedRoute>
  );
}