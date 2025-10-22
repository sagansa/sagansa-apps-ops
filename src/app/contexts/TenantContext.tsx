'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import apiService, { Tenant, TenantInput, TenantUpdateInput } from '@/app/services/api';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'An unexpected error occurred';

interface TenantContextType {
  tenants: Tenant[];
  loading: boolean;
  error: string | null;
  fetchTenants: () => Promise<void>;
  createTenant: (tenantData: TenantInput) => Promise<Tenant | null>;
  updateTenant: (id: string, tenantData: TenantUpdateInput) => Promise<Tenant | null>;
  deleteTenant: (id: string) => Promise<boolean>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getTenants();
      if (response.success && Array.isArray(response.tenants)) {
        setTenants(response.tenants as Tenant[]);
      } else {
        setError(response.message || 'Failed to fetch tenants');
      }
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const createTenant = useCallback(async (tenantData: TenantInput): Promise<Tenant | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.createTenant(tenantData);
      if (response.success) {
        await fetchTenants();
        return response.tenant as Tenant;
      } else {
        setError(response.message || 'Failed to create tenant');
        return null;
      }
    } catch (error) {
      setError(getErrorMessage(error));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchTenants]);

  const updateTenant = useCallback(async (id: string, tenantData: TenantUpdateInput): Promise<Tenant | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.updateTenant(id, tenantData);
      if (response.success) {
        await fetchTenants();
        return response.tenant as Tenant;
      } else {
        setError(response.message || 'Failed to update tenant');
        return null;
      }
    } catch (error) {
      setError(getErrorMessage(error));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchTenants]);

  const deleteTenant = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.deleteTenant(id);
      if (response.success) {
        await fetchTenants();
        return true;
      } else {
        setError(response.message || 'Failed to delete tenant');
        return false;
      }
    } catch (error) {
      setError(getErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchTenants]);

  return (
    <TenantContext.Provider
      value={{
        tenants,
        loading,
        error,
        fetchTenants,
        createTenant,
        updateTenant,
        deleteTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
}
