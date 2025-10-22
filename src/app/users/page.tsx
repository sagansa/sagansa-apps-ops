'use client';

import ProtectedRoute from '@/app/components/ProtectedRoute';
import AdminLayout from '@/app/components/AdminLayout';
import UserList from './UserList';
import { UserProvider } from '@/app/contexts/UserContext';
import { RoleProvider } from '@/app/contexts/RoleContext';
import { TenantProvider } from '@/app/contexts/TenantContext';

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <TenantProvider>
        <RoleProvider>
          <UserProvider>
            <AdminLayout>
              <UserList />
            </AdminLayout>
          </UserProvider>
        </RoleProvider>
      </TenantProvider>
    </ProtectedRoute>
  );
}
