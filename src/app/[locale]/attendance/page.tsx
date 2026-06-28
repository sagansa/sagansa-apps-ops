'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { TenantProvider, useTenantContext } from '@/app/contexts/TenantContext';
import { StoreProvider, useStoreContext } from '@/app/contexts/StoreContext';
import { ShiftStoreProvider, useShiftStoreContext } from '@/app/contexts/ShiftStoreContext';
import apiService, { Attendance, AttendanceStatus, AttendanceListParams } from '@/app/services/api';
import AttendanceList from './AttendanceList';
import AttendanceFilters from './AttendanceFilters';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useTranslations } from 'next-intl';

function AttendanceContent() {
  const { user, isSuperAdmin } = useAuth();
  const t = useTranslations('Attendance');
  const tCommon = useTranslations('Common');
  const { tenants, fetchTenants } = useTenantContext();
  const { fetchStores } = useStoreContext();
  const { fetchShiftStores } = useShiftStoreContext();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AttendanceListParams>({
    per_page: 20,
  });
  

  // Fetch tenants for super admin
  useEffect(() => {
    if (isSuperAdmin) {
      fetchTenants();
    }
  }, [isSuperAdmin, fetchTenants]);

  // Fetch stores and shift stores for the current user's tenant
  useEffect(() => {
    if (!isSuperAdmin && user?.tenant?.id) {
      fetchStores(user.tenant.id);
      fetchShiftStores(user.tenant.id);
    }
  }, [isSuperAdmin, user?.tenant?.id, fetchStores, fetchShiftStores]);

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching attendances with filters:', filters);
      console.log('User authenticated:', !!user);
      const response = await apiService.getAttendances(filters);
      console.log('Attendance API response:', response);
      const r = response as Record<string, unknown>;
      const dataField = r.data;
      const data = Array.isArray(dataField)
        ? dataField
        : dataField && typeof dataField === 'object' && Array.isArray((dataField as { data?: unknown }).data)
          ? (dataField as { data: unknown[] }).data
          : [];
      console.log('Attendance data from response:', data);
      if (Array.isArray(data)) {
        setAttendances(data as Attendance[]);
        console.log('Set attendances with', data.length, 'records');
      } else {
        console.log('No array data found, setting empty attendances');
        setAttendances([]);
      }
    } catch (err) {
      console.error('Error fetching attendances:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAttendances();
    }
  }, [user, filters]);

  const handleStatusUpdate = async (attendanceId: string, status: AttendanceStatus) => {
    try {
      const response = await apiService.updateAttendanceStatus(attendanceId, status);
      const r = response as Record<string, unknown>;
      if ((r as Record<string, unknown>).success === true) {
        // Refresh the list
        await fetchAttendances();
      } else {
        setError(t('errors.failedUpdateStatus'));
      }
    } catch (err) {
      console.error('Error updating attendance status:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleFiltersChange = (newFilters: AttendanceListParams) => {
    setFilters(newFilters);
  };

  

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('pleaseLogin')}</h2>
          <p className="text-gray-600">{t('loginRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>
          
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <AttendanceFilters 
              filters={filters} 
              onFiltersChange={handleFiltersChange}
            />
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={fetchAttendances}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  {t('tryAgain')}
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">{t('loading')}</span>
              </div>
            ) : (
              <AttendanceList 
                attendances={attendances}
                onStatusUpdate={handleStatusUpdate}
              />
            )}
          </div>
        </div>

        
      </div>
    </AdminLayout>
  );
}

export default function AttendancePage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <TenantProvider>
        <StoreProvider>
          <ShiftStoreProvider>
            <AttendanceContent />
          </ShiftStoreProvider>
        </StoreProvider>
      </TenantProvider>
    </ProtectedRoute>
  );
}
