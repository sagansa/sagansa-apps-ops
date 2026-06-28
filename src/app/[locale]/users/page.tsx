'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import UserList from './UserList';
import { UserProvider } from '@/app/contexts/UserContext';
import { RoleProvider } from '@/app/contexts/RoleContext';
import { TenantProvider } from '@/app/contexts/TenantContext';

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <UserProvider>
        <TenantProvider>
          <AdminLayout>
            <UserList />
          </AdminLayout>
        </TenantProvider>
      </UserProvider>
    </ProtectedRoute>
  );
}
