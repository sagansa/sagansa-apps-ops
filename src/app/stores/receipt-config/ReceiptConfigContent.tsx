'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import apiService, { Store } from '@/app/services/api';
import StoreList from './StoreList';
import ReceiptConfigForm, { ReceiptConfigData } from './ReceiptConfigForm';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export default function ReceiptConfigContent() {
    const { user } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
    const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<'single' | 'multi'>('single');

    useEffect(() => {
        if (user?.tenant?.id) {
            loadStores();
        } else {
            setLoading(false);
            setError('No tenant selected. Please select a tenant first.');
        }
    }, [user?.tenant?.id]);

    const loadStores = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!user?.tenant?.id) {
                setLoading(false);
                setError('No tenant selected or not authenticated.');
                return;
            }

            console.log('Fetching stores...');
            const response = await apiService.getStores();
            console.log('Store response:', response);

            if (Array.isArray(response)) {
                setStores(response);
            } else {
                console.warn('Unexpected response format:', response);
                setStores([]);
            }
        } catch (err) {
            console.error('Error loading stores:', err);
            setError(err instanceof Error ? err.message : 'Failed to load stores');
            setStores([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStoreClick = (storeId: string) => {
        setActiveStoreId(storeId);
        if (!selectedStoreIds.includes(storeId)) {
            setSelectedStoreIds([storeId]);
        }
    };

    const handleSelectionChange = (ids: string[]) => {
        setSelectedStoreIds(ids);
        if (ids.length === 1) {
            setActiveStoreId(ids[0]);
        } else if (ids.length === 0) {
            setActiveStoreId(null);
        }
    };

    const handleSave = async (data: ReceiptConfigData) => {
        if (!user?.tenant?.id) {
            throw new Error('Not authenticated');
        }

        setSaving(true);
        setError(null);

        try {
            const isBulk = editMode === 'multi' && selectedStoreIds.length > 1;

            const updatePromises = selectedStoreIds.map(async (storeId) => {
                const updateData: any = {};

                // In bulk mode, only include fields that have values
                // In single mode, include all fields
                if (isBulk) {
                    if (data.receipt_header) updateData.receipt_header = data.receipt_header;
                    if (data.receipt_footer) updateData.receipt_footer = data.receipt_footer;
                    if (data.address) updateData.address = data.address;
                    if (data.phone) updateData.phone = data.phone;
                } else {
                    updateData.receipt_header = data.receipt_header || null;
                    updateData.receipt_footer = data.receipt_footer || null;
                    updateData.address = data.address || null;
                    updateData.phone = data.phone || null;
                }

                // Handle email receipt logo
                if (data.email_receipt_logo) {
                    updateData.email_receipt_logo = data.email_receipt_logo;
                } else if (data.remove_email_receipt_logo) {
                    updateData.email_receipt_logo = null;
                    updateData.remove_email_receipt_logo = true;
                }

                // Handle print receipt logo
                if (data.print_receipt_logo) {
                    updateData.print_receipt_logo = data.print_receipt_logo;
                } else if (data.remove_print_receipt_logo) {
                    updateData.print_receipt_logo = null;
                    updateData.remove_print_receipt_logo = true;
                }

                return apiService.updateStore(user.tenant!.id, storeId, updateData);
            });

            await Promise.all(updatePromises);

            // Reload stores to get updated data
            await loadStores();
        } catch (err) {
            console.error('Error saving:', err);
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const selectedStores = stores.filter((store) => selectedStoreIds.includes(store.id));
    const isBulkMode = editMode === 'multi' && selectedStoreIds.length > 1;

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading stores...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                    <button
                        onClick={loadStores}
                        className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="border-b bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Receipt Configuration</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Configure receipt information for your stores
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Mode:</span>
                        <ToggleGroup
                            type="single"
                            value={editMode}
                            variant="outline"
                            onValueChange={(value) => {
                                if (value) {
                                    setEditMode(value as 'single' | 'multi');
                                    if (value === 'single' && selectedStoreIds.length > 1) {
                                        setSelectedStoreIds(selectedStoreIds.slice(0, 1));
                                    }
                                }
                            }}
                        >
                            <ToggleGroupItem
                                value="single"
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                Single
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="multi"
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                Multi
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
                <div className="w-80 flex-shrink-0">
                    <StoreList
                        stores={stores}
                        selectedStoreIds={selectedStoreIds}
                        activeStoreId={activeStoreId}
                        editMode={editMode}
                        onStoreClick={handleStoreClick}
                        onSelectionChange={handleSelectionChange}
                    />
                </div>

                <div className="flex-1 overflow-hidden bg-white">
                    <ReceiptConfigForm
                        selectedStores={selectedStores}
                        isBulkMode={isBulkMode}
                        onSave={handleSave}
                        loading={saving}
                    />
                </div>
            </div>
        </div>
    );
}
