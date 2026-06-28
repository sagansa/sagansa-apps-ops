'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUserContext } from '@/app/contexts/UserContext';
import { useTenantContext } from '@/app/contexts/TenantContext';
import { useAuth } from '@/app/contexts/AuthContext';
import UserForm from './UserForm';
import PermissionModal from './PermissionModal';
import TenantForm from './TenantForm';
import { User, Tenant, TenantInput, TenantUpdateInput } from '@/app/services/api';
import { Button, ConfirmationDialog, Input } from '@/components/ui';
import { Plus, Pencil, Trash2, Shield, Building2, Search } from 'lucide-react';
import { getErrorMessage } from '@/app/utils/error';
import { useTranslations, useLocale } from 'next-intl';

export default function UserList() {
  const { users, loading, error, fetchUsers, deleteUser, toggleUserStatus } = useUserContext();
  const { tenants, createTenant, updateTenant, loading: tenantLoading } = useTenantContext();
  const { can, isSuperAdmin } = useAuth();
  const t = useTranslations('Users');
  const tTenant = useTranslations('Tenants.form');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionUser, setPermissionUser] = useState<User | null>(null);

  // Tenant management state
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | undefined>(undefined);
  const [tenantFormError, setTenantFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Tenant handlers
  const handleCreateTenant = () => {
    setEditingTenant(undefined);
    setTenantFormError(null);
    setShowTenantForm(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setTenantFormError(null);
    setShowTenantForm(true);
  };

  const handleCloseTenantForm = () => {
    setShowTenantForm(false);
    setTenantFormError(null);
  };

  const handleTenantSubmit = async (payload: TenantInput | TenantUpdateInput) => {
    setTenantFormError(null);
    try {
      if (editingTenant) {
        await updateTenant(editingTenant.id, payload);
      } else {
        await createTenant(payload as TenantInput);
      }
      await fetchUsers(); // Refresh to get updated tenants
      handleCloseTenantForm();
    } catch (error) {
      setTenantFormError(getErrorMessage(error, tTenant('failedSave')));
      throw error;
    }
  };

  // Get available owners (users not yet owning a tenant)
  const usedOwnerIds = useMemo(() => {
    const ids = new Set<string>();
    tenants.forEach((tenant) => {
      if (tenant.owner?.id) {
        ids.add(tenant.owner.id);
      }
    });
    return ids;
  }, [tenants]);

  const availableOwners = useMemo(() => {
    return users.filter((user) => {
      if (editingTenant?.owner?.id === user.id) {
        return true;
      }
      return !usedOwnerIds.has(user.id);
    });
  }, [users, usedOwnerIds, editingTenant?.owner?.id]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    await deleteUser(userToDelete.id);
    setUserToDelete(null);
  };

  const filteredUsers = useMemo(() => {
    const matcher = searchTerm.trim().toLowerCase();
    if (!matcher) {
      return users;
    }

    return users.filter((candidate) => {
      const matchesName = candidate.name.toLowerCase().includes(matcher);
      const matchesEmail = candidate.email.toLowerCase().includes(matcher);
      const matchesPrimaryTenant = candidate.tenant?.name?.toLowerCase().includes(matcher);
      const matchesMembership = candidate.memberships.some((membership) =>
        membership.tenant.name.toLowerCase().includes(matcher),
      );

      return matchesName || matchesEmail || matchesPrimaryTenant || matchesMembership;
    });
  }, [searchTerm, users]);

  // Only super-admin can access this page
  if (!isSuperAdmin) {
    return (
      <div className="rounded-md bg-yellow-50 p-4">
        <div className="text-sm text-yellow-700">
          {t('superAdminOnly')}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pb-5 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{t('title')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              className="pl-10"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.name')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.email')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.ownedTenants')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.status')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.lastAccess')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.createdAt')}
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    // Get owned tenants (where user is owner)
                    const ownedTenants = user.memberships.filter(m => m.role === 'owner');
                    const isActive = user.is_active ?? true;

                    // Format last access
                    const lastAccess = user.last_active_at
                      ? new Date(user.last_active_at).toLocaleString(locale === 'en' ? 'en-US' : 'id-ID', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })
                      : t('table.never');

                    return (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          {ownedTenants.length > 0 ? (
                            <div className="space-y-1">
                              {ownedTenants.map((membership, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-sm text-gray-900">{membership.tenant.name}</span>
                                  {membership.tenant.operation_mode === 'foodcourt' && (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                      Foodcourt
                                    </span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleEditTenant(membership.tenant)}
                                    aria-label={t('editTenant')}
                                    title={t('editTenant')}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {isActive ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lastAccess}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant={isActive ? "destructive" : "default"}
                            size="sm"
                            onClick={() => toggleUserStatus(user.id)}
                            disabled={loading}
                          >
                            {isActive ? t('disable') : t('enable')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <UserForm
              user={editingUser}
              onClose={handleCloseForm}
            />
          </div>
        </div>
      )}

      {permissionUser && (
        <PermissionModal
          user={permissionUser}
          tenantId={permissionUser.tenant?.id || ''}
          onClose={() => setPermissionUser(null)}
          onSave={() => {
            fetchUsers();
            setPermissionUser(null);
          }}
        />
      )}

      <ConfirmationDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        message={t('deleteMsg', { name: userToDelete?.name ?? '' })}
        confirmText={t('deleteConfirm')}
        cancelText={tCommon('cancel')}
        variant="danger"
        loading={loading}
      />

      <TenantForm
        tenant={editingTenant}
        users={availableOwners}
        isOpen={showTenantForm}
        loading={tenantLoading}
        onClose={handleCloseTenantForm}
        onSubmit={handleTenantSubmit}
        error={tenantFormError}
      />
    </div>
  );
}
