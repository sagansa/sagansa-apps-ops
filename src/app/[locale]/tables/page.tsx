'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import TablesClient from './TablesClient';

export default function TablesPage() {
    return (
        <ProtectedRoute requiredRole="admin">
            <AdminLayout>
                <TablesClient />
            </AdminLayout>
        </ProtectedRoute>
    );
}
