'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Store, StoreInput, Tenant } from '@/app/services/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { TenantProvider, useTenantContext } from '@/app/contexts/TenantContext';
import { StoreProvider, useStoreContext } from '@/app/contexts/StoreContext';
import StoreForm from './StoreForm';
import { getErrorMessage } from '@/app/utils/error';
import { Button, ConfirmationDialog, Input } from '@/components/ui';
import { Plus, Pencil, Trash2, CreditCard, Search, QrCode } from 'lucide-react';
import MenuQrModal from '@/components/menu/MenuQrModal';

function StoresContent() {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const { tenants, fetchTenants, loading: tenantLoading } = useTenantContext();
  const {
    stores,
    fetchStores,
    createStore,
    updateStore,
    deleteStore,
    loading: storeLoading,
    error,
  } = useStoreContext();

  const router = useRouter();

  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeStore, setActiveStore] = useState<Store | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [qrStore, setQrStore] = useState<Store | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTenants();
    }
  }, [isSuperAdmin, fetchTenants]);

  useEffect(() => {
    if (!isSuperAdmin && currentUser?.tenant?.id) {
      setSelectedTenantId(currentUser.tenant.id);
      fetchStores(currentUser.tenant.id);
    }
  }, [isSuperAdmin, currentUser?.tenant?.id, fetchStores]);

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
      fetchStores(tenants[0].id);
    } else if (selectedTenantId) {
      fetchStores(selectedTenantId);
    }
  }, [isSuperAdmin, tenants, selectedTenantId, fetchStores]);

  const activeTenant: Tenant | undefined = useMemo(() => {
    if (isSuperAdmin) {
      return tenants.find((tenant) => tenant.id === selectedTenantId);
    }
    return currentUser?.tenant;
  }, [isSuperAdmin, tenants, selectedTenantId, currentUser?.tenant]);

  const openCreateModal = () => {
    setActiveStore(undefined);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (store: Store) => {
    setActiveStore(store);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeModal = () => {
    setIsFormOpen(false);
    setFormError(null);
  };

  const activeTenantId = activeTenant?.id;
  const getStoreDisplayName = (store: Store) => store.nickname?.trim() || store.name;

  const handleSubmit = async (payload: StoreInput) => {
    if (!activeTenantId) {
      setFormError('Select a tenant before adding stores.');
      throw new Error('Tenant not selected');
    }

    try {
      if (activeStore) {
        const result = await updateStore(activeTenantId, activeStore.id, payload);
        if (!result) {
          throw new Error('Unable to update store');
        }
      } else {
        const result = await createStore(activeTenantId, payload);
        if (!result) {
          throw new Error('Unable to create store');
        }
      }
      closeModal();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save store'));
      throw error;
    }
  };

  const handleDelete = (store: Store) => {
    if (!activeTenantId) {
      return;
    }

    setStoreToDelete(store);
  };

  const confirmDelete = async () => {
    if (!activeTenantId || !storeToDelete) {
      return;
    }

    await deleteStore(activeTenantId, storeToDelete.id);
    setStoreToDelete(null);
  };

  const filteredStores = useMemo(() => {
    const matcher = searchTerm.trim().toLowerCase();
    if (!matcher) {
      return stores;
    }
    return stores.filter((store) =>
      store.name.toLowerCase().includes(matcher) ||
      (store.nickname?.toLowerCase() || '').includes(matcher) ||
      (store.email?.toLowerCase() || '').includes(matcher)
    );
  }, [stores, searchTerm]);

  return (
    <AdminLayout>
      <div className="flex items-start justify-between pb-5 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Store Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage store locations for each tenant and keep details up to date.
          </p>
        </div>
        {activeTenantId && (
          <Button
            onClick={openCreateModal}
            aria-label="Add Store"
            title="Add Store"
          >
            <Plus className="h-4 w-4 mr-1" />
            Store
          </Button>
        )}
      </div>

      <section className="mt-6 space-y-4">
        {isSuperAdmin && (
          <div>
            <label htmlFor="tenant-select" className="block text-sm font-medium text-gray-700">
              Tenant
            </label>
            <select
              id="tenant-select"
              value={selectedTenantId}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedTenantId(value);
                if (value) {
                  fetchStores(value);
                }
              }}
              className="mt-1 block w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-gray-100"
              disabled={tenantLoading}
            >
              <option value="">Select tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        {activeTenantId && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search stores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {activeTenantId ? (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Store Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Nickname
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Radius (m)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Coordinates
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {storeLoading && filteredStores.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-transparent" />
                    </td>
                  </tr>
                ) : filteredStores.length > 0 ? (
                  filteredStores.map((store) => (
                    <tr key={store.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {getStoreDisplayName(store)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {store.nickname ?? <span className="text-xs text-gray-400">Not specified</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 space-y-1">
                        {store.no_telp ? <div>{store.no_telp}</div> : null}
                        {store.email ? <div>{store.email}</div> : null}
                        {!store.no_telp && !store.email ? (
                          <span className="text-xs text-gray-400">Not specified</span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {store.status
                          ? store.status.charAt(0).toUpperCase() + store.status.slice(1)
                          : <span className="text-xs text-gray-400">Not specified</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {store.radius !== null && store.radius !== undefined
                          ? store.radius
                          : <span className="text-xs text-gray-400">Not specified</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {store.latitude !== null && store.longitude !== null ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800"
                            title="Open in Google Maps"
                            aria-label={`Open ${store.latitude}, ${store.longitude} in Google Maps`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10z" />
                              <circle cx="12" cy="11" r="2" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Not specified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {store.created_at ? new Date(store.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="secondary"
                            size="icon-sm"
                            onClick={() => setQrStore(store)}
                            aria-label="Generate Store QR"
                            title="Generate Store QR"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon-sm"
                            onClick={() => router.push(`/stores/${store.id}/payment-methods`)}
                            aria-label="Payment Methods"
                            title="Payment Methods"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          <Button
                            // variant="info"
                            size="icon-sm"
                            onClick={() => openEditModal(store)}
                            aria-label="Edit Store"
                            title="Edit Store"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => handleDelete(store)}
                            aria-label="Delete Store"
                            title="Delete Store"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                      No stores registered for this tenant yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            {isSuperAdmin ? 'Select a tenant to view stores.' : 'Your tenant does not have any stores yet.'}
          </div>
        )}
      </section>

      <StoreForm
        tenantName={activeTenant?.name}
        store={activeStore}
        isOpen={isFormOpen}
        loading={storeLoading}
        onClose={closeModal}
        onSubmit={handleSubmit}
        error={formError}
      />

      <ConfirmationDialog
        isOpen={!!storeToDelete}
        onClose={() => setStoreToDelete(null)}
        onConfirm={confirmDelete}
        title="Konfirmasi Hapus Store"
        message={`Apakah Anda yakin ingin menghapus store "${storeToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        loading={storeLoading}
      />

      {activeTenantId && qrStore && (
        <MenuQrModal
          isOpen={!!qrStore}
          onClose={() => setQrStore(null)}
          tenantId={activeTenantId}
          storeId={qrStore.id}
          storeName={getStoreDisplayName(qrStore)}
          tableCode="STORE"
          title={`QR Store ${getStoreDisplayName(qrStore)}`}
        />
      )}
    </AdminLayout >
  );
}


export default function StoresPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <TenantProvider>
        <StoreProvider>
          <StoresContent />
        </StoreProvider>
      </TenantProvider>
    </ProtectedRoute>
  );
}
