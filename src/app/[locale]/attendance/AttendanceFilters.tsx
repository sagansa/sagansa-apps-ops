'use client';

import { useState, useEffect } from 'react';
import { AttendanceListParams, AttendanceStatus } from '@/app/services/api';
import { useStoreContext } from '@/app/contexts/StoreContext';
import { useShiftStoreContext } from '@/app/contexts/ShiftStoreContext';
import { useTranslations } from 'next-intl';

interface AttendanceFiltersProps {
  filters: AttendanceListParams;
  onFiltersChange: (filters: AttendanceListParams) => void;
}

export default function AttendanceFilters({ filters, onFiltersChange }: AttendanceFiltersProps) {
  const { stores } = useStoreContext();
  const { shiftStores } = useShiftStoreContext();
  const t = useTranslations('Attendance.filters');
  const [localFilters, setLocalFilters] = useState<AttendanceListParams>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof AttendanceListParams, value: string | number | undefined) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: AttendanceListParams = { per_page: 20 };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const statusOptions: { value: AttendanceStatus | ''; label: string }[] = [
    { value: '', label: t('allStatuses') },
    { value: 'pending', label: t('pending') },
    { value: 'approved', label: t('approved') },
    { value: 'rejected', label: t('rejected') },
  ];

  const perPageOptions = [10, 20, 50, 100];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{t('title')}</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          {t('clearAll')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Store Filter */}
        <div>
          <label htmlFor="store-filter" className="block text-sm font-medium text-gray-700 mb-1">
            {t('storeLabel')}
          </label>
          <select
            id="store-filter"
            value={localFilters.store_id || ''}
            onChange={(e) => handleFilterChange('store_id', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('allStores')}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.nickname || store.name}
              </option>
            ))}
          </select>
        </div>

        {/* Shift Filter */}
        <div>
          <label htmlFor="shift-filter" className="block text-sm font-medium text-gray-700 mb-1">
            {t('shiftLabel')}
          </label>
          <select
            id="shift-filter"
            value={localFilters.shift_store_id || ''}
            onChange={(e) => handleFilterChange('shift_store_id', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('allShifts')}</option>
            {shiftStores.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name} ({shift.shift_start_time} - {shift.shift_end_time})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            {t('statusLabel')}
          </label>
          <select
            id="status-filter"
            value={localFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value as AttendanceStatus || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Per Page Filter */}
        <div>
          <label htmlFor="per-page-filter" className="block text-sm font-medium text-gray-700 mb-1">
            {t('perPage')}
          </label>
          <select
            id="per-page-filter"
            value={localFilters.per_page || 20}
            onChange={(e) => handleFilterChange('per_page', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>
                {t('perPageRecords', { count: option })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      <div className="flex flex-wrap gap-2 mt-4">
        {localFilters.store_id && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {t('storeLabel')} {stores.find(s => s.id === localFilters.store_id)?.name || t('unknown')}
            <button
              onClick={() => handleFilterChange('store_id', undefined)}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </span>
        )}
        {localFilters.shift_store_id && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {t('shiftLabel')} {shiftStores.find(s => s.id === localFilters.shift_store_id)?.name || t('unknown')}
            <button
              onClick={() => handleFilterChange('shift_store_id', undefined)}
              className="ml-2 text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </span>
        )}
        {localFilters.status && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {t('statusLabel')} {localFilters.status}
            <button
              onClick={() => handleFilterChange('status', undefined)}
              className="ml-2 text-purple-600 hover:text-purple-800"
            >
              ×
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
