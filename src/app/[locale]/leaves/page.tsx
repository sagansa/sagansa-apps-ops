'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import apiService, { Leave, LeaveStatus } from '@/app/services/api';
import LeaveList from './LeaveList';
import { useTranslations } from 'next-intl';

function LeaveContent() {
  const { user } = useAuth();
  const t = useTranslations('Leaves');
  const ts = useTranslations('Leaves.sorts');
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at_desc' | 'created_at_asc' | 'start_date_asc' | 'start_date_desc' | 'duration_asc' | 'duration_desc'>('created_at_desc');

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getLeaves(
        statusFilter || typeFilter ? { status: statusFilter || undefined, type: typeFilter || undefined } : undefined,
      );
      const r = response as Record<string, unknown>;
      let list: Leave[] = Array.isArray(r.leaves) ? (r.leaves as Leave[]) : [];

      // Sort
      list = [...list].sort((a, b) => {
        const by = sortBy;
        if (by === 'created_at_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (by === 'created_at_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (by === 'start_date_asc') return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        if (by === 'start_date_desc') return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        if (by === 'duration_asc') return (a.duration ?? 0) - (b.duration ?? 0);
        if (by === 'duration_desc') return (b.duration ?? 0) - (a.duration ?? 0);
        return 0;
      });

      setLeaves(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaves();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, sortBy]);



  const handleStatusUpdate = async (leaveId: string, status: LeaveStatus) => {
    await apiService.updateLeaveStatus(leaveId, status);
    await fetchLeaves();
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">{t('sort')}</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="created_at_desc">{ts('newest')}</option>
              <option value="created_at_asc">{ts('oldest')}</option>
              <option value="start_date_asc">{ts('startAsc')}</option>
              <option value="start_date_desc">{ts('startDesc')}</option>
              <option value="duration_asc">{ts('durationAsc')}</option>
              <option value="duration_desc">{ts('durationDesc')}</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">{t('loading')}</span>
          </div>
        ) : (
          <LeaveList
            leaves={leaves}
            onStatusUpdate={handleStatusUpdate}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
          />
        )}
      </div>
    </div>
  );
}

export default function LeavePage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <LeaveContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}