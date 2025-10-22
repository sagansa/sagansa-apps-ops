'use client';

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import apiService, { Store, StoreInput } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';

interface StoreContextType {
  stores: Store[];
  loading: boolean;
  error: string | null;
  currentTenantId: string | null;
  fetchStores: (tenantId: string) => Promise<void>;
  createStore: (tenantId: string, storeData: StoreInput) => Promise<Store | null>;
  updateStore: (tenantId: string, storeId: string, storeData: StoreInput) => Promise<Store | null>;
  deleteStore: (tenantId: string, storeId: string) => Promise<boolean>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  const fetchStores = useCallback(async (tenantId: string) => {
    setLoading(true);
    setError(null);
    setCurrentTenantId(tenantId);

    try {
      const response = await apiService.getTenantStores(tenantId);
      if (response.success && Array.isArray(response.stores)) {
        setStores(response.stores as Store[]);
      } else {
        setError(response.message || 'Failed to fetch stores');
        setStores([]);
      }
    } catch (error) {
      setError(getErrorMessage(error));
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createStore = useCallback(
    async (tenantId: string, storeData: StoreInput): Promise<Store | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.createStore(tenantId, storeData);
        if (response.success) {
          await fetchStores(tenantId);
          return response.store as Store;
        }

        setError(response.message || 'Failed to create store');
        return null;
      } catch (error) {
        setError(getErrorMessage(error));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchStores],
  );

  const updateStore = useCallback(
    async (tenantId: string, storeId: string, storeData: StoreInput): Promise<Store | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.updateStore(tenantId, storeId, storeData);
        if (response.success) {
          await fetchStores(tenantId);
          return response.store as Store;
        }

        setError(response.message || 'Failed to update store');
        return null;
      } catch (error) {
        setError(getErrorMessage(error));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchStores],
  );

  const deleteStore = useCallback(
    async (tenantId: string, storeId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.deleteStore(tenantId, storeId);
        if (response.success) {
          await fetchStores(tenantId);
          return true;
        }

        setError(response.message || 'Failed to delete store');
        return false;
      } catch (error) {
        setError(getErrorMessage(error));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchStores],
  );

  return (
    <StoreContext.Provider
      value={{
        stores,
        loading,
        error,
        currentTenantId,
        fetchStores,
        createStore,
        updateStore,
        deleteStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStoreContext must be used within a StoreProvider');
  }
  return context;
}
