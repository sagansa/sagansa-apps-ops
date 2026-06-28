'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import CategoriesClient from './CategoriesClient';

export default function CategoriesPage() {
    return (
        <ProtectedRoute requiredRole="admin">
            <AdminLayout>
                <CategoriesClient />
            </AdminLayout>
        </ProtectedRoute>
    );
}
