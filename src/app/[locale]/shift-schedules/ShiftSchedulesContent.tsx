'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useTenantContext } from '@/app/contexts/TenantContext';
import { useShiftStoreContext } from '@/app/contexts/ShiftStoreContext';
import { ShiftStore, ShiftStoreInput, Tenant } from '@/app/services/api';
import ShiftStoreForm from './ShiftStoreForm';
import { getErrorMessage } from '@/app/utils/error';
import { Button, ConfirmationDialog } from '@/components/ui';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const formatDuration = (minutes: number): string => {
    if (!Number.isFinite(minutes)) {
        return '--';
    }

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    const parts: string[] = [];
    if (hours) {
        parts.push(`${hours}h`);
    }
    if (remaining || parts.length === 0) {
        parts.push(`${remaining}m`);
    }

    return parts.join(' ');
};

export default function ShiftSchedulesContent() {
    const { isSuperAdmin, user: currentUser } = useAuth();
    const t = useTranslations('Shifts.schedules');
    const tCommon = useTranslations('Common');
    const { tenants, fetchTenants, loading: tenantLoading } = useTenantContext();
    const {
        shiftStores,
        fetchShiftStores,
        createShiftStore,
        updateShiftStore,
        deleteShiftStore,
        loading: shiftLoading,
        error,
        currentTenantId,
    } = useShiftStoreContext();

    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [activeShiftStore, setActiveShiftStore] = useState<ShiftStore | undefined>(undefined);
    const [formError, setFormError] = useState<string | null>(null);
    const [shiftToDelete, setShiftToDelete] = useState<ShiftStore | null>(null);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchTenants();
        }
    }, [isSuperAdmin, fetchTenants]);

    const availableTenants: Tenant[] = useMemo(() => {
        if (isSuperAdmin) {
            return tenants;
        }

        if (!currentUser) {
            return [];
        }

        const managedTenants = currentUser.memberships
            .filter((membership) => membership.role === 'owner' || membership.role === 'admin')
            .map((membership) => membership.tenant);

        const candidates = [currentUser.tenant, ...managedTenants].filter(
            (tenantCandidate): tenantCandidate is Tenant => Boolean(tenantCandidate),
        );

        const uniqueById = new Map<string, Tenant>();
        candidates.forEach((tenantOption) => {
            uniqueById.set(tenantOption.id, tenantOption);
        });

        return Array.from(uniqueById.values());
    }, [currentUser, isSuperAdmin, tenants]);

    useEffect(() => {
        if (availableTenants.length === 0) {
            return;
        }

        const selectionIsValid = selectedTenantId
            ? availableTenants.some((tenant) => tenant.id === selectedTenantId)
            : false;

        const tenantId = selectionIsValid ? selectedTenantId : availableTenants[0].id;

        if (!selectionIsValid && tenantId !== selectedTenantId) {
            setSelectedTenantId(tenantId);
        }

        if (tenantId && currentTenantId !== tenantId) {
            fetchShiftStores(tenantId);
        }
    }, [availableTenants, selectedTenantId, currentTenantId, fetchShiftStores]);

    const activeTenant: Tenant | undefined = useMemo(() => {
        if (isSuperAdmin) {
            return tenants.find((tenant) => tenant.id === selectedTenantId);
        }

        if (!currentUser) {
            return undefined;
        }

        return availableTenants.find((tenant) => tenant.id === selectedTenantId) ?? undefined;
    }, [isSuperAdmin, tenants, selectedTenantId, currentUser, availableTenants]);

    const activeTenantId = activeTenant?.id ?? '';

    const openCreateModal = () => {
        setActiveShiftStore(undefined);
        setFormError(null);
        setIsFormOpen(true);
    };

    const openEditModal = (shift: ShiftStore) => {
        setActiveShiftStore(shift);
        setFormError(null);
        setIsFormOpen(true);
    };

    const closeModal = () => {
        setIsFormOpen(false);
        setFormError(null);
    };

    const handleSubmit = async (payload: ShiftStoreInput) => {
        if (!activeTenantId) {
            setFormError('Select a tenant before adding shifts.');
            throw new Error('Tenant not selected');
        }

        try {
            let result;
            if (activeShiftStore) {
                result = await updateShiftStore(activeTenantId, activeShiftStore.id, payload);
            } else {
                result = await createShiftStore(activeTenantId, payload);
            }

            if (result) {
                closeModal();
            } else {
                return;
            }
        } catch (error) {
            setFormError(getErrorMessage(error, 'Failed to save shift'));
            throw error;
        }
    };

    const handleDelete = (shift: ShiftStore) => {
        if (!activeTenantId) {
            return;
        }

        setShiftToDelete(shift);
    };

    const confirmDelete = async () => {
        if (!activeTenantId || !shiftToDelete) {
            return;
        }

        await deleteShiftStore(activeTenantId, shiftToDelete.id);
        setShiftToDelete(null);
    };

    return (
        <div className="h-full">
            <div className="flex items-start justify-between pb-5 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {t('subtitle')}
                    </p>
                </div>
                {activeTenantId && (
                    <Button
                        onClick={openCreateModal}
                        // size="icon-sm"
                        aria-label={t('addTitle')}
                        title={t('addTitle')}
                    >
                        <Plus className="h-4 w-4" />
                        {t('addBtn')}
                    </Button>
                )}
            </div>

            <section className="mt-6 space-y-4">
                {isSuperAdmin && (
                    <div>
                        <label htmlFor="tenant-select" className="block text-sm font-medium text-gray-700">
                            {t('tenant')}
                        </label>
                        <select
                            id="tenant-select"
                            value={selectedTenantId}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSelectedTenantId(value);
                                if (value) {
                                    fetchShiftStores(value);
                                }
                            }}
                            className="mt-1 block w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-gray-100"
                            disabled={tenantLoading}
                        >
                            <option value="">{t('selectTenant')}</option>
                            {tenants.map((tenant) => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {error && (
                    <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
                )}

                {activeTenantId ? (
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('table.shiftName')}
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('table.start')}
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('table.end')}
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('table.duration')}
                                    </th>
                                    {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                        Created
                                    </th> */}
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                        {t('table.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {shiftLoading && shiftStores.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-transparent" />
                                        </td>
                                    </tr>
                                ) : shiftStores.length > 0 ? (
                                    shiftStores.map((shift) => (
                                        <tr key={shift.id}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{shift.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{shift.shift_start_time}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{shift.shift_end_time}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{formatDuration(shift.duration)}</td>
                                            {/* <td className="px-6 py-4 text-sm text-gray-500">
                                                {shift.created_at ? new Date(shift.created_at).toLocaleDateString() : '--'}
                                            </td> */}
                                            <td className="px-6 py-4 text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button
                                                        // variant="info"
                                                        size="icon-sm"
                                                        type="button"
                                                        onClick={() => openEditModal(shift)}
                                                        aria-label={t('editTitle')}
                                                        title={t('editTitle')}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon-sm"
                                                        onClick={() => handleDelete(shift)}
                                                        aria-label={t('deleteTitle')}
                                                        title={t('deleteTitle')}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                            {t('noShifts')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                        {isSuperAdmin ? t('emptySelectTenant') : t('emptyNoConfig')}
                    </div>
                )}
            </section>

            <ShiftStoreForm
                tenantName={activeTenant?.name}
                shiftStore={activeShiftStore}
                isOpen={isFormOpen}
                loading={shiftLoading}
                onClose={closeModal}
                onSubmit={handleSubmit}
                error={formError}
            />

            <ConfirmationDialog
                isOpen={!!shiftToDelete}
                onClose={() => setShiftToDelete(null)}
                onConfirm={confirmDelete}
                title="Konfirmasi Hapus Shift"
                message={`Apakah Anda yakin ingin menghapus shift "${shiftToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmText="Ya, Hapus"
                cancelText="Batal"
                variant="danger"
                loading={shiftLoading}
            />
        </div>
    );
}
