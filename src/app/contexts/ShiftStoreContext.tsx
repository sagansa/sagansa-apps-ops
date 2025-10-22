'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import apiService, { ShiftStore, ShiftStoreInput } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';

interface ShiftStoreContextType {
  shiftStores: ShiftStore[];
  loading: boolean;
  error: string | null;
  currentTenantId: string | null;
  fetchShiftStores: (tenantId: string) => Promise<void>;
  createShiftStore: (tenantId: string, data: ShiftStoreInput) => Promise<ShiftStore | null>;
  updateShiftStore: (
    tenantId: string,
    shiftStoreId: string,
    data: ShiftStoreInput,
  ) => Promise<ShiftStore | null>;
  deleteShiftStore: (tenantId: string, shiftStoreId: string) => Promise<boolean>;
}

const ShiftStoreContext = createContext<ShiftStoreContextType | undefined>(undefined);

export function ShiftStoreProvider({ children }: { children: ReactNode }) {
  const [shiftStores, setShiftStores] = useState<ShiftStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  const fetchShiftStores = useCallback(async (tenantId: string) => {
    setLoading(true);
    setError(null);
    setCurrentTenantId(tenantId);

    try {
      const response = await apiService.getTenantShiftStores(tenantId);
      if (response.success && Array.isArray(response.shift_stores)) {
        setShiftStores(response.shift_stores as ShiftStore[]);
      } else {
        setError(response.message || 'Failed to fetch shift schedules');
        setShiftStores([]);
      }
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
      setShiftStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createShiftStore = useCallback(
    async (tenantId: string, data: ShiftStoreInput): Promise<ShiftStore | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.createShiftStore(tenantId, data);
        if (response.success) {
          await fetchShiftStores(tenantId);
          return response.shift_store as ShiftStore;
        }

        setError(response.message || 'Failed to create shift');
        return null;
      } catch (createError) {
        setError(getErrorMessage(createError));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchShiftStores],
  );

  const updateShiftStore = useCallback(
    async (tenantId: string, shiftStoreId: string, data: ShiftStoreInput): Promise<ShiftStore | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.updateShiftStore(tenantId, shiftStoreId, data);
        if (response.success) {
          await fetchShiftStores(tenantId);
          return response.shift_store as ShiftStore;
        }

        setError(response.message || 'Failed to update shift');
        return null;
      } catch (updateError) {
        setError(getErrorMessage(updateError));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchShiftStores],
  );

  const deleteShiftStore = useCallback(
    async (tenantId: string, shiftStoreId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.deleteShiftStore(tenantId, shiftStoreId);
        if (response.success) {
          await fetchShiftStores(tenantId);
          return true;
        }

        setError(response.message || 'Failed to delete shift');
        return false;
      } catch (deleteError) {
        setError(getErrorMessage(deleteError));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchShiftStores],
  );

  return (
    <ShiftStoreContext.Provider
      value={{
        shiftStores,
        loading,
        error,
        currentTenantId,
        fetchShiftStores,
        createShiftStore,
        updateShiftStore,
        deleteShiftStore,
      }}
    >
      {children}
    </ShiftStoreContext.Provider>
  );
}

export function useShiftStoreContext() {
  const context = useContext(ShiftStoreContext);
  if (context === undefined) {
    throw new Error('useShiftStoreContext must be used within a ShiftStoreProvider');
  }
  return context;
}
