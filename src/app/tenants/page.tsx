'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { Tenant, TenantInput, TenantUpdateInput, User } from '@/app/services/api';
import { useTenantContext, TenantProvider } from '@/app/contexts/TenantContext';
import { useUserContext, UserProvider } from '@/app/contexts/UserContext';
import { useAuth } from '@/app/contexts/AuthContext';
import TenantForm from './TenantForm';
import { getErrorMessage } from '@/app/utils/error';

function TenantsContent() {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const { tenants, fetchTenants, createTenant, updateTenant, loading, error } = useTenantContext();
  const { users, fetchUsers } = useUserContext();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTenant, setActiveTenant] = useState<Tenant | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTenants();
      fetchUsers();
    }
  }, [isSuperAdmin, fetchTenants, fetchUsers]);

  const displayedTenants: Tenant[] = useMemo(() => {
    if (isSuperAdmin) {
      return tenants;
    }
    return currentUser?.tenant ? [currentUser.tenant] : [];
  }, [isSuperAdmin, tenants, currentUser?.tenant]);

  const usedOwnerIds = useMemo(() => {
    const ids = new Set<string>();
    tenants.forEach((tenant) => {
      if (tenant.owner?.id) {
        ids.add(tenant.owner.id);
      }
    });
    return ids;
  }, [tenants]);

  const availableOwners: User[] = useMemo(() => {
    if (!isSuperAdmin) {
      return [];
    }

    return users.filter((user) => {
      if (activeTenant?.owner?.id === user.id) {
        return true;
      }
      return !usedOwnerIds.has(user.id);
    });
  }, [users, usedOwnerIds, activeTenant?.owner?.id, isSuperAdmin]);

  const openCreateModal = () => {
    setActiveTenant(undefined);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (tenant: Tenant) => {
    setActiveTenant(tenant);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeModal = () => {
    setIsFormOpen(false);
    setFormError(null);
  };

  const handleSubmit = async (payload: TenantInput | TenantUpdateInput) => {
    setFormError(null);

    try {
      if (activeTenant) {
        const result = await updateTenant(activeTenant.id, payload);
        if (!result) {
          throw new Error('Unable to update tenant');
        }
      } else {
        const result = await createTenant(payload as TenantInput);
        if (!result) {
          throw new Error('Unable to create tenant');
        }
      }
      closeModal();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to persist tenant'));
      throw error;
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-start justify-between pb-5 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tenant Directory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review tenant ownership, store coverage, and assigned administrators.
          </p>
        </div>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            New Tenant
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mt-6">
        {loading && displayedTenants.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-transparent" />
          </div>
        ) : displayedTenants.length > 0 ? (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tenant
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Owner
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Users
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Stores
                  </th>
                  {isSuperAdmin && (
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {displayedTenants.map((tenant) => (
                  <tr key={tenant.id}
                      className="align-top">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-semibold text-gray-900">{tenant.name}</div>
                      {tenant.stores && tenant.stores.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-gray-500">Stores</p>
                          <div className="flex flex-wrap gap-2">
                            {tenant.stores.map((store) => (
                              <span
                                key={store.id}
                                className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                              >
                                {store.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tenant.owner ? (
                        <div>
                          <div className="font-medium text-gray-900">{tenant.owner.name}</div>
                          <div className="text-xs text-gray-500">{tenant.owner.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tenant.users_count ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tenant.stores?.length ?? 0}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => openEditModal(tenant)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            {isSuperAdmin
              ? 'No tenants found. Create one to get started.'
              : 'Your tenant information is not available yet.'}
          </div>
        )}
      </section>

      {isSuperAdmin && (
        <TenantForm
          tenant={activeTenant}
          users={availableOwners}
          isOpen={isFormOpen}
          loading={loading}
          onClose={closeModal}
          onSubmit={handleSubmit}
          error={formError}
        />
      )}
    </AdminLayout>
  );
}

export default function TenantsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <UserProvider>
        <TenantProvider>
          <TenantsContent />
        </TenantProvider>
      </UserProvider>
    </ProtectedRoute>
  );
}
