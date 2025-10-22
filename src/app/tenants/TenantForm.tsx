'use client';

import { useEffect, useState } from 'react';
import { Tenant, TenantInput, TenantUpdateInput, User } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';

interface TenantFormProps {
  tenant?: Tenant;
  users: User[];
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: TenantInput | TenantUpdateInput) => Promise<void>;
  error?: string | null;
}

export default function TenantForm({
  tenant,
  users,
  isOpen,
  loading,
  onClose,
  onSubmit,
  error,
}: TenantFormProps) {
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      setOwnerId(tenant.owner?.id ?? '');
    } else {
      setName('');
      setOwnerId('');
    }
    setLocalError(null);
  }, [tenant, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Tenant name is required.');
      return;
    }

    if (!ownerId) {
      setLocalError('Please select an owner for the tenant.');
      return;
    }

    const payload: TenantInput | TenantUpdateInput = {
      name: name.trim(),
      owner_id: ownerId,
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      setLocalError(getErrorMessage(error, 'Failed to save tenant'));
      return;
    }

    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {tenant ? 'Edit Tenant' : 'Create Tenant'}
          </h2>
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
            <label htmlFor="tenant-name" className="block text-sm font-medium text-gray-700">
              Tenant Name
            </label>
            <input
              id="tenant-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="Enter tenant name"
            />
          </div>

          <div>
            <label htmlFor="tenant-owner" className="block text-sm font-medium text-gray-700">
              Tenant Owner
            </label>
            <select
              id="tenant-owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-gray-100"
              disabled={users.length === 0 || loading}
            >
              <option value="">Select owner</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            {users.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                No available users found. Create an admin user first.
              </p>
            )}
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
              disabled={loading || users.length === 0}
            >
              {loading ? 'Saving...' : tenant ? 'Update Tenant' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
