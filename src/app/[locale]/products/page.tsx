'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import ProductsClient from './ProductsClient';

export default function ProductsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout>
        <ProductsClient />
      </AdminLayout>
    </ProtectedRoute>
  );
}

