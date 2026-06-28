'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRoleContext } from '@/app/contexts/RoleContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { Input } from '@/components/ui';
import { Search } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const GENERATED_ROLE_NAMES = ['manager', 'kasir', 'support'];

export default function RoleList() {
  const { roles, loading, error, fetchRoles } = useRoleContext();
  const { isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const t = useTranslations('Team');
  const locale = useLocale();

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const filteredRoles = useMemo(() => {
    const matcher = searchTerm.trim().toLowerCase();
    if (!matcher) {
      return roles;
    }
    return roles.filter((role) => role.name.toLowerCase().includes(matcher));
  }, [roles, searchTerm]);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-3xl font-bold text-gray-900">{t('rolesTitle')}</h3>
          <p className="mt-1 text-sm text-gray-700">
            {t('rolesSubtitle')}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              className="pl-10"
              placeholder={t('searchRoles')}
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
                    {isSuperAdmin && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('tenantCol')}
                      </th>
                    )}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.permissions')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.createdAt')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRoles.map((role) => {
                    const isGeneratedRole = GENERATED_ROLE_NAMES.includes(role.name);

                    return (
                      <tr key={role.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">{role.name}</div>
                            {isGeneratedRole && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                {t('autoBadge')}
                              </span>
                            )}
                          </div>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {role.tenant?.name || '-'}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {Array.isArray(role.permissions)
                              ? role.permissions.map(p => p.name).join(', ')
                              : t('noPermissions')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(role.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID')}
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

    </div>
  );
}
