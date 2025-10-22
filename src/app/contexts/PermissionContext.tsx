'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import apiService, { Permission } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';

interface PermissionContextType {
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  fetchPermissions: () => Promise<void>;
  createPermission: (permissionData: Partial<Permission>) => Promise<Permission | null>;
  updatePermission: (id: string, permissionData: Partial<Permission>) => Promise<Permission | null>;
  deletePermission: (id: string) => Promise<boolean>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getPermissions();
      if (response.success && Array.isArray(response.permissions)) {
        setPermissions(response.permissions as Permission[]);
      } else {
        setError(response.message || 'Failed to fetch permissions');
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'An error occurred while fetching permissions'));
    } finally {
      setLoading(false);
    }
  }, []);

  const createPermission = useCallback(
    async (permissionData: Partial<Permission>): Promise<Permission | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.createPermission(permissionData);
        if (response.success) {
          await fetchPermissions();
          return (response.permission ?? null) as Permission | null;
        }

        setError(response.message || 'Failed to create permission');
        return null;
      } catch (caughtError) {
        setError(getErrorMessage(caughtError, 'An error occurred while creating permission'));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchPermissions],
  );

  const updatePermission = useCallback(
    async (id: string, permissionData: Partial<Permission>): Promise<Permission | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.updatePermission(id, permissionData);
        if (response.success) {
          await fetchPermissions();
          return (response.permission ?? null) as Permission | null;
        }

        setError(response.message || 'Failed to update permission');
        return null;
      } catch (caughtError) {
        setError(getErrorMessage(caughtError, 'An error occurred while updating permission'));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchPermissions],
  );

  const deletePermission = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.deletePermission(id);
        if (response.success) {
          await fetchPermissions();
          return true;
        }

        setError(response.message || 'Failed to delete permission');
        return false;
      } catch (caughtError) {
        setError(getErrorMessage(caughtError, 'An error occurred while deleting permission'));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchPermissions],
  );

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        error,
        fetchPermissions,
        createPermission,
        updatePermission,
        deletePermission,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  return context;
}
