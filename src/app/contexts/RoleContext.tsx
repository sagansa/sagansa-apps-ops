'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import apiService, { Role } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';

interface RoleContextType {
  roles: Role[];
  loading: boolean;
  error: string | null;
  fetchRoles: () => Promise<void>;
  createRole: (roleData: Partial<Role>) => Promise<Role | null>;
  updateRole: (id: string, roleData: Partial<Role>) => Promise<Role | null>;
  deleteRole: (id: string) => Promise<boolean>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getRoles();
      if (response.success && Array.isArray(response.roles)) {
        setRoles(response.roles.map((role: Role) => ({
          ...role,
          permissions: Array.isArray(role.permissions) ? role.permissions : [],
        })));
      } else {
        setError(response.message || 'Failed to fetch roles');
      }
    } catch (error) {
      setError(getErrorMessage(error, 'An error occurred while fetching roles'));
    } finally {
      setLoading(false);
    }
  }, []);

  const createRole = useCallback(async (roleData: Partial<Role>): Promise<Role | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.createRole(roleData);
      if (response.success) {
        await fetchRoles();
        return response.role;
      } else {
        setError(response.message || 'Failed to create role');
        return null;
      }
    } catch (error) {
      setError(getErrorMessage(error, 'An error occurred while creating role'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchRoles]);

  const updateRole = useCallback(async (id: string, roleData: Partial<Role>): Promise<Role | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.updateRole(id, roleData);
      if (response.success) {
        await fetchRoles();
        return response.role;
      } else {
        setError(response.message || 'Failed to update role');
        return null;
      }
    } catch (error) {
      setError(getErrorMessage(error, 'An error occurred while updating role'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchRoles]);

  const deleteRole = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.deleteRole(id);
      if (response.success) {
        await fetchRoles();
        return true;
      } else {
        setError(response.message || 'Failed to delete role');
        return false;
      }
    } catch (error) {
      setError(getErrorMessage(error, 'An error occurred while deleting role'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchRoles]);

  return (
    <RoleContext.Provider
      value={{
        roles,
        loading,
        error,
        fetchRoles,
        createRole,
        updateRole,
        deleteRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRoleContext() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRoleContext must be used within a RoleProvider');
  }
  return context;
}
