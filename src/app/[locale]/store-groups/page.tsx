'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import apiService, { Store, StoreGroup, StoreGroupInput, Tenant } from '@/app/services/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { TenantProvider, useTenantContext } from '@/app/contexts/TenantContext';
import { Button, ConfirmationDialog, Input, Textarea } from '@/components/ui';
import { Check, Pencil, RefreshCw, Trash2, Users } from 'lucide-react';
import { getErrorMessage } from '@/app/utils/error';
import { useTranslations } from 'next-intl';

type FormState = {
  id?: string;
  name: string;
  description: string;
  storeIds: string[];
};

const emptyForm: FormState = {
  name: '',
  description: '',
  storeIds: [],
};

function StoreGroupsContent() {
  const { isSuperAdmin, user } = useAuth();
  const t = useTranslations('StoreGroups');
  const tCommon = useTranslations('Common');
  const { tenants, fetchTenants, loading: tenantLoading } = useTenantContext();
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [groups, setGroups] = useState<StoreGroup[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [sourceStoreByGroup, setSourceStoreByGroup] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<StoreGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncingGroupId, setSyncingGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTenants();
    }
  }, [fetchTenants, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin && user?.tenant?.id) {
      setSelectedTenantId(user.tenant.id);
    }
  }, [isSuperAdmin, user?.tenant?.id]);

  useEffect(() => {
    if (isSuperAdmin && !selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [isSuperAdmin, selectedTenantId, tenants]);

  const activeTenant: Tenant | undefined = useMemo(() => {
    if (isSuperAdmin) {
      return tenants.find((tenant) => tenant.id === selectedTenantId);
    }
    return user?.tenant;
  }, [isSuperAdmin, selectedTenantId, tenants, user?.tenant]);

  const activeTenantId = activeTenant?.id;

  const loadData = async (tenantId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [storeResponse, groupResponse] = await Promise.all([
        apiService.getTenantStores(tenantId),
        apiService.getStoreGroups(tenantId),
      ]);
      const responseStores = (storeResponse as { stores?: Store[] }).stores;
      setStores(Array.isArray(responseStores) ? responseStores : []);
      setGroups(groupResponse);
      setSourceStoreByGroup((prev) => {
        const next = { ...prev };
        groupResponse.forEach((group) => {
          if (!next[group.id] && group.stores[0]) {
            next[group.id] = group.stores[0].id;
          }
        });
        return next;
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load store groups'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) {
      loadData(activeTenantId);
    } else {
      setStores([]);
      setGroups([]);
    }
  }, [activeTenantId]);

  const resetForm = () => setForm(emptyForm);

  const editGroup = (group: StoreGroup) => {
    setForm({
      id: group.id,
      name: group.name,
      description: group.description ?? '',
      storeIds: group.stores.map((store) => store.id),
    });
  };

  const toggleStore = (storeId: string) => {
    setForm((current) => ({
      ...current,
      storeIds: current.storeIds.includes(storeId)
        ? current.storeIds.filter((id) => id !== storeId)
        : [...current.storeIds, storeId],
    }));
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeTenantId || !form.name.trim()) {
      setError('Group name is required.');
      return;
    }

    const payload: StoreGroupInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      store_ids: form.storeIds,
    };

    setLoading(true);
    setError(null);
    try {
      if (form.id) {
        await apiService.updateStoreGroup(activeTenantId, form.id, payload);
      } else {
        await apiService.createStoreGroup(activeTenantId, payload);
      }
      resetForm();
      await loadData(activeTenantId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save store group'));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!activeTenantId || !deleteTarget) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiService.deleteStoreGroup(activeTenantId, deleteTarget.id);
      setDeleteTarget(null);
      await loadData(activeTenantId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete store group'));
    } finally {
      setLoading(false);
    }
  };

  const syncGroup = async (group: StoreGroup) => {
    if (!activeTenantId) {
      return;
    }

    const sourceStoreId = sourceStoreByGroup[group.id] || group.stores[0]?.id;
    if (!sourceStoreId) {
      setError('Select at least one store in this group before syncing.');
      return;
    }

    setSyncingGroupId(group.id);
    setError(null);
    try {
      await apiService.syncStoreGroupSettings(activeTenantId, group.id, sourceStoreId);
      await loadData(activeTenantId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to sync store group settings'));
    } finally {
      setSyncingGroupId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <section className="mt-6 space-y-4">
        {isSuperAdmin && (
          <div>
            <label htmlFor="tenant-select" className="block text-sm font-medium text-gray-700">
              {t('tenant')}
            </label>
            <select
              id="tenant-select"
              value={selectedTenantId}
              onChange={(event) => {
                setSelectedTenantId(event.target.value);
                resetForm();
              }}
              disabled={tenantLoading}
              className="mt-1 block w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="">{t('selectTenant')}</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {activeTenantId ? (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <form onSubmit={submitForm} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">
                  {form.id ? t('editTitle') : t('createTitle')}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="group-name" className="block text-sm font-medium text-gray-700">
                    {t('groupName')}
                  </label>
                  <Input
                    id="group-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder={t('groupNamePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="group-description" className="block text-sm font-medium text-gray-700">
                    {t('description')}
                  </label>
                  <Textarea
                    id="group-description"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    rows={3}
                    placeholder={t('descriptionPlaceholder')}
                  />
                </div>

                <div>
                  <p className="block text-sm font-medium text-gray-700">{t('labels.stores')}</p>
                  <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-3">
                    {stores.length === 0 ? (
                      <p className="text-sm text-gray-500">{t('noStoresAvailable')}</p>
                    ) : stores.map((store) => (
                      <label key={store.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.storeIds.includes(store.id)}
                          onChange={() => toggleStore(store.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{store.nickname || store.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                {form.id && (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                    {t('cancel')}
                  </Button>
                )}
                <Button type="submit" disabled={loading}>
                  <Check className="mr-1 h-4 w-4" />
                  {loading ? t('saving') : form.id ? t('update') : t('create')}
                </Button>
              </div>
            </form>

            <div className="overflow-hidden rounded-lg bg-white shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('labels.group')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('labels.stores')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('labels.syncSource')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('labels.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading && groups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">{tCommon('loading')}</td>
                    </tr>
                  ) : groups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">{t('noStoreGroups')}</td>
                    </tr>
                  ) : groups.map((group) => (
                    <tr key={group.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                        {group.description && (
                          <div className="mt-1 text-sm text-gray-500">{group.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {group.stores.length > 0
                          ? group.stores.map((store) => store.nickname || store.name).join(', ')
                          : <span className="text-xs text-gray-400">{t('noStores')}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={sourceStoreByGroup[group.id] || group.stores[0]?.id || ''}
                          onChange={(event) => setSourceStoreByGroup((current) => ({
                            ...current,
                            [group.id]: event.target.value,
                          }))}
                          disabled={group.stores.length === 0}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-gray-100"
                        >
                          {group.stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.nickname || store.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon-sm"
                            onClick={() => syncGroup(group)}
                            disabled={syncingGroupId === group.id || group.stores.length < 2}
                            title={t('actions.syncGroup')}
                            aria-label={t('actions.syncGroup')}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            onClick={() => editGroup(group)}
                            title={t('actions.edit')}
                            aria-label={t('actions.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(group)}
                            title={t('actions.delete')}
                            aria-label={t('actions.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            {isSuperAdmin ? t('emptySelectTenant') : t('emptyNoTenant')}
          </div>
        )}
      </section>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        message={t('deleteMsg', { name: deleteTarget?.name ?? '' })}
        confirmText={tCommon('delete')}
        cancelText={t('cancel')}
        variant="danger"
        loading={loading}
      />
    </AdminLayout>
  );
}

export default function StoreGroupsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <TenantProvider>
        <StoreGroupsContent />
      </TenantProvider>
    </ProtectedRoute>
  );
}
