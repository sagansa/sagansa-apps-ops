'use client';

import { useCallback, useEffect, useState } from 'react';
import apiService from '@/app/services/api';
import { Button, ConfirmationDialog, Modal } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Checkbox } from '@/components/ui/Checkbox';
import { getErrorMessage } from '@/app/utils/error';
import { useAuth } from '@/app/contexts/AuthContext';

type CustomerType = {
    id: string;
    store_id: string;
    name: string;
    is_active: boolean;
    order: number;
    auto_payment?: boolean;
    linked_payment_method_id?: string | null;
    created_at: string;
    updated_at: string;
};

type StoreOption = {
    id: string;
    name: string;
};

export default function CustomerTypesClient() {
    const { loading: authLoading, isAuthenticated } = useAuth();
    const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stores, setStores] = useState<StoreOption[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<CustomerType | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [order, setOrder] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [autoPayment, setAutoPayment] = useState(false);
    const [linkedPaymentMethodId, setLinkedPaymentMethodId] = useState<string>('');
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

    // Delete State
    const [typeToDelete, setTypeToDelete] = useState<CustomerType | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

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

    const fetchCustomerTypes = useCallback(async () => {
        if (!selectedStore || authLoading || !isAuthenticated) return;

        setLoading(true);
        setError(null);
        try {
            const data = await apiService.getCustomerTypes(selectedStore);
            setCustomerTypes(data);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load customer types'));
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
            fetchCustomerTypes();
        }
    }, [fetchCustomerTypes, selectedStore, authLoading, isAuthenticated]);

    if (authLoading) {
        return <LoadingState message="Checking authentication..." />;
    }

    if (!isAuthenticated) {
        return <EmptyState title="Access Denied" description="Please log in to view this page." />;
    }

    const handleOpenModal = async (type?: CustomerType) => {
        setEditingType(type || null);
        setName(type?.name || '');
        setOrder(type?.order?.toString() || '0');
        setIsActive(type?.is_active ?? true);
        setAutoPayment(type?.auto_payment ?? false);

        // Extract payment method ID from either the ID field or the linked_payment_method object
        const paymentMethodId = type?.linked_payment_method_id
            || (type?.linked_payment_method as any)?.id
            || '';
        setLinkedPaymentMethodId(paymentMethodId);
        setFormError(null);

        // Fetch payment methods for the selected store
        if (selectedStore) {
            try {
                const methods = await apiService.getPaymentMethods(selectedStore);
                const uniqueMethods = Array.from(
                    new Map((methods || []).map((method: any) => [method.id || `${method.store_id}:${method.name}`, method])).values(),
                );
                setPaymentMethods(uniqueMethods);
            } catch (err) {
                console.error('Failed to load payment methods:', err);
                setPaymentMethods([]);
            }
        }

        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingType(null);
        setName('');
        setOrder('0');
        setIsActive(true);
        setAutoPayment(false);
        setLinkedPaymentMethodId('');
        setPaymentMethods([]);
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
                name,
                order: parseInt(order) || 0,
                is_active: isActive,
                auto_payment: autoPayment,
                linked_payment_method_id: autoPayment && linkedPaymentMethodId ? linkedPaymentMethodId : null,
            };

            console.log('=== Customer Type Save Debug ===');
            console.log('Editing:', editingType?.id);
            console.log('Payload:', payload);
            console.log('Auto Payment:', autoPayment);
            console.log('Linked Payment Method ID:', linkedPaymentMethodId);

            if (editingType) {
                const result = await apiService.updateCustomerType(editingType.id, payload);
                console.log('Update result:', result);
            } else {
                const result = await apiService.createCustomerType(payload);
                console.log('Create result:', result);
            }

            await fetchCustomerTypes();
            handleCloseModal();
        } catch (err) {
            console.error('Save error:', err);
            setFormError(getErrorMessage(err, 'Failed to save customer type'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!typeToDelete) return;

        setDeleteLoading(true);
        try {
            await apiService.deleteCustomerType(typeToDelete.id);
            await fetchCustomerTypes();
            setTypeToDelete(null);
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Customer Types</h1>
                    <p className="mt-1 text-sm text-gray-700">
                        Manage customer types (e.g., Takeaway, Gojek, Grab).
                    </p>
                </div>
                <Button
                    onClick={() => handleOpenModal()}
                    disabled={!selectedStore}
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Customer Type
                </Button>
            </div>

            {/* Store Filter */}
            <div className="flex items-center gap-2">
                <label htmlFor="store-select" className="text-sm font-medium text-gray-700">
                    Store:
                </label>
                <Select
                    value={selectedStore}
                    onValueChange={(value) => setSelectedStore(value)}
                >
                    <SelectTrigger className="w-[200px]">
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
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Order
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
                                    <LoadingState message="Loading customer types..." />
                                </td>
                            </tr>
                        ) : customerTypes.length === 0 ? (
                            <tr>
                                <td colSpan={4}>
                                    <EmptyState
                                        title="No customer types found"
                                        description="Add customer types to this store to get started."
                                    />
                                </td>
                            </tr>
                        ) : (
                            customerTypes.map((type) => (
                                <tr key={type.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {type.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {type.order}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <Badge variant={type.is_active ? 'default' : 'secondary'}>
                                            {type.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Button
                                                size="icon-sm"
                                                onClick={() => handleOpenModal(type)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="icon-sm"
                                                onClick={() => setTypeToDelete(type)}
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
                title={editingType ? 'Edit Customer Type' : 'Add Customer Type'}
            >
                {formError && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                        {formError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField label="Name" required>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Gojek"
                        />
                    </FormField>

                    <FormField label="Order (Sort Priority)">
                        <Input
                            type="number"
                            value={order}
                            onChange={(e) => setOrder(e.target.value)}
                            placeholder="e.g. 1"
                        />
                    </FormField>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is-active"
                            checked={isActive}
                            onCheckedChange={(checked) => setIsActive(checked as boolean)}
                        />
                        <label htmlFor="is-active" className="text-sm font-medium text-gray-700">
                            Active
                        </label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="auto-payment"
                            checked={autoPayment}
                            onCheckedChange={(checked) => setAutoPayment(checked as boolean)}
                        />
                        <label htmlFor="auto-payment" className="text-sm font-medium text-gray-700">
                            Auto Payment (Lock payment method at checkout)
                        </label>
                    </div>

                    {autoPayment && (
                        <FormField label="Linked Payment Method" required>
                            <Select
                                value={linkedPaymentMethodId}
                                onValueChange={(value) => setLinkedPaymentMethodId(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment method..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map((pm: any) => (
                                        <SelectItem key={pm.id} value={pm.id}>
                                            {pm.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                    )}

                    <div className="flex justify-end space-x-3 mt-6">
                        <Button type="button" variant="ghost" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="default" disabled={formLoading}>
                            {formLoading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmationDialog
                isOpen={!!typeToDelete}
                onClose={() => setTypeToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Customer Type"
                message={`Are you sure you want to delete "${typeToDelete?.name}"?`}
                confirmText="Delete"
                variant="danger"
                loading={deleteLoading}
            />
        </div>
    );
}
