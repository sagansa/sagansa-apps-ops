'use client';

import { Store } from '@/app/services/api';
import { useState } from 'react';

interface StoreListProps {
    stores: Store[];
    selectedStoreIds: string[];
    activeStoreId: string | null;
    editMode: 'single' | 'multi';
    onStoreClick: (id: string) => void;
    onSelectionChange: (ids: string[]) => void;
}

export default function StoreList({
    stores,
    selectedStoreIds,
    activeStoreId,
    editMode,
    onStoreClick,
    onSelectionChange,
}: StoreListProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStores = stores.filter((store) => {
        const query = searchQuery.toLowerCase();
        return (
            store.name.toLowerCase().includes(query) ||
            store.nickname?.toLowerCase().includes(query)
        );
    });

    const handleToggleStore = (storeId: string) => {
        if (selectedStoreIds.includes(storeId)) {
            onSelectionChange(selectedStoreIds.filter((id) => id !== storeId));
        } else {
            onSelectionChange([...selectedStoreIds, storeId]);
        }
    };

    const handleToggleAll = () => {
        if (selectedStoreIds.length === filteredStores.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(filteredStores.map((s) => s.id));
        }
    };

    return (
        <div className="flex h-full flex-col border-r bg-gray-50">
            <div className="border-b bg-white p-4">
                <h2 className="text-lg font-semibold text-gray-900">Stores</h2>
                <p className="text-sm text-gray-500">{stores.length} total</p>
            </div>

            <div className="p-4">
                <input
                    type="text"
                    placeholder="Search stores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
            </div>

            {editMode === 'multi' && (
                <div className="border-b px-4 py-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={selectedStoreIds.length === filteredStores.length && filteredStores.length > 0}
                            onChange={handleToggleAll}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Select All ({selectedStoreIds.length})</span>
                    </label>
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {filteredStores.map((store) => (
                    <div
                        key={store.id}
                        className={`border-b px-4 py-2 transition-colors ${activeStoreId === store.id
                            ? 'bg-indigo-50 border-l-4 border-l-indigo-600'
                            : 'hover:bg-gray-100'
                            }`}
                    >
                        {editMode === 'multi' ? (
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedStoreIds.includes(store.id)}
                                    onChange={() => handleToggleStore(store.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                                />
                                <div
                                    className="flex-1 flex items-center justify-between min-w-0"
                                    onClick={() => onStoreClick(store.id)}
                                >
                                    <p className="font-medium text-gray-900 truncate">{store.nickname || store.name}</p>
                                    <span
                                        className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${store.status === 'active'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                            }`}
                                    >
                                        {store.status || 'active'}
                                    </span>
                                </div>
                            </label>
                        ) : (
                            <div
                                className="cursor-pointer flex items-center justify-between"
                                onClick={() => onStoreClick(store.id)}
                            >
                                <p className="font-medium text-gray-900 truncate">{store.nickname || store.name}</p>
                                <span
                                    className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${store.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                        }`}
                                >
                                    {store.status || 'active'}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
