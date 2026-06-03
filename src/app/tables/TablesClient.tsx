'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import apiService from '@/app/services/api';
import {
    Button,
    ConfirmationDialog,
    Modal,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui';
import { Plus, Pencil, QrCode, Trash2 } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Checkbox } from '@/components/ui/Checkbox';
import { getErrorMessage } from '@/app/utils/error';
import MenuQrModal from '@/components/menu/MenuQrModal';

type Table = {
    id: string;
    store_id: string;
    table_number: string;
    capacity: number;
    is_available: boolean;
    created_at: string;
    updated_at: string;
};

type StoreOption = {
    id: string;
    name: string;
    nickname?: string | null;
};

export default function TablesClient() {
    const { loading: authLoading, isAuthenticated, activeTenant } = useAuth();
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stores, setStores] = useState<StoreOption[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Form State
    const [tableNumber, setTableNumber] = useState('');
    const [capacity, setCapacity] = useState('');
    const [isAvailable, setIsAvailable] = useState(true);

    // Delete State
    const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [qrTarget, setQrTarget] = useState<Table | 'store' | null>(null);

    const fetchStores = useCallback(async () => {
        if (authLoading || !isAuthenticated) return;

        try {
            const data = await apiService.getStores();
            setStores(data);
            if (data.length > 0 && !selectedStore) {
                setSelectedStore(data[0].id);
            } else if (data.length === 0) {
                setLoading(false);
            }
        } catch (err) {
            console.error('Failed to load stores', err);
            setLoading(false);
        }
    }, [selectedStore, authLoading, isAuthenticated]);

    const fetchTables = useCallback(async () => {
        if (!selectedStore || authLoading || !isAuthenticated) return;

        setLoading(true);
        setError(null);
        try {
            const data = await apiService.getTables(selectedStore);
            setTables(data);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load tables'));
        } finally {
            setLoading(false);
        }
    }, [selectedStore, authLoading, isAuthenticated]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchStores();
        }
    }, [fetchStores, authLoading, isAuthenticated]);

    useEffect(() => {
        if (selectedStore && !authLoading && isAuthenticated) {
            fetchTables();
        }
    }, [fetchTables, selectedStore, authLoading, isAuthenticated]);

    const selectedStoreOption = stores.find((store) => store.id === selectedStore);
    const canGenerateQr = !!activeTenant?.id && !!selectedStoreOption;

    if (authLoading) {
        return <LoadingState message="Checking authentication..." />;
    }

    if (!isAuthenticated) {
        return <EmptyState title="Access Denied" description="Please log in to view this page." />;
    }

    const handleOpenModal = (table?: Table) => {
        setEditingTable(table || null);
        setTableNumber(table?.table_number || '');
        setCapacity(table?.capacity?.toString() || '');
        setIsAvailable(table?.is_available ?? true);
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTable(null);
        setTableNumber('');
        setCapacity('');
        setIsAvailable(true);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStore) return;

        setFormLoading(true);
        setFormError(null);

        try {
            const payload = {
                store_id: selectedStore,
                table_number: tableNumber,
                capacity: capacity ? parseInt(capacity) : null,
                is_available: isAvailable,
            };

            if (editingTable) {
                await apiService.updateTable(editingTable.id, payload);
            } else {
                await apiService.createTable(payload);
            }

            await fetchTables();
            handleCloseModal();
        } catch (err) {
            setFormError(getErrorMessage(err, 'Failed to save table'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!tableToDelete) return;

        setDeleteLoading(true);
        try {
            await apiService.deleteTable(tableToDelete.id);
            await fetchTables();
            setTableToDelete(null);
        } catch (err) {
            // Show error somewhere, maybe toast
            console.error(err);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Tables</h1>
                    <p className="mt-1 text-sm text-gray-700">
                        Manage restaurant tables for Dine-in.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setQrTarget('store')}
                        disabled={!canGenerateQr}
                        title="Generate Store QR"
                        aria-label="Generate Store QR"
                    >
                        <QrCode className="h-4 w-4" />
                        Store QR
                    </Button>
                    <Button
                        onClick={() => handleOpenModal()}
                        disabled={!selectedStore}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Table
                    </Button>
                </div>
            </div>

            {/* Store Filter */}
            <div className="flex items-center gap-2">
                <label htmlFor="store-select" className="text-sm font-medium text-gray-700">
                    Store:
                </label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger id="store-select" className="w-[280px]">
                        <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                        {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                                {store.nickname || store.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Table Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Capacity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={4}>
                                    <LoadingState message="Loading tables..." />
                                </td>
                            </tr>
                        ) : tables.length === 0 ? (
                            <tr>
                                <td colSpan={4}>
                                    <EmptyState
                                        title="No tables found"
                                        description="Add tables to this store to get started."
                                    />
                                </td>
                            </tr>
                        ) : (
                            tables.map((table) => (
                                <tr key={table.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {table.table_number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {table.capacity || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <Badge variant={table.is_available ? '' : 'destructive'}>
                                            {table.is_available ? 'Available' : 'Unavailable'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Button
                                                variant="secondary"
                                                size="icon-sm"
                                                onClick={() => setQrTarget(table)}
                                                disabled={!canGenerateQr}
                                                aria-label={`Generate QR for table ${table.table_number}`}
                                                title="Generate Table QR"
                                            >
                                                <QrCode className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                // variant="info"
                                                size="icon-sm"
                                                onClick={() => handleOpenModal(table)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="icon-sm"
                                                onClick={() => setTableToDelete(table)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingTable ? 'Edit Table' : 'Add Table'}
            >
                {formError && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                        {formError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField label="Table Number" required>
                        <Input
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            placeholder="e.g. T-01"
                        />
                    </FormField>

                    <FormField label="Capacity">
                        <Input
                            type="number"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            placeholder="e.g. 4"
                        />
                    </FormField>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is-available"
                            checked={isAvailable}
                            onChange={(e) => setIsAvailable(e.target.checked)}
                        />
                        <label htmlFor="is-available" className="text-sm font-medium text-gray-700">
                            Available
                        </label>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <Button type="button" variant="ghost" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={formLoading}>
                            {formLoading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmationDialog
                isOpen={!!tableToDelete}
                onClose={() => setTableToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Table"
                message={`Are you sure you want to delete table "${tableToDelete?.table_number}"?`}
                confirmText="Delete"
                variant="danger"
                loading={deleteLoading}
            />

            {canGenerateQr && (
                <MenuQrModal
                    isOpen={qrTarget !== null}
                    onClose={() => setQrTarget(null)}
                    tenantId={activeTenant?.id || ''}
                    storeId={selectedStoreOption?.id || ''}
                    storeName={selectedStoreOption?.nickname || selectedStoreOption?.name || 'Store'}
                    tableCode={qrTarget === 'store' ? 'STORE' : qrTarget?.table_number}
                    title={
                        qrTarget === 'store' || !qrTarget
                            ? `QR Store ${selectedStoreOption?.nickname || selectedStoreOption?.name || ''}`.trim()
                            : `QR Meja ${qrTarget.table_number}`
                    }
                />
            )}
        </div>
    );
}
