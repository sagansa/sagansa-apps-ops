'use client';

import { useState, useEffect } from 'react';
import { Attendance, AttendanceCreateInput } from '@/app/services/api';
import { useStoreContext } from '@/app/contexts/StoreContext';
import { useShiftStoreContext } from '@/app/contexts/ShiftStoreContext';

interface AttendanceFormProps {
  attendance?: Attendance;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AttendanceCreateInput) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export default function AttendanceForm({
  attendance,
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  error = null,
}: AttendanceFormProps) {
  const { stores } = useStoreContext();
  const { shiftStores } = useShiftStoreContext();
  
  const [formData, setFormData] = useState<AttendanceCreateInput>({
    store_id: '',
    shift_store_id: null,
    image_in: null,
    check_in: null,
    latitude_in: null,
    longitude_in: null,
    image_out: null,
    check_out: null,
    latitude_out: null,
    longitude_out: null,
  });

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (attendance) {
      setFormData({
        store_id: attendance.store_id,
        shift_store_id: attendance.shift_store_id,
        image_in: attendance.image_in,
        check_in: attendance.check_in,
        latitude_in: attendance.latitude_in,
        longitude_in: attendance.longitude_in,
        image_out: attendance.image_out,
        check_out: attendance.check_out,
        latitude_out: attendance.latitude_out,
        longitude_out: attendance.longitude_out,
      });
    } else {
      setFormData({
        store_id: '',
        shift_store_id: null,
        image_in: null,
        check_in: null,
        latitude_in: null,
        longitude_in: null,
        image_out: null,
        check_out: null,
        latitude_out: null,
        longitude_out: null,
      });
    }
    setFormError(null);
  }, [attendance, isOpen]);

  const handleInputChange = (field: keyof AttendanceCreateInput, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.store_id) {
      setFormError('Store is required');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().slice(0, 16);
  };

  const parseDateTime = (dateString: string) => {
    if (!dateString) return null;
    return new Date(dateString).toISOString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {attendance ? 'Edit Attendance' : 'Create Attendance'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {formError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{formError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Store Selection */}
              <div>
                <label htmlFor="store_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Store *
                </label>
                <select
                  id="store_id"
                  value={formData.store_id}
                  onChange={(e) => handleInputChange('store_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.nickname || store.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift Selection */}
              <div>
                <label htmlFor="shift_store_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Shift
                </label>
                <select
                  id="shift_store_id"
                  value={formData.shift_store_id || ''}
                  onChange={(e) => handleInputChange('shift_store_id', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a shift (optional)</option>
                  {shiftStores.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.shift_start_time} - {shift.shift_end_time})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Check In Section */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Check In Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="check_in" className="block text-sm font-medium text-gray-700 mb-2">
                    Check In Time
                  </label>
                  <input
                    type="datetime-local"
                    id="check_in"
                    value={formData.check_in ? formatDateTime(formData.check_in) : ''}
                    onChange={(e) => handleInputChange('check_in', e.target.value ? parseDateTime(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="image_in" className="block text-sm font-medium text-gray-700 mb-2">
                    Check In Image URL
                  </label>
                  <input
                    type="url"
                    id="image_in"
                    value={formData.image_in || ''}
                    onChange={(e) => handleInputChange('image_in', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label htmlFor="latitude_in" className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude In
                  </label>
                  <input
                    type="number"
                    id="latitude_in"
                    step="any"
                    value={formData.latitude_in || ''}
                    onChange={(e) => handleInputChange('latitude_in', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., -6.200000"
                  />
                </div>

                <div>
                  <label htmlFor="longitude_in" className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude In
                  </label>
                  <input
                    type="number"
                    id="longitude_in"
                    step="any"
                    value={formData.longitude_in || ''}
                    onChange={(e) => handleInputChange('longitude_in', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 106.816666"
                  />
                </div>
              </div>
            </div>

            {/* Check Out Section */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Check Out Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="check_out" className="block text-sm font-medium text-gray-700 mb-2">
                    Check Out Time
                  </label>
                  <input
                    type="datetime-local"
                    id="check_out"
                    value={formData.check_out ? formatDateTime(formData.check_out) : ''}
                    onChange={(e) => handleInputChange('check_out', e.target.value ? parseDateTime(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="image_out" className="block text-sm font-medium text-gray-700 mb-2">
                    Check Out Image URL
                  </label>
                  <input
                    type="url"
                    id="image_out"
                    value={formData.image_out || ''}
                    onChange={(e) => handleInputChange('image_out', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label htmlFor="latitude_out" className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude Out
                  </label>
                  <input
                    type="number"
                    id="latitude_out"
                    step="any"
                    value={formData.latitude_out || ''}
                    onChange={(e) => handleInputChange('latitude_out', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., -6.200000"
                  />
                </div>

                <div>
                  <label htmlFor="longitude_out" className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude Out
                  </label>
                  <input
                    type="number"
                    id="longitude_out"
                    step="any"
                    value={formData.longitude_out || ''}
                    onChange={(e) => handleInputChange('longitude_out', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 106.816666"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : attendance ? 'Update Attendance' : 'Create Attendance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
