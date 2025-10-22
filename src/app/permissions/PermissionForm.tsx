'use client';

import { useEffect, useState } from 'react';
import { usePermissionContext } from '@/app/contexts/PermissionContext';
import { ApiError, Permission } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';

interface PermissionFormProps {
  permission: Permission | null;
  onClose: () => void;
}

interface PermissionFormState {
  name: string;
}

type PermissionFormErrors = Partial<Record<'name' | 'general', string>>;

const initialState: PermissionFormState = {
  name: '',
};

export default function PermissionForm({ permission, onClose }: PermissionFormProps) {
  const { createPermission, updatePermission } = usePermissionContext();
  const [formData, setFormData] = useState<PermissionFormState>(initialState);
  const [errors, setErrors] = useState<PermissionFormErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (permission) {
      setFormData({ name: permission.name });
    } else {
      setFormData(initialState);
    }
    setErrors({});
  }, [permission]);

  const clearError = (field: keyof PermissionFormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    clearError(name as keyof PermissionFormErrors);
  };

  const validate = () => {
    const nextErrors: PermissionFormErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Name is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      if (permission) {
        await updatePermission(permission.id, { name: formData.name });
      } else {
        await createPermission({ name: formData.name });
      }

      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        const fieldErrors: PermissionFormErrors = {};
        const firstMessage = error.errors.name?.[0];
        if (firstMessage) {
          fieldErrors.name = firstMessage;
        }
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          return;
        }
      }

      setErrors({ general: getErrorMessage(error, 'Failed to save permission') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-lg font-medium text-gray-900">{permission ? 'Edit Permission' : 'Create Permission'}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 transition hover:text-gray-500"
        >
          <span className="sr-only">Close dialog</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {errors.general && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{errors.general}</div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border ${errors.name ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:grid-flow-row-dense">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Saving...' : permission ? 'Update Permission' : 'Create Permission'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
