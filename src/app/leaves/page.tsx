'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminLayout from '../components/AdminLayout';

function LeaveContent() {
    const { user, isSuperAdmin } = useAuth();
    return (
        <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Management</h1>
                    <p className="text-gray-600">View and manage employee leave requests</p>
                </div>
            </div>
        </div>
    );
}

export default function LeavePage() {
    return (
        <ProtectedRoute requiredRole="admin">
            <AdminLayout>
                <LeaveContent />
            </AdminLayout>
        </ProtectedRoute>
    );
}