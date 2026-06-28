'use client';

import { useEffect, useState } from 'react';
import { Tenant, TenantInput, TenantUpdateInput, User } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';
import { Modal, Input, Select, Button } from '@/components/ui';
import { useTranslations } from 'next-intl';

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
  const [operationMode, setOperationMode] = useState<'standard' | 'foodcourt'>('standard');
  const [localError, setLocalError] = useState<string | null>(null);
  const t = useTranslations('Tenants.form');
  const tCommon = useTranslations('Common');

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      setOwnerId(tenant.owner?.id ?? '');
      setOperationMode(tenant.operation_mode || 'standard');
    } else {
      setName('');
      setOwnerId('');
      setOperationMode('standard');
    }
    setLocalError(null);
  }, [tenant, isOpen]);

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
      operation_mode: operationMode,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tenant ? t('editTitle') : t('createTitle')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {(localError || error) && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {localError || error}
          </div>
        )}

        <div>
          <label htmlFor="tenant-name" className="block text-sm font-medium text-gray-700 mb-1">
            {t('name')}
          </label>
          <Input
            id="tenant-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="tenant-owner" className="block text-sm font-medium text-gray-700 mb-1">
            {t('owner')}
          </label>
          <Select
            id="tenant-owner"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            disabled={users.length === 0 || loading}
          >
            <option value="">{t('selectOwner')}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </Select>
          {users.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {t('noUsers')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="operation-mode" className="block text-sm font-medium text-gray-700 mb-1">
            {t('operationMode')}
          </label>
          <Select
            id="operation-mode"
            value={operationMode}
            onChange={(e) => setOperationMode(e.target.value as 'standard' | 'foodcourt')}
            disabled={loading}
          >
            <option value="standard">{t('standard')}</option>
            <option value="foodcourt">{t('foodcourt')}</option>
          </Select>
          <p className="mt-1 text-xs text-gray-500">
            {t('modeDesc')}
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
            disabled={loading || users.length === 0}
          >
            {loading ? t('saving') : tenant ? t('updateBtn') : t('createBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
