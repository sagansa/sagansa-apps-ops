'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TenantProvider, useTenantContext } from '../contexts/TenantContext';
import { StoreProvider, useStoreContext } from '../contexts/StoreContext';
import { ShiftStoreProvider, useShiftStoreContext } from '../contexts/ShiftStoreContext';
import apiService, { Attendance, AttendanceStatus, AttendanceListParams, AttendanceCreateInput } from '../services/api';
import AttendanceList from './AttendanceList';
import AttendanceFilters from './AttendanceFilters';
import AttendanceForm from './AttendanceForm';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminLayout from '../components/AdminLayout';

function AttendanceContent() {
  const { user, isSuperAdmin } = useAuth();
  const { tenants, fetchTenants } = useTenantContext();
  const { fetchStores } = useStoreContext();
  const { fetchShiftStores } = useShiftStoreContext();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AttendanceListParams>({
    per_page: 20,
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeAttendance, setActiveAttendance] = useState<Attendance | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

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
      const response = await apiService.getAttendances(filters);
      
      // Laravel resource collection response structure
      if (response && response.data) {
        setAttendances(Array.isArray(response.data) ? response.data : []);
      } else {
        // No error if response is valid but empty
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
      if (response.success) {
        // Refresh the list
        await fetchAttendances();
      } else {
        setError('Failed to update attendance status');
      }
    } catch (err) {
      console.error('Error updating attendance status:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleFiltersChange = (newFilters: AttendanceListParams) => {
    setFilters(newFilters);
  };

  const openCreateModal = () => {
    setActiveAttendance(undefined);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (attendance: Attendance) => {
    setActiveAttendance(attendance);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeModal = () => {
    setIsFormOpen(false);
    setFormError(null);
    setActiveAttendance(undefined);
  };

  const handleFormSubmit = async (data: AttendanceCreateInput) => {
    setFormLoading(true);
    setFormError(null);

    try {
      if (activeAttendance) {
        // For editing, we would need an update endpoint
        // For now, we'll show an error since the backend doesn't have update
        throw new Error('Editing attendance is not supported yet');
      } else {
        const response = await apiService.createAttendance(data);
        if (response.success) {
          await fetchAttendances();
          closeModal();
        } else {
          throw new Error(response.message || 'Failed to create attendance');
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to view attendance records.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Management</h1>
            <p className="text-gray-600">View and manage employee attendance records</p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Attendance
          </button>
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
                  Try again
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading attendances...</span>
              </div>
            ) : (
              <AttendanceList 
                attendances={attendances}
                onStatusUpdate={handleStatusUpdate}
                onEdit={openEditModal}
              />
            )}
          </div>
        </div>

        <AttendanceForm
          attendance={activeAttendance}
          isOpen={isFormOpen}
          onClose={closeModal}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          error={formError}
        />
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
