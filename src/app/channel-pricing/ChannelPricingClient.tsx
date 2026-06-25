'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eraser,
  Save,
  Search,
  Store as StoreIcon,
  Zap,
} from 'lucide-react';
import apiService, { Product, ProductPriceInput } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

type StoreOption = {
  id: string;
  name: string;
  nickname?: string | null;
};

type CustomerTypeOption = {
  id: string;
  store_id: string;
  name: string;
  is_active?: boolean;
  order?: number;
};

type ChannelColumn = {
  orderKey: string;
  types: CustomerTypeOption[];
  label: string;
};

const formatPrice = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
};

const formatPercent = (channelPrice: number, offlinePrice: number | undefined): string | null => {
  if (!offlinePrice || offlinePrice === 0) return null;
  if (!channelPrice || channelPrice === 0) return null;
  // Commission = the cut the channel takes from the channel price
  // (e.g., Gojek takes 25% → offline=10000, channel=13333 → commission = 3333/13333 ≈ 25%)
  const commission = ((channelPrice - offlinePrice) / channelPrice) * 100;
  return `${commission.toFixed(1)}%`;
};

export default function ChannelPricingClient() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerTypeOption[]>([]);
  const [priceRows, setPriceRows] = useState<Record<string, string>>({});
  const [existingPrices, setExistingPrices] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [bulkEditValues, setBulkEditValues] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const priceKey = (storeId: string, productId: string, customerTypeId: string) =>
    `${storeId}__${productId}__${customerTypeId}`;

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [storesData, productsData, categoriesData] = await Promise.all([
        apiService.getStores(),
        apiService.getProducts({ includeInactive: true }),
        apiService.getCategories(),
      ]);

      setStores(storesData);
      setProducts(productsData);
      setCategories(categoriesData);

      // Load all customer types across stores and all product prices
      const [allCustomerTypes, allPrices] = await Promise.all([
        apiService.getCustomerTypes(),
        apiService.getProductPrices({}),
      ]);

      const activeTypes = (allCustomerTypes as CustomerTypeOption[]).filter(
        (type) => type.is_active !== false,
      );
      setCustomerTypes(activeTypes);

      const initialPrices: Record<string, string> = {};
      allPrices.forEach((row) => {
        const key = priceKey(row.storeId, row.productId, row.customerTypeId);
        initialPrices[key] = String(row.price);
      });
      setPriceRows(initialPrices);
      setExistingPrices(initialPrices);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load channel pricing data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  const getCustomerTypesForStore = useCallback(
    (storeId: string): CustomerTypeOption[] => {
      return customerTypes.filter((type) => type.store_id === storeId);
    },
    [customerTypes],
  );

  const getProductStoreOfflinePrice = (product: Product, storeId: string): number | undefined => {
    return product.stores?.find((store) => store.id === storeId)?.price ?? product.price;
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let filtered = products;

    if (query) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query),
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((product) => {
        if (product.categoryDetail?.id === selectedCategory) return true;
        const category = categories.find((c) => c.id === selectedCategory);
        return category ? product.category === category.name : false;
      });
    }

    return [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }),
    );
  }, [products, searchQuery, selectedCategory, categories]);

  const productStoreMap = useMemo(() => {
    const map = new Map<string, { product: Product; stores: StoreOption[] }>();
    products.forEach((product) => {
      const productStores = (product.stores || [])
        .map((ps) => stores.find((s) => s.id === ps.id))
        .filter((s): s is StoreOption => Boolean(s));
      if (productStores.length > 0) {
        map.set(product.id, { product, stores: productStores });
      }
    });
    return map;
  }, [products, stores]);

  const toggleProduct = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handlePriceChange = (storeId: string, productId: string, customerTypeId: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const key = priceKey(storeId, productId, customerTypeId);
    setPriceRows((prev) => ({
      ...prev,
      [key]: cleaned,
    }));
  };

  const expandAll = () => {
    setExpandedProducts(new Set(filteredProducts.map((p) => p.id)));
  };

  const collapseAll = () => {
    setExpandedProducts(new Set());
  };

  const clearProductPrices = (productId: string) => {
    const productEntry = productStoreMap.get(productId);
    if (!productEntry) return;

    const keysToRemove: string[] = [];
    productEntry.stores.forEach((store) => {
      const typesForStore = getCustomerTypesForStore(store.id);
      typesForStore.forEach((type) => {
        keysToRemove.push(priceKey(store.id, productId, type.id));
      });
    });

    if (keysToRemove.length === 0) return;

    setPriceRows((prev) => {
      const next = { ...prev };
      keysToRemove.forEach((key) => {
        delete next[key];
      });
      return next;
    });
  };

  const applyBulkEdit = (productId: string, mode: 'percent' | 'absolute', value: string) => {
    const productEntry = productStoreMap.get(productId);
    if (!productEntry) return;

    const numValue = Number(value.replace(/[^0-9-]/g, ''));
    if (Number.isNaN(numValue)) return;

    const updates: Record<string, string> = {};

    productEntry.stores.forEach((store) => {
      // Use each store's offline price as the base for percentage calculation
      // Offline price itself is NEVER modified — only channel prices are updated
      const offlinePrice = getProductStoreOfflinePrice(productEntry.product, store.id);
      if (!offlinePrice || offlinePrice === 0) return;

      const typesForStore = getCustomerTypesForStore(store.id);
      typesForStore.forEach((type) => {
        let newPrice: number;
        if (mode === 'percent') {
          // Percentage = channel commission/cut (e.g., Gojek takes 25%)
          // To receive the same offline price after commission: price = offline / (1 - cut%)
          // Round to nearest thousand (e.g., 13333 → 13000)
          newPrice = Math.round((offlinePrice / (1 - numValue / 100)) / 1000) * 1000;
        } else {
          // Round absolute value to nearest thousand
          newPrice = Math.max(0, Math.round(numValue / 1000) * 1000);
        }
        const key = priceKey(store.id, productId, type.id);
        updates[key] = String(newPrice);
      });
    });
    if (Object.keys(updates).length === 0) return;

    setPriceRows((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const savePromises: Promise<unknown>[] = [];

      productStoreMap.forEach(({ product, stores: productStores }) => {
        productStores.forEach((store) => {
          const typesForStore = getCustomerTypesForStore(store.id);
          if (typesForStore.length === 0) return;

          const rows = typesForStore
            .map((type): ProductPriceInput | null => {
              const key = priceKey(store.id, product.id, type.id);
              const value = priceRows[key] ?? '';
              if (value === '') return null;
              return {
                store_id: store.id,
                product_id: product.id,
                customer_type_id: type.id,
                price: Number(value),
                is_active: true,
              };
            })
            .filter((row): row is ProductPriceInput => row !== null);

          if (rows.length > 0) {
            savePromises.push(
              apiService.saveProductPrices({
                storeId: store.id,
                productId: product.id,
                prices: rows,
              }),
            );
          }
        });
      });

      await Promise.all(savePromises);
      setSuccess('Harga channel berhasil disimpan.');
      setExistingPrices({ ...priceRows });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save channel prices.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading channel pricing..." />;
  }

  const totalProducts = filteredProducts.length;
  const productsWithStores = filteredProducts.filter((p) => productStoreMap.has(p.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Channel Pricing</h2>
          <p className="text-sm text-gray-600">
            Kelola harga Offline, Gojek, Grab, ShopeeFood, dan customer type lain per product per store.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || productsWithStores.length === 0}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save All Prices'}
        </Button>
      </div>

      {(error || success) && (
        <div
          className={`rounded-md p-3 text-sm ${
            error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <label className="space-y-1 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Search Product
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by product name or SKU"
                className="pl-9"
              />
            </div>
          </label>
        </div>
        <label className="space-y-1 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Category
          </span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-48"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button variant="outline" onClick={expandAll} disabled={productsWithStores.length === 0}>
            Expand All
          </Button>
          <Button variant="outline" onClick={collapseAll} disabled={expandedProducts.size === 0}>
            Collapse All
          </Button>
        </div>
      </div>

      {customerTypes.length === 0 ? (
        <EmptyState
          title="No active customer types"
          description="Create active customer types such as Gojek, Grab, or ShopeeFood for your stores first."
        />
      ) : productsWithStores.length === 0 ? (
        <EmptyState
          title="No products"
          description="No products are available or assigned to any store."
        />
      ) : (
        <div className="space-y-2">
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600">
            Showing {productsWithStores.length} of {totalProducts} products
          </div>
          <div className="space-y-2">
            {productsWithStores.map((product) => {
              const productStores = productStoreMap.get(product.id)?.stores ?? [];
              const isExpanded = expandedProducts.has(product.id);

              return (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleProduct(product.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">{product.sku || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        <StoreIcon className="h-3 w-3" />
                        {productStores.length} store{productStores.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50/50">
                      {/* Bulk Edit Toolbar */}
                      <div className="flex flex-col gap-2 border-b border-gray-200 bg-blue-50/50 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Zap className="h-4 w-4 text-blue-600" />
                          Quick Edit:
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={bulkEditValues[`${product.id}__percent`] ?? ''}
                              onChange={(event) => {
                                const val = event.target.value;
                                setBulkEditValues((prev) => ({
                                  ...prev,
                                  [`${product.id}__percent`]: val,
                                }));
                              }}
                              placeholder="25"
                              className="w-20 text-sm"
                            />
                            <span className="text-xs text-gray-500">% commission</span>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const val = bulkEditValues[`${product.id}__percent`] ?? '';
                                if (val) applyBulkEdit(product.id, 'percent', val);
                              }}
                              disabled={!bulkEditValues[`${product.id}__percent`]}
                            >
                              Apply %
                            </Button>
                          </div>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Set all to Rp</span>
                            <Input
                              type="number"
                              value={bulkEditValues[`${product.id}__absolute`] ?? ''}
                              onChange={(event) => {
                                const val = event.target.value;
                                setBulkEditValues((prev) => ({
                                  ...prev,
                                  [`${product.id}__absolute`]: val,
                                }));
                              }}
                              placeholder="15000"
                              className="w-24 text-sm"
                            />
                            <Button
                              variant="outline"
                              onClick={() => {
                                const val = bulkEditValues[`${product.id}__absolute`] ?? '';
                                if (val) applyBulkEdit(product.id, 'absolute', val);
                              }}
                              disabled={!bulkEditValues[`${product.id}__absolute`]}
                            >
                              Apply
                            </Button>
                          </div>
                          <span className="text-gray-300">|</span>
                          <Button
                            variant="outline"
                            onClick={() => clearProductPrices(product.id)}
                            className="text-red-600 hover:border-red-300 hover:bg-red-50"
                          >
                            <Eraser className="mr-1 h-3.5 w-3.5" />
                            Clear Prices
                          </Button>
                        </div>
                      </div>

                      {/* Group customer types by `order` field to align columns across stores */}
                      {(() => {
                        // Collect all customer types across stores, then group by order
                        const groupMap = new Map<string, ChannelColumn>();

                        productStores.forEach((store) => {
                          getCustomerTypesForStore(store.id).forEach((type) => {
                            // Group key: use `order` if available, otherwise fall back to name
                            const orderKey =
                              type.order !== undefined && type.order !== null
                                ? `order_${type.order}`
                                : `name_${type.name}`;

                            if (!groupMap.has(orderKey)) {
                              groupMap.set(orderKey, {
                                orderKey,
                                types: [],
                                label: type.name,
                              });
                            }

                            const group = groupMap.get(orderKey)!;
                            // Add this type if not already present (avoid duplicates)
                            if (!group.types.some((t) => t.id === type.id)) {
                              group.types.push(type);
                            }

                            // Update label to include all variant names (deduplicated)
                            const existingNames = group.label.split(' / ');
                            if (!existingNames.includes(type.name)) {
                              existingNames.push(type.name);
                              group.label = existingNames.join(' / ');
                            }
                          });
                        });

                        // Sort groups by their order number
                        const columns = Array.from(groupMap.values()).sort((a, b) => {
                          const orderA = parseInt(a.orderKey.replace('order_', '').replace('name_', ''), 10);
                          const orderB = parseInt(b.orderKey.replace('order_', '').replace('name_', ''), 10);
                          const numA = Number.isNaN(orderA) ? 9999 : orderA;
                          const numB = Number.isNaN(orderB) ? 9999 : orderB;
                          return numA - numB;
                        });

                        if (columns.length === 0) {
                          return (
                            <div className="px-4 py-3 text-xs text-gray-400 italic">
                              No active customer types for any store.
                            </div>
                          );
                        }

                        return (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b border-gray-200 bg-white">
                                  <th className="sticky left-0 z-10 min-w-32 bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Store
                                  </th>
                                  <th className="w-28 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Offline
                                  </th>
                                  {columns.map((col) => (
                                    <th
                                      key={col.orderKey}
                                      className="min-w-36 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                    >
                                      {col.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {productStores.map((store) => {
                                  const offlinePrice = getProductStoreOfflinePrice(product, store.id);
                                  const storeTypes = getCustomerTypesForStore(store.id);

                                  return (
                                    <tr
                                      key={store.id}
                                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                                    >
                                      <td className="sticky left-0 z-10 bg-white px-3 py-2">
                                        <div className="flex items-center gap-1.5">
                                          <StoreIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                                          <span className="truncate text-sm font-medium text-gray-900">
                                            {store.nickname || store.name}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-right text-xs text-gray-600">
                                        <span className="font-medium">{formatPrice(offlinePrice)}</span>
                                      </td>
                                      {columns.map((col) => {
                                        // Find the matching customer type for this store within this group
                                        const matchingType = col.types.find(
                                          (t) => t.store_id === store.id,
                                        );

                                        if (!matchingType) {
                                          return (
                                            <td key={col.orderKey} className="px-3 py-2">
                                              <span className="text-xs text-gray-300">-</span>
                                            </td>
                                          );
                                        }

                                        const key = priceKey(store.id, product.id, matchingType.id);
                                        const currentValue = priceRows[key] ?? '';
                                        const originalValue = existingPrices[key] ?? '';
                                        const isModified = currentValue !== originalValue;
                                        const numericPrice = currentValue
                                          ? Number(currentValue)
                                          : (offlinePrice ?? 0);
                                        const percentDiff = formatPercent(numericPrice, offlinePrice);

                                        return (
                                          <td key={col.orderKey} className="px-3 py-2 align-top">
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                min="0"
                                                step="100"
                                                value={currentValue}
                                                onChange={(event) =>
                                                  handlePriceChange(
                                                    store.id,
                                                    product.id,
                                                    matchingType.id,
                                                    event.target.value,
                                                  )
                                                }
                                                placeholder={offlinePrice ? String(offlinePrice) : '0'}
                                                className={`w-28 text-xs ${
                                                  isModified ? 'border-amber-400 bg-amber-50' : ''
                                                }`}
                                              />
                                              {isModified && (
                                                <span
                                                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"
                                                  title="Modified"
                                                />
                                              )}
                                            </div>
                                            {percentDiff && (
                                              <p
                                                className={`mt-0.5 text-xs ${
                                                  numericPrice > (offlinePrice ?? 0)
                                                    ? 'text-green-600'
                                                    : numericPrice < (offlinePrice ?? 0)
                                                      ? 'text-red-500'
                                                      : 'text-gray-400'
                                                }`}
                                              >
                                                {percentDiff}
                                              </p>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}