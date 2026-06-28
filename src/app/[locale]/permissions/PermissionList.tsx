'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePermissionContext } from '@/app/contexts/PermissionContext';
import PermissionForm from './PermissionForm';
import { Permission } from '@/app/services/api';
import { Button, ConfirmationDialog } from '@/components/ui';
import { useTranslations, useLocale } from 'next-intl';

export default function PermissionList() {
  const { permissions, loading, error, fetchPermissions, deletePermission } = usePermissionContext();
  const [showForm, setShowForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const t = useTranslations('Permissions');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingPermission(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPermission(null);
  };

  const handleDelete = (permission: Permission) => {
    setPermissionToDelete(permission);
  };

  const confirmDelete = async () => {
    if (!permissionToDelete) return;

    await deletePermission(permissionToDelete.id);
    setPermissionToDelete(null);
  };

  const filteredPermissions = useMemo(() => {
    const matcher = searchTerm.trim().toLowerCase();
    if (!matcher) {
      return permissions;
    }
    return permissions.filter((permission) =>
      permission.name.toLowerCase().includes(matcher),
    );
  }, [permissions, searchTerm]);

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
      <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{t('title')}</h3>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {t('addBtn')}
        </button>
      </div>

      <div className="mt-4">
        <div className="flex justify-between">
          <div className="relative rounded-md shadow-sm w-64">
            <input
              type="text"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 py-2 sm:text-sm border-gray-300 rounded-md"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
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
                      {t('table.rolesCount')}
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
                  {filteredPermissions.map((permission, index) => (
                    <tr key={`${permission.id}-${permission.name}-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">0</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(permission.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(permission)}
                          className="mr-4"
                        >
                          {tCommon('edit')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(permission)}
                        >
                          {tCommon('delete')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <PermissionForm
              permission={editingPermission}
              onClose={handleCloseForm}
            />
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!permissionToDelete}
        onClose={() => setPermissionToDelete(null)}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        message={t('deleteConfirmMsg', { name: permissionToDelete?.name ?? '' })}
        confirmText={t('deleteConfirm')}
        cancelText={t('cancel')}
        variant="danger"
        loading={loading}
      />
    </div>
  );
}
