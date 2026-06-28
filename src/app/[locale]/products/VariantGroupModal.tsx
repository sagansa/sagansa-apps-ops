'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { TagInput } from '@/components/ui/TagInput';

interface VariantGroupModalProps {
    isOpen: boolean;
    group: { name: string; variants: string[] } | null;
    onSave: (name: string, variants: string[]) => void;
    onClose: () => void;
}

export function VariantGroupModal({ isOpen, group, onSave, onClose }: VariantGroupModalProps) {
    const [groupName, setGroupName] = useState('');
    const [variantTags, setVariantTags] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && group) {
            setGroupName(group.name);
            setVariantTags(group.variants);
        } else if (isOpen && !group) {
            setGroupName('');
            setVariantTags([]);
        }
    }, [isOpen, group]);

    const handleSave = () => {
        const trimmedName = groupName.trim();
        if (!trimmedName || variantTags.length === 0) {
            return;
        }
        onSave(trimmedName, variantTags);
        handleClose();
    };

    const handleClose = () => {
        setGroupName('');
        setVariantTags([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-8">
            <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {group ? 'Edit Variant Group' : 'Add Variant Group'}
                        </h2>
                        <p className="text-xs text-gray-600">Kelola grup dan pilihan variasi produk.</p>
                    </div>
                    <Button
                        type="button"
                        onClick={handleClose}
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Close"
                    >
                        <span className="sr-only">Close</span>
                        &#10005;
                    </Button>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Group Name
                        </label>
                        <Input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="e.g. Size, Color, Level"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Option Values
                        </label>
                        <TagInput
                            tags={variantTags}
                            onChange={setVariantTags}
                            placeholder="Type option name and press Enter (e.g. Small, Medium, Large)"
                        />
                    </div>

                    {variantTags.length > 0 && (
                        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                            <p className="text-xs text-gray-600">
                                <strong>{variantTags.length} options</strong> will create combinations with other groups.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                    <Button
                        type="button"
                        onClick={handleClose}
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!groupName.trim() || variantTags.length === 0}
                    >
                        {group ? 'Update' : 'Add'} Group
                    </Button>
                </div>
            </div>
        </div>
    );
}
