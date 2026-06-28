'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import apiService, {
  Product,
  ProductInput,
} from '@/app/services/api';
import ProductForm from './ProductForm';
import { getErrorMessage } from '@/app/utils/error';
import { Button, ConfirmationDialog, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

type LoadingState = 'idle' | 'initial' | 'refresh';

type StoreOption = {
  id: string;
  name: string;
  nickname?: string | null;
};

export default function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const loadProducts = useCallback(async (state: LoadingState = 'refresh') => {
    setLoadingState(state);
    setError(null);
    try {
      const data = await apiService.getProducts({ includeInactive: true });
      setProducts(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load products.'));
    } finally {
      setLoadingState('idle');
    }
  }, []);

  useEffect(() => {
    void loadProducts('initial');
  }, [loadProducts]);

  useEffect(() => {
    let mounted = true;
    setStoresLoading(true);
    apiService
      .getStores()
      .then((data) => {
        console.log('Stores loaded successfully:', data);
        if (mounted) {
          setStores(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load stores:', err);
        console.error('Error details:', err.message, err.stack);
        if (mounted) {
          setStores([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setStoresLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setCategoriesLoading(true);
    // We need a token for getCategories, but apiService handles it internally if set.
    // However, ProductsClient is client-side and might not have token set in apiService if not handled.
    // Assuming apiService is configured or we need to pass token.
    // Actually apiService.getCategories takes a token.
    // In client components, we usually don't have raw token easily unless we use useSession or similar.
    // But wait, apiService methods in this file seem to not take token for other calls?
    // Ah, getProducts doesn't take token. getStores doesn't.
    // But getCategories definition I saw earlier took a token.
    // Let's check api.ts again.
    // Step 503: export const getCategories = (token: string) => apiService.getCategories(token);
    // But apiService.getCategories definition: async getCategories(token: string)
    // This seems inconsistent with other methods if they don't require token.
    // Let's assume for now I can call it without token if I fix api.ts or if I pass an empty string and it works (unlikely).
    // Actually, looking at api.ts, getProducts uses this.request which uses this.token.
    // So I should probably use apiService.getCategories(null) if I modify it, or just use the class method if I can access it.
    // But `getCategories` is exported as a const function requiring token.
    // I should probably add `getCategories` to `ApiService` class properly or use the existing one if it's on the instance.
    // The `apiService` import is the default export (instance).
    // Let's check if `getCategories` is on the instance.
    // In Step 503, `getCategories` IS on the class `ApiService`.
    // async getCategories(token: string) { ... }
    // It requires a token argument.
    // But `getProducts` doesn't.
    // This is inconsistent. I should probably update `getCategories` in `api.ts` to be optional token or use `this.token`.
    // For now, I will try to call it. If it fails, I'll fix api.ts.
    // Wait, I can't easily get the token here.
    // I'll update api.ts first to make token optional in getCategories, using this.token if available.

    // RE-READING api.ts from Step 503:
    // async getCategories(token: string) { ... }
    // It uses `token` arg in `this.request`.
    // Other methods like `getProducts` don't take token arg and use `this.token` (via `this.request` implicitly? No, `this.request` uses `this.token`).
    // So `getCategories` explicitly passing token is weird if `this.token` is already set.
    // I will modify `api.ts` to make token optional.

    // But for now, let's assume I'll fix api.ts.
    apiService
      .getCategories('') // Passing empty string for now, relying on fix in api.ts
      .then((data) => {
        if (mounted) {
          setCategories(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load categories', err);
        if (mounted) {
          setCategories([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setCategoriesLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isTableLoading = useMemo(
    () => loadingState === 'initial',
    [loadingState],
  );

  // Filter products by selected store and category
  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedStoreFilter !== 'all') {
      result = result.filter(product =>
        product.stores?.some(store => store.id === selectedStoreFilter)
      );
    }

    if (selectedCategoryFilter !== 'all') {
      result = result.filter(product =>
        product.categoryDetail?.id === selectedCategoryFilter
      );
    }

    return [...result].sort((a, b) =>
      a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }) ||
      a.id.localeCompare(b.id)
    );
  }, [products, selectedStoreFilter, selectedCategoryFilter]);

  const handleCreate = () => {
    setSelectedProduct(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedProduct(null);
    setFormError(null);
  };

  const handleSubmit = async (payload: ProductInput) => {
    setFormLoading(true);
    setFormError(null);
    try {
      if (selectedProduct) {
        await apiService.updateProduct(selectedProduct.id, payload);
      } else {
        await apiService.createProduct(payload);
      }
      await loadProducts('refresh');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to save product.'));
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    setActionTargetId(productToDelete.id);
    setError(null);
    try {
      await apiService.deleteProduct(productToDelete.id);
      await loadProducts('refresh');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete product.'));
    } finally {
      setActionTargetId(null);
      setProductToDelete(null);
    }
  };

  const isRefreshing = loadingState === 'refresh';
  const hasSelectedStore = selectedStoreFilter !== 'all';

  const getSelectedStoreProduct = (product: Product) =>
    product.stores?.find((store) => store.id === selectedStoreFilter);

  const formatRupiah = (value?: number | null) =>
    value != null ? `Rp ${value.toLocaleString('id-ID')}` : '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-700">
            Manage product catalogue by store.
          </p>
        </div>
        <Button type="button" onClick={handleCreate} aria-label="Add Product" title="Add Product" >
          <Plus className="h-4 w-4 mr-1" />
          Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Store Filter */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <label htmlFor="store-filter" className="text-sm font-medium text-gray-700">
            Store:
          </label>
          <Select
            value={selectedStoreFilter}
            onValueChange={setSelectedStoreFilter}
            disabled={storesLoading}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.nickname || store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <label htmlFor="category-filter" className="text-sm font-medium text-gray-700">
            Category:
          </label>
          <Select
            value={selectedCategoryFilter}
            onValueChange={setSelectedCategoryFilter}
            disabled={categoriesLoading}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(selectedStoreFilter !== 'all' || selectedCategoryFilter !== 'all') && (
          <span className="text-sm text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
          </span>
        )}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Product
                </th>
                {hasSelectedStore ? (
                  <>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Price
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Stock
                    </th>
                  </>
                ) : null}
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isTableLoading ? (
                <tr>
                  <td colSpan={hasSelectedStore ? 5 : 3}>
                    <LoadingState message="Loading products..." />
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={hasSelectedStore ? 5 : 3}>
                    <EmptyState
                      title={selectedStoreFilter === 'all' ? "No products yet" : "No products in this store"}
                      description={selectedStoreFilter === 'all' ? "Create your first product to get started." : "No products are assigned to this store."}
                    />
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const selectedStoreProduct = getSelectedStoreProduct(product);

                  return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-gray-600">
                              No Image
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                            {product.type === 'bundle' ? (
                              <Badge variant="secondary">Paket</Badge>
                            ) : null}
                          </div>
                          {product.category ? (
                            <p className="text-xs text-gray-600">{product.category}</p>
                          ) : null}
                          {product.type === 'bundle' ? (
                            <p className="text-xs text-gray-600">
                              {product.bundleItems?.length ?? 0} components
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    {hasSelectedStore ? (
                      <>
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          {formatRupiah(selectedStoreProduct?.price)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-800">
                          {selectedStoreProduct?.stock != null
                            ? selectedStoreProduct.stock.toLocaleString('id-ID')
                            : '-'}
                        </td>
                      </>
                    ) : null}
                    <td className="px-4 py-4 text-sm">
                      <Badge variant={product.isActive ? 'default' : 'destructive'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          type="button"
                          // variant="info"
                          size="icon-sm"
                          onClick={() => handleEdit(product)}
                          aria-label="Edit Product"
                          title="Edit Product"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => handleDelete(product)}
                          disabled={actionTargetId === product.id}
                          aria-label="Delete Product"
                          title="Delete Product"
                        >
                          {actionTargetId === product.id ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0a12 12 0 100 24v-4a8 8 0 01-8-8z"></path></svg>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {isRefreshing && !isTableLoading ? (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-700">
            Refreshing data…
          </div>
        ) : null}
      </div>

      <ProductForm
        isOpen={isFormOpen}
        product={selectedProduct}
        loading={formLoading}
        error={formError}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        products={products}
        stores={stores}
        storesLoading={storesLoading}
      />

      <ConfirmationDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDelete}
        title="Konfirmasi Hapus Product"
        message={`Apakah Anda yakin ingin menghapus product "${productToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        loading={actionTargetId !== null}
      />
    </div>
  );
}
