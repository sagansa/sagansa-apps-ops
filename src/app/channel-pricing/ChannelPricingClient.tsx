'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  name: string;
  is_active?: boolean;
};

type PriceMatrix = Record<string, Record<string, string>>;

export default function ChannelPricingClient() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerTypeOption[]>([]);
  const [prices, setPrices] = useState<PriceMatrix>({});
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedStore = stores.find((store) => store.id === selectedStoreId);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [storesData, productsData] = await Promise.all([
        apiService.getStores(),
        apiService.getProducts({ includeInactive: true }),
      ]);

      setStores(storesData);
      setProducts(productsData);

      if (!selectedStoreId && storesData.length > 0) {
        setSelectedStoreId(storesData[0].id);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load channel pricing data.'));
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    if (!selectedStoreId) {
      setCustomerTypes([]);
      setPrices({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      apiService.getCustomerTypes(selectedStoreId),
      apiService.getProductPrices({ storeId: selectedStoreId }),
    ])
      .then(([types, priceRows]) => {
        if (cancelled) return;

        setCustomerTypes((types as CustomerTypeOption[]).filter((type) => type.is_active !== false));

        const nextPrices: PriceMatrix = {};
        priceRows.forEach((row) => {
          if (!nextPrices[row.productId]) {
            nextPrices[row.productId] = {};
          }
          nextPrices[row.productId][row.customerTypeId] = String(row.price);
        });
        setPrices(nextPrices);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Failed to load prices for this store.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedStoreId]);

  const storeProducts = useMemo(() => {
    if (!selectedStoreId) return [];

    return products.filter((product) =>
      product.stores?.some((store) => store.id === selectedStoreId),
    );
  }, [products, selectedStoreId]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return storeProducts;

    return storeProducts.filter((product) =>
      product.name.toLowerCase().includes(query)
      || product.sku.toLowerCase().includes(query),
    );
  }, [storeProducts, searchQuery]);

  const getStorePrice = (product: Product) => {
    return product.stores?.find((store) => store.id === selectedStoreId)?.price ?? product.price;
  };

  const handlePriceChange = (productId: string, customerTypeId: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setPrices((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? {}),
        [customerTypeId]: cleaned,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedStoreId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await Promise.all(storeProducts.map((product) => {
        const rows: ProductPriceInput[] = customerTypes
          .map((type) => {
            const value = prices[product.id]?.[type.id] ?? '';
            if (value === '') return null;

            return {
              store_id: selectedStoreId,
              product_id: product.id,
              customer_type_id: type.id,
              price: Number(value),
              is_active: true,
            };
          })
          .filter((row): row is ProductPriceInput => row !== null);

        return apiService.saveProductPrices({
          storeId: selectedStoreId,
          productId: product.id,
          prices: rows,
        });
      }));

      setSuccess('Harga channel berhasil disimpan.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save channel prices.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && stores.length === 0) {
    return <LoadingState message="Loading channel pricing..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Channel Pricing</h2>
          <p className="text-sm text-gray-600">
            Kelola harga Gojek, Grab, ShopeeFood, dan customer type lain per store.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving || !selectedStoreId || customerTypes.length === 0}>
          {saving ? 'Saving...' : 'Save Prices'}
        </Button>
      </div>

      {(error || success) && (
        <div className={`rounded-md p-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error || success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 lg:grid-cols-[minmax(260px,360px)_1fr]">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Store</span>
          <select
            value={selectedStoreId}
            onChange={(event) => {
              setSelectedStoreId(event.target.value);
              setSuccess(null);
            }}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.nickname || store.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Search Product</span>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by product name or SKU"
          />
        </label>
      </div>

      {!selectedStore ? (
        <EmptyState title="No store selected" description="Select a store to edit channel prices." />
      ) : customerTypes.length === 0 ? (
        <EmptyState title="No active customer types" description="Create active customer types such as Gojek, Grab, or ShopeeFood first." />
      ) : filteredProducts.length === 0 ? (
        <EmptyState title="No products" description="No products are available for this store or search." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3 text-sm text-gray-600">
            Showing {filteredProducts.length} of {storeProducts.length} products for {selectedStore.nickname || selectedStore.name}
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="min-w-64 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Store Price</th>
                  {customerTypes.map((type) => (
                    <th key={type.id} className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {type.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredProducts.map((product) => {
                  const storePrice = getStorePrice(product);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        Rp {Number(storePrice || 0).toLocaleString('id-ID')}
                      </td>
                      {customerTypes.map((type) => (
                        <td key={type.id} className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={prices[product.id]?.[type.id] ?? ''}
                            onChange={(event) => handlePriceChange(product.id, type.id, event.target.value)}
                            placeholder={String(storePrice || 0)}
                            className="w-32"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
