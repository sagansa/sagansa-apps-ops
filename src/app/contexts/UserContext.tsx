'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import apiService, { User, UserCreateInput, UserUpdateInput } from '@/app/services/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { getErrorMessage } from '@/app/utils/error';

interface UserContextType {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (userData: UserCreateInput) => Promise<User | null>;
  updateUser: (id: string, userData: UserUpdateInput) => Promise<User | null>;
  deleteUser: (id: string) => Promise<boolean>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser, isSuperAdmin } = useAuth();

  const projectUsersForTenant = useCallback(
    (incomingUsers: User[]): User[] => {
      if (isSuperAdmin || !currentUser) {
        return incomingUsers;
      }

      const allowedTenantIds = new Set<string>();

      if (currentUser.tenant?.id) {
        allowedTenantIds.add(currentUser.tenant.id);
      }

      currentUser.memberships.forEach((membership) => {
        allowedTenantIds.add(membership.tenant.id);
      });

      if (allowedTenantIds.size === 0) {
        return incomingUsers.map((user) => ({
          ...user,
          tenant: undefined,
          tenants: [],
          memberships: [],
        }));
      }

      const preferredRoles: Array<User['memberships'][number]['role']> = ['owner', 'admin', 'member'];

      return incomingUsers.map((user) => {
        const memberships = user.memberships.filter((membership) =>
          allowedTenantIds.has(membership.tenant.id),
        );

        const tenants = memberships.map((membership) => membership.tenant);

        const tenant = (() => {
          if (user.tenant && allowedTenantIds.has(user.tenant.id)) {
            return user.tenant;
          }

          const priorityMembership = preferredRoles
            .map((role) => memberships.find((membership) => membership.role === role))
            .find((membership) => membership);

          return priorityMembership?.tenant ?? memberships[0]?.tenant;
        })();

        return {
          ...user,
          tenant,
          tenants,
          memberships,
        };
      });
    },
    [currentUser, isSuperAdmin],
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getUsers();
      if (response.success) {
        const normalisedUsers = projectUsersForTenant(response.users as User[]);
        setUsers(normalisedUsers);
      } else {
        setError(response.message || 'Failed to fetch users');
      }
    } catch (error) {
      setError(getErrorMessage(error, 'An error occurred while fetching users'));
    } finally {
      setLoading(false);
    }
  }, [projectUsersForTenant]);

  const createUser = useCallback(async (userData: UserCreateInput): Promise<User | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.createUser(userData);
      if (response.success) {
        await fetchUsers();

        if (response.user) {
          const [userProjection] = projectUsersForTenant([response.user as User]);
          return userProjection ?? null;
        }

        return null;
      } else {
        setError(response.message || 'Failed to create user');
        return null;
      }
    } catch (error) {
      setError(getErrorMessage(error, 'An error occurred while creating user'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, projectUsersForTenant]);

  const updateUser = useCallback(async (id: string, userData: UserUpdateInput): Promise<User | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.updateUser(id, userData);
      if (response.success) {
        await fetchUsers();

        if (response.user) {
          const [userProjection] = projectUsersForTenant([response.user as User]);
          return userProjection ?? null;
        }

        return null;
      } else {
        setError(response.message || 'Failed to update user');
        return null;
      }
    } catch (error) {
      setError(getErrorMessage(error, 'An error occurred while updating user'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, projectUsersForTenant]);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.deleteUser(id);
      if (response.success) {
        await fetchUsers();
        return true;
      } else {
        setError(response.message || 'Failed to delete user');
        return false;
      }
    } catch (error) {
      setError(getErrorMessage(error, 'An error occurred while deleting user'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  return (
    <UserContext.Provider
      value={{
        users,
        loading,
        error,
        fetchUsers,
        createUser,
        updateUser,
        deleteUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
