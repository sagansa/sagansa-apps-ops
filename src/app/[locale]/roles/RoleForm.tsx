'use client';

import { useEffect, useState } from 'react';
import { useRoleContext } from '@/app/contexts/RoleContext';
import { ApiError, Role, PermissionModule } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';
import apiService from '@/app/services/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { useTranslations } from 'next-intl';

interface RoleFormProps {
  role: Role | null;
  onClose: () => void;
}

interface RoleFormState {
  name: string;
  selectedPermissions: string[];
}

type RoleFormErrors = Partial<Record<'name' | 'general', string>>;

const initialState: RoleFormState = {
  name: '',
  selectedPermissions: [],
};

export default function RoleForm({ role, onClose }: RoleFormProps) {
  const { createRole, updateRole, syncRolePermissions } = useRoleContext();
  const [formData, setFormData] = useState<RoleFormState>(initialState);
  const [errors, setErrors] = useState<RoleFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [permissionModules, setPermissionModules] = useState<PermissionModule[]>([]);
  const t = useTranslations('Team.roleForm');
  const tPerms = useTranslations('Team.rolePerms');
  const tCommon = useTranslations('Common');

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        selectedPermissions: role.permissions?.map(p => p.name) || [],
      });
    } else {
      setFormData(initialState);
    }
    setErrors({});
  }, [role]);

  const loadPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const response = await apiService.getAllPermissionsGrouped();
      setPermissionModules(response.permissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const clearError = (field: keyof RoleFormErrors) => {
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
    clearError(name as keyof RoleFormErrors);
  };

  const handlePermissionToggle = (permissionName: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedPermissions.includes(permissionName);
      return {
        ...prev,
        selectedPermissions: isSelected
          ? prev.selectedPermissions.filter(p => p !== permissionName)
          : [...prev.selectedPermissions, permissionName],
      };
    });
  };

  const validate = () => {
    const nextErrors: RoleFormErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = t('nameRequired');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const getPermissionDescription = (name: string) => {
    const descriptions: Record<string, string> = {
      'access-backoffice': tPerms('adminDesc'),
      'access-pos': tPerms('posDesc'),
      'access-attendance': tPerms('attendanceDesc'),
    };
    return descriptions[name];
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      if (role) {
        // Update role name
        await updateRole(role.id, { name: formData.name });

        // Sync permissions using context method which triggers refresh
        await syncRolePermissions(role.id, formData.selectedPermissions);
      } else {
        // Create role with permissions
        await createRole({
          name: formData.name,
          permissions: formData.selectedPermissions
        });
      }

      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        const fieldErrors: RoleFormErrors = {};
        const firstMessage = error.errors.name?.[0];
        if (firstMessage) {
          fieldErrors.name = firstMessage;
        }
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          return;
        }
      }

      setErrors({ general: getErrorMessage(error, t('failedSave')) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-h-[90vh] overflow-auto">
      <div className="flex items-center justify-between border-b pb-3 sticky top-0 bg-white z-10">
        <h3 className="text-lg font-medium text-gray-900">{role ? t('editTitle') : t('createTitle')}</h3>
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
          <Label htmlFor="name" className="mb-2">
            {t('roleName')}
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className={`${errors.name ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
            placeholder={t('roleNamePlaceholder')}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Permissions Section */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('permissions')}</h4>

          {loadingPermissions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">{t('loadingPermissions')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {permissionModules.map((module) => (
                <div key={module.module} className="space-y-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 border-b pb-1">
                    {module.module}
                  </h5>
                  <div className="grid gap-3 sm:grid-cols-1">
                    {module.permissions.map((permission) => (
                      <Label
                        key={permission.name}
                        htmlFor={permission.name}
                        className="flex items-start gap-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          id={permission.name}
                          checked={formData.selectedPermissions.includes(permission.name)}
                          onCheckedChange={() => handlePermissionToggle(permission.name)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium leading-none">
                            {permission.label}
                          </div>
                          {getPermissionDescription(permission.name) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {getPermissionDescription(permission.name)}
                            </p>
                          )}
                        </div>
                      </Label>
                    ))}
                  </div>
                </div>
              ))}

              {permissionModules.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {t('noPermissions')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:grid-flow-row-dense sticky bottom-0 bg-white pt-4 border-t">
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
            disabled={loading || loadingPermissions}
          // className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? t('saving') : role ? t('updateBtn') : t('createBtn')}
          </Button>
        </div>
      </form >
    </div >
  );
}
