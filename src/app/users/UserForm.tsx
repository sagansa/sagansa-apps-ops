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

const membershipOptions: { value: TenantMembershipRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Tenant Admin' },
  { value: 'member', label: 'Member' },
];

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
  const { isSuperAdmin, user: currentUser } = useAuth();
  const isEditing = Boolean(user);

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
    if (!isSuperAdmin) {
      return;
    }

    if (availableRoles.length === 0) {
      fetchRoles();
    }

    if (availableTenants.length === 0) {
      fetchTenants();
    }
  }, [fetchRoles, fetchTenants, isSuperAdmin, availableRoles.length, availableTenants.length]);

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
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (isSuperAdmin) {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }

      if (!user || formData.password) {
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }

        if (formData.password !== formData.password_confirmation) {
          newErrors.password_confirmation = 'Passwords do not match';
        }
      }

      if (!selectedTenantId) {
        newErrors.tenant_id = 'Tenant selection is required';
      }

      if (!membershipRole) {
        newErrors.membership_role = 'Membership role is required';
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
          updatePayload.roles = selectedRoleIds;
          updatePayload.tenant_id = selectedTenantId || undefined;
          updatePayload.membership_role = membershipRole;
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
          createPayload.roles = selectedRoleIds;
          createPayload.tenant_id = selectedTenantId || undefined;
          createPayload.role = membershipRole;
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

      setErrors({ general: getErrorMessage(error, 'Failed to save user') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-lg font-medium text-gray-900">{user ? 'Edit User' : 'Create User'}</h3>
        <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-500">
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

        {(isSuperAdmin || isEditing) && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className={`mt-1 block w-full rounded-md border ${errors.name ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border ${errors.email ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500`}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          {!isSuperAdmin && !isEditing && (
            <p className="mt-1 text-xs text-gray-500">
              An invitation email will be sent to this address so the user can finish registration and set their password.
            </p>
          )}
        </div>

        {isSuperAdmin && (
          <>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {user ? 'New Password (leave blank to keep current)' : 'Password'}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md border ${errors.password ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500`}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="password_confirmation"
                name="password_confirmation"
                type="password"
                value={formData.password_confirmation}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md border ${errors.password_confirmation ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500`}
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
                Tenant
              </label>
              <select
                id="tenant"
                name="tenant"
                value={selectedTenantId}
                onChange={handleTenantChange}
                className={`mt-1 block w-full rounded-md border ${errors.tenant_id ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500`}
              >
                <option value="">Select tenant</option>
                {availableTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              {errors.tenant_id && <p className="mt-1 text-sm text-red-600">{errors.tenant_id}</p>}
            </div>

            <div>
              <label htmlFor="membership-role" className="block text-sm font-medium text-gray-700">
                Tenant Membership Role
              </label>
              <select
                id="membership-role"
                value={membershipRole}
                onChange={handleMembershipRoleChange}
                className={`mt-1 block w-full rounded-md border ${errors.role || errors.membership_role ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500`}
              >
                {membershipOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {(errors.role || errors.membership_role) && (
                <p className="mt-1 text-sm text-red-600">{errors.role ?? errors.membership_role}</p>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700">Roles</span>
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
            <span className="block text-sm font-medium text-gray-700">Tenant</span>
            <p className="mt-1 text-sm text-gray-900">{currentUser?.tenant?.name ?? '—'}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 sm:grid-flow-row-dense">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
