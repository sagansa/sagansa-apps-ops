'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import CustomerTypesClient from './CustomerTypesClient';

export default function CustomerTypesPage() {
    return (
        <ProtectedRoute requiredRole="admin">
            <AdminLayout>
                <CustomerTypesClient />
            </AdminLayout>
        </ProtectedRoute>
    );
}
