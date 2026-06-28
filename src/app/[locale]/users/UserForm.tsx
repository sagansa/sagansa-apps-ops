'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUserContext } from '@/app/contexts/UserContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRoleContext } from '@/app/contexts/RoleContext';
import { useTenantContext } from '@/app/contexts/TenantContext';
import {
  ApiError,
  TenantMembershipRole,
  User,
  UserCreateInput,
  UserTenantMembership,
  UserUpdateInput,
} from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';
import { Button, Input, Select, Checkbox } from '@/components/ui/';
import { useTranslations } from 'next-intl';

interface UserFormProps {
  user: User | null;
  onClose: () => void;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

type UserFormErrorKey =
  | 'name'
  | 'email'
  | 'password'
  | 'password_confirmation'
  | 'tenant_id'
  | 'roles'
  | 'role'
  | 'membership_role'
  | 'general';

type UserFormErrors = Partial<Record<UserFormErrorKey, string>>;

const initialFormState: FormState = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
};

function findMembershipRole(memberships: UserTenantMembership[], tenantId: string | null): TenantMembershipRole {
  if (!tenantId) {
    return 'member';
  }

  const membership = memberships.find((entry) => entry.tenant.id === tenantId);
  return membership?.role ?? 'member';
}

export default function UserForm({ user, onClose }: UserFormProps) {
  const { createUser, updateUser } = useUserContext();
  const { roles, fetchRoles } = useRoleContext();
  const { tenants, fetchTenants } = useTenantContext();
  const { isAdmin, isSuperAdmin, user: currentUser } = useAuth();
  const t = useTranslations('Users');
  const tForm = useTranslations('Users.form');
  const tRoles = useTranslations('Users.roles');
  const tCommon = useTranslations('Common');
  const isEditing = Boolean(user);

  const MEMBERSHIP_ROLES = [
    { value: 'owner', label: tRoles('owner') },
    { value: 'admin', label: tRoles('tenantAdmin') },
    { value: 'member', label: tRoles('member') },
  ];

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [membershipRole, setMembershipRole] = useState<TenantMembershipRole>('member');

  const availableRoles = roles;

  const availableTenants = useMemo(() => tenants, [tenants]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
      });
      setSelectedRoleIds(user.roles.map((role) => role.id));
      const initialTenantId = user.tenant?.id ?? user.tenants[0]?.id ?? '';
      setSelectedTenantId(initialTenantId);
      setMembershipRole(findMembershipRole(user.memberships, initialTenantId));
    } else {
      setFormData(initialFormState);
      setSelectedRoleIds([]);
      const defaultTenantId = currentUser?.tenant?.id ?? '';
      setSelectedTenantId(defaultTenantId);
      setMembershipRole('member');
    }
    setErrors({});
  }, [user, currentUser?.tenant?.id]);

  useEffect(() => {
    if (!(isSuperAdmin || isAdmin)) {
      return;
    }

    if (availableRoles.length === 0) {
      fetchRoles();
    }

    if (isSuperAdmin && availableTenants.length === 0) {
      fetchTenants();
    }
  }, [fetchRoles, fetchTenants, isSuperAdmin, isAdmin, availableRoles.length, availableTenants.length]);

  const clearFieldError = (field: UserFormErrorKey) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    clearFieldError(name as UserFormErrorKey);
  };

  const handleTenantChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedTenantId(value);

    if (user) {
      setMembershipRole(findMembershipRole(user.memberships, value));
    } else {
      setMembershipRole('member');
    }

    clearFieldError('tenant_id');
  };

  const handleMembershipRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setMembershipRole(event.target.value as TenantMembershipRole);
    clearFieldError('role');
    clearFieldError('membership_role');
  };

  const toggleRoleSelection = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const exists = prev.includes(roleId);
      return exists ? prev.filter((id) => id !== roleId) : [...prev, roleId];
    });
    clearFieldError('roles');
  };

  const validateForm = () => {
    const newErrors: UserFormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = t('validation.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('validation.emailInvalid');
    }

    if (isSuperAdmin) {
      if (!formData.name.trim()) {
        newErrors.name = t('validation.nameRequired');
      }

      if (!user || formData.password) {
        if (!formData.password) {
          newErrors.password = t('validation.passwordRequired');
        } else if (formData.password.length < 8) {
          newErrors.password = tForm('passwordMinLength');
        }

        if (formData.password !== formData.password_confirmation) {
          newErrors.password_confirmation = t('validation.passwordsMismatch');
        }
      }

      if (!selectedTenantId) {
        newErrors.tenant_id = t('validation.tenantRequired');
      }

      if (!membershipRole) {
        newErrors.membership_role = t('validation.membershipRoleRequired');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (user) {
        const updatePayload: UserUpdateInput = {
          name: formData.name,
          email: formData.email,
        };
        if (isSuperAdmin) {
          if (formData.password) {
            updatePayload.password = formData.password;
            updatePayload.password_confirmation = formData.password_confirmation;
          }
          updatePayload.tenant_id = selectedTenantId || undefined;
          updatePayload.membership_role = membershipRole;
          const primaryRoleId = selectedRoleIds[0];
          const primaryRole = availableRoles.find((r) => r.id === primaryRoleId);
          if (primaryRole) {
            (updatePayload as Record<string, unknown>).role = primaryRole.name;
          }
        } else if (isAdmin) {
          const primaryRoleId = selectedRoleIds[0];
          const primaryRole = availableRoles.find((r) => r.id === primaryRoleId);
          if (primaryRole) {
            (updatePayload as Record<string, unknown>).role = primaryRole.name;
          }
        }

        await updateUser(user.id, updatePayload);
      } else {
        const createPayload: UserCreateInput = {
          email: formData.email,
        };

        if (isSuperAdmin) {
          createPayload.name = formData.name;
          createPayload.password = formData.password;
          createPayload.password_confirmation = formData.password_confirmation;
          createPayload.tenant_id = selectedTenantId || undefined;
          createPayload.role = membershipRole;
          const primaryRoleId = selectedRoleIds[0];
          const primaryRole = availableRoles.find((r) => r.id === primaryRoleId);
          if (primaryRole) {
            (createPayload as Record<string, unknown>).role = primaryRole.name;
          }
        } else if (isAdmin) {
          if (formData.name.trim()) {
            createPayload.name = formData.name.trim();
          }
          const primaryRoleId = selectedRoleIds[0];
          const primaryRole = availableRoles.find((r) => r.id === primaryRoleId);
          createPayload.role = primaryRole ? primaryRole.name : 'member';
        } else {
          if (formData.name.trim()) {
            createPayload.name = formData.name.trim();
          }
          createPayload.role = 'member';
        }

        await createUser(createPayload);
      }

      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        const fieldErrors: UserFormErrors = {};
        Object.entries(error.errors).forEach(([field, messages]) => {
          if (messages.length > 0) {
            fieldErrors[field as UserFormErrorKey] = messages[0];
          }
        });

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          return;
        }
      }

      setErrors({ general: getErrorMessage(error, tForm('failedSave')) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-lg font-medium text-gray-900">{user ? tForm('editTitle') : tForm('createTitle')}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <span className="sr-only">Close dialog</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {errors.general && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{errors.general}</div>
        )}

        {(isSuperAdmin || isEditing) && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              {tForm('name')}
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? 'border-red-300' : ''}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            {tForm('email')}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            className={errors.email ? 'border-red-300' : ''}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          {!isSuperAdmin && !isEditing && (
            <p className="mt-1 text-xs text-gray-500">
              {tForm('inviteNote')}
            </p>
          )}
        </div>

        {isSuperAdmin && (
          <>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {user ? tForm('newPasswordHint') : tForm('password')}
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'border-red-300' : ''}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700">
                {tForm('confirmPassword')}
              </label>
              <Input
                id="password_confirmation"
                name="password_confirmation"
                type="password"
                value={formData.password_confirmation}
                onChange={handleInputChange}
                className={errors.password_confirmation ? 'border-red-300' : ''}
              />
              {errors.password_confirmation && (
                <p className="mt-1 text-sm text-red-600">{errors.password_confirmation}</p>
              )}
            </div>
          </>
        )}

        {isSuperAdmin ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="tenant" className="block text-sm font-medium text-gray-700">
                {tForm('tenant')}
              </label>
              <Select
                id="tenant"
                name="tenant"
                value={selectedTenantId}
                onChange={handleTenantChange}
                className={errors.tenant_id ? 'border-red-300' : ''}
              >
                <option value="">{tForm('selectTenant')}</option>
                {availableTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </Select>
              {errors.tenant_id && <p className="mt-1 text-sm text-red-600">{errors.tenant_id}</p>}
            </div>

            <div>
              <label htmlFor="membership-role" className="block text-sm font-medium text-gray-700">
                {tForm('tenantRole')}
              </label>
              <Select
                id="membership-role"
                value={membershipRole}
                onChange={handleMembershipRoleChange}
                className={errors.role || errors.membership_role ? 'border-red-300' : ''}
              >
                {MEMBERSHIP_ROLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {(errors.role || errors.membership_role) && (
                <p className="mt-1 text-sm text-red-600">{errors.role ?? errors.membership_role}</p>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700">{tForm('roles')}</span>
              <div className="mt-2 space-y-2">
                {availableRoles.length === 0 ? (
                  <p className="text-sm text-gray-500">No roles available.</p>
                ) : (
                  availableRoles.map((role) => (
                    <label key={role.id} className="flex items-center text-sm text-gray-700">
                      <input
                        type="checkbox"
                        value={role.id}
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={() => toggleRoleSelection(role.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2">{role.name}</span>
                    </label>
                  ))
                )}
              </div>
              {errors.roles && <p className="mt-1 text-sm text-red-600">{errors.roles}</p>}
            </div>
          </div>
        ) : (
          <div>
            <span className="block text-sm font-medium text-gray-700">{tForm('tenant')}</span>
            <p className="mt-1 text-sm text-gray-900">{currentUser?.tenant?.name ?? '—'}</p>
            {isAdmin && (
              <div className="mt-4">
                <span className="block text-sm font-medium text-gray-700">{tForm('roles')}</span>
                <div className="mt-2 space-y-2">
                  {availableRoles.length === 0 ? (
                    <p className="text-sm text-gray-500">{tForm('noRoles')}</p>
                  ) : (
                    availableRoles.map((role) => (
                      <label key={role.id} className="flex items-center text-sm text-gray-700">
                        <input
                          type="checkbox"
                          value={role.id}
                          checked={selectedRoleIds.includes(role.id)}
                          onChange={() => toggleRoleSelection(role.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2">{role.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {errors.roles && <p className="mt-1 text-sm text-red-600">{errors.roles}</p>}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 sm:grid-flow-row-dense">
          <Button type="submit" disabled={loading}>
            {loading ? tForm('saving') : user ? tForm('updateBtn') : tForm('createBtn')}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {tCommon('cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
