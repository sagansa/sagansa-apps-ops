'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import ReceiptConfigContent from './ReceiptConfigContent';

export default function ReceiptConfigPage() {
    return (
        <ProtectedRoute requiredRole="admin">
            <AdminLayout>
                <ReceiptConfigContent />
            </AdminLayout>
        </ProtectedRoute>
    );
}
