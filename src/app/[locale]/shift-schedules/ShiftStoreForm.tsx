'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShiftStore, ShiftStoreInput } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';
import { Button, Input, Label, Modal } from '@/components/ui';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('Shifts.schedules.form');
  const tCommon = useTranslations('Common');

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLocalError(null);

    if (!name.trim()) {
      setLocalError(t('nameRequired'));
      return;
    }

    if (!shiftStartTime || !shiftEndTime) {
      setLocalError(t('timesRequired'));
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
    } catch (submitError) {
      setLocalError(getErrorMessage(submitError, t('failedSave')));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={shiftStore ? t('editTitle') : t('createTitle')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {tenantName && (
          <p className="-mt-1 text-xs text-gray-500">{t('tenant')}: {tenantName}</p>
        )}

        {(localError || error) && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {localError || error}
          </div>
        )}

        <div>
          <Label htmlFor="shift-name" className="mb-2">
            {t('shiftName')}
          </Label>
          <Input
            id="shift-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('shiftNamePlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="shift-start-time" className="mb-2">
              {t('startTime')}
            </Label>
            <Input
              id="shift-start-time"
              type="time"
              value={shiftStartTime}
              onChange={(e) => setShiftStartTime(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="shift-end-time" className="mb-2">
              {t('endTime')}
            </Label>
            <Input
              id="shift-end-time"
              type="time"
              value={shiftEndTime}
              onChange={(e) => setShiftEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700">{t('duration')}</span>
          <p className="mt-1 text-sm text-gray-600">
            {durationMinutes !== null
              ? t('durationValue', { minutes: durationMinutes, text: formatDurationText(durationMinutes) })
              : t('durationHint')}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {t('durationNote')}
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? t('saving') : shiftStore ? t('updateBtn') : t('createBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
