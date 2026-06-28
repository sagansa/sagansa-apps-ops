'use client';

import { useState, useEffect } from 'react';
import apiService from '@/app/services/api';
import { Modal, Input, Button } from '@/components/ui';

interface Category {
    id: string;
    name: string;
    tenant_id?: string;
    created_at: string;
    updated_at: string;
}

interface CategoryFormProps {
    category: Category | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CategoryForm({ category, onClose, onSuccess }: CategoryFormProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (category) {
            setName(category.name);
        } else {
            setName('');
        }
    }, [category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('Category name is required');
            return;
        }

        try {
            setLoading(true);
            if (category) {
                await apiService.updateCategory('', category.id, { name: name.trim() }); // Token already in apiService
            } else {
                await apiService.createCategory('', { name: name.trim() }); // Token already in apiService
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save category:', error);
            alert('Failed to save category');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={category ? 'Edit Category' : 'Add Category'}>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Category Name *
                    </label>
                    <Input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Beverages, Snacks, Main Courses"
                        required
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="outline"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
