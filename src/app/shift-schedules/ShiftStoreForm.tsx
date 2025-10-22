'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShiftStore, ShiftStoreInput } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';

interface ShiftStoreFormProps {
  tenantName?: string;
  shiftStore?: ShiftStore;
  isOpen: boolean;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: ShiftStoreInput) => Promise<void>;
}

const toTimeInputValue = (time: string | null | undefined) => {
  if (!time) {
    return '';
  }

  const [hours = '00', minutes = '00'] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

const computeDurationMinutes = (start: string, end: string): number | null => {
  if (!start || !end) {
    return null;
  }

  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);

  if ([startHours, startMinutes, endHours, endMinutes].some((value) => Number.isNaN(value))) {
    return null;
  }

  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;

  let diff = endTotal - startTotal;
  if (diff <= 0) {
    diff += 24 * 60;
  }

  return diff;
};

const formatDurationText = (durationMinutes: number | null) => {
  if (durationMinutes === null) {
    return '--';
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(' ');
};

export default function ShiftStoreForm({
  tenantName,
  shiftStore,
  isOpen,
  loading,
  error,
  onClose,
  onSubmit,
}: ShiftStoreFormProps) {
  const [name, setName] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (shiftStore) {
      setName(shiftStore.name ?? '');
      setShiftStartTime(toTimeInputValue(shiftStore.shift_start_time));
      setShiftEndTime(toTimeInputValue(shiftStore.shift_end_time));
    } else {
      setName('');
      setShiftStartTime('');
      setShiftEndTime('');
    }
    setLocalError(null);
  }, [shiftStore, isOpen]);

  const durationMinutes = useMemo(
    () => computeDurationMinutes(shiftStartTime, shiftEndTime),
    [shiftStartTime, shiftEndTime],
  );

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Shift name is required.');
      return;
    }

    if (!shiftStartTime || !shiftEndTime) {
      setLocalError('Both start and end times are required.');
      return;
    }

    const payload: ShiftStoreInput = {
      name: name.trim(),
      shift_start_time: shiftStartTime,
      shift_end_time: shiftEndTime,
      duration: durationMinutes ?? undefined,
    };

    try {
      await onSubmit(payload);
      if (!loading) {
        onClose();
      }
    } catch (submitError) {
      setLocalError(getErrorMessage(submitError, 'Failed to save shift'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {shiftStore ? 'Edit Shift' : 'Create Shift'}
            </h2>
            {tenantName && (
              <p className="text-xs text-gray-500">Tenant: {tenantName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {(localError || error) && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {localError || error}
            </div>
          )}

          <div>
            <label htmlFor="shift-name" className="block text-sm font-medium text-gray-700">
              Shift Name
            </label>
            <input
              id="shift-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="e.g. Morning Shift"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="shift-start-time" className="block text-sm font-medium text-gray-700">
                Start Time
              </label>
              <input
                id="shift-start-time"
                type="time"
                value={shiftStartTime}
                onChange={(e) => setShiftStartTime(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="shift-end-time" className="block text-sm font-medium text-gray-700">
                End Time
              </label>
              <input
                id="shift-end-time"
                type="time"
                value={shiftEndTime}
                onChange={(e) => setShiftEndTime(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700">Duration</span>
            <p className="mt-1 text-sm text-gray-600">
              {durationMinutes !== null
                ? `${durationMinutes} minutes (${formatDurationText(durationMinutes)})`
                : 'Set start and end times to calculate duration.'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              If end time is earlier than start time, the shift is treated as crossing midnight.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : shiftStore ? 'Update Shift' : 'Create Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
