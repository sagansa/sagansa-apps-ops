'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BundlePricingMode,
  Product,
  ProductInput,
  ProductType,
  ProductVariantInput,
  ProductVariantGroup,
  ProductVariantGroupInput,
  ProductModification,
  ProductModificationInput,
} from '@/app/services/api';
import apiService from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { VariantGroupModal } from './VariantGroupModal';
import { FormField } from '@/components/ui/FormField';
import { FilePondUploader } from '@/components/ui/FilePondUploader';
import { compressImageFile } from '@/app/utils/imageCompression';

type VariantGroupFormState = {
  id?: string;
  name: string;
  isRequired: boolean;
  variants: string[]; // Just array of variant names
};

type ModificationFormState = {
  name: string;
  price: string;
  isActive: boolean;
};

type StoreSelectionState = {
  selected: boolean;
  price: string;
};

type BundleItemFormState = {
  componentProductId: string;
  quantity: string;
};

type CombinationFormState = {
  variantIds: string[];
  name: string;
  price: string;
  stock: string;
  sku: string;
  isActive: boolean;
};

interface ProductFormProps {
  isOpen: boolean;
  product: Product | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: ProductInput) => Promise<void>;
  products: Product[];
  stores: { id: string; name: string; nickname?: string | null }[];
  storesLoading: boolean;
}

const defaultModification = (): ModificationFormState => ({
  name: '',
  price: '',
  isActive: true,
});

const mapVariantGroupToState = (group: ProductVariantGroup): VariantGroupFormState => ({
  id: group.id,
  name: group.name,
  isRequired: group.isRequired,
  variants: group.variants.map(v => v.name), // Just extract names
});

const mapModificationToState = (modification: ProductModification): ModificationFormState => ({
  name: modification.name,
  price: modification.price != null ? modification.price.toString() : '',
  isActive: modification.isActive ?? true,
});

const toVariantGroupInput = (state: VariantGroupFormState): ProductVariantGroupInput => ({
  id: state.id,
  name: state.name.trim(),
  isRequired: state.isRequired,
  variants: state.variants.map(name => ({
    name: name.trim(),
    // No sku/price/stock - backend will handle as nullable
  })) as ProductVariantInput[],
});

const toModificationInput = (state: ModificationFormState): ProductModificationInput => ({
  name: state.name.trim(),
  price: state.price !== '' ? Number(state.price) : undefined,
  isActive: state.isActive,
});

const ProductForm = ({
  isOpen,
  product,
  loading,
  error,
  onClose,
  onSubmit,
  products = [],
  stores = [],
  storesLoading = false,
}: ProductFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [productType, setProductType] = useState<ProductType>('single');
  const [bundlePricingMode, setBundlePricingMode] = useState<BundlePricingMode>('fixed');
  const [bundleItems, setBundleItems] = useState<BundleItemFormState[]>([]);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [request, setRequest] = useState(false);
  const [remaining, setRemaining] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filePondFiles, setFilePondFiles] = useState<File[]>([]);
  const [removeImage, setRemoveImage] = useState(false);
  const [variantGroups, setVariantGroups] = useState<VariantGroupFormState[]>([]);
  const [storeSelections, setStoreSelections] = useState<Record<string, StoreSelectionState>>({});
  const [storeSelectionsInitialized, setStoreSelectionsInitialized] = useState(false);
  const [combinations, setCombinations] = useState<CombinationFormState[]>([]);
  const [modifications, setModifications] = useState<ModificationFormState[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const allStoresSelected = stores.length > 0 && stores.every((store) => storeSelections[store.id]?.selected);
  const bundleComponentOptions = useMemo(
    () => products
      .filter((candidate) => candidate.id !== product?.id && candidate.type !== 'bundle')
      .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })),
    [product?.id, products],
  );
  const bundleComponentTotal = useMemo(
    () => bundleItems.reduce((total, item) => {
      const component = bundleComponentOptions.find((candidate) => candidate.id === item.componentProductId);
      const quantity = item.quantity !== '' ? Number(item.quantity) : 0;

      if (!component || !Number.isFinite(quantity) || quantity <= 0) {
        return total;
      }

      return total + (component.price * quantity);
    }, 0),
    [bundleComponentOptions, bundleItems],
  );

  // ...

  // Fetch categories on mount
  useEffect(() => {
    apiService.getCategories('').then(data => setCategories(data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setLocalError(null);
      setImageFile(null);
      setFilePondFiles([]);
      setRemoveImage(false);
      setStoreSelections({});
      setStoreSelectionsInitialized(false);
      setCategoryId('');
      return;
    }

    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setPrice(product.price.toString());
      setProductType(product.type ?? 'single');
      setBundlePricingMode(product.bundlePricingMode ?? 'fixed');
      setBundleItems(product.bundleItems?.map((item) => ({
        componentProductId: item.componentProductId,
        quantity: item.quantity.toString(),
      })) ?? []);
      setSku(product.sku);
      setBarcode(product.barcode || '');
      setStock(product.stock.toString());
      setCategoryId(product.categoryDetail?.id || '');
      setRequest(product.request);
      setRemaining(product.remaining);
      setIsActive(product.isActive);
      setRemoveImage(false);

      if (product.imageUrl) {
        // Use proxy to bypass CORS
        let fetchUrl = product.imageUrl;
        if (fetchUrl.includes('localhost:8000')) {
          // Replace origin with proxy path AND strip /storage because rewrite adds it back
          fetchUrl = fetchUrl.replace(/^https?:\/\/[^/]+\/storage/, '/backend-storage');
        } else if (fetchUrl.includes('192.168.0.121:8000')) {
          fetchUrl = fetchUrl.replace(/^https?:\/\/[^/]+\/storage/, '/backend-storage');
        }

        // Fetch the image to display it in FilePond as a "local" file
        fetch(fetchUrl)
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch image');
            return res.blob();
          })
          .then(blob => {
            const file = new File([blob], 'existing-image.jpg', { type: blob.type });
            setFilePondFiles([file]);
          })
          .catch(err => {
            console.error('Failed to load existing image', err);
            // Fallback: try to show it anyway (FilePond might fail to preview but at least it's there)
            // But since storeAsFile=true expects a File, we can't do much else.
            setFilePondFiles([]);
          });
      } else {
        setFilePondFiles([]);
      }

      setVariantGroups(product.variantGroups?.map(mapVariantGroupToState) || []);
      setModifications(product.modifications?.map(mapModificationToState) || []);

    } else {
      setName('');
      setDescription('');
      setPrice('');
      setProductType('single');
      setBundlePricingMode('fixed');
      setBundleItems([]);
      setSku('');
      setBarcode('');
      setStock('');
      setRequest(false);
      setRemaining(true);
      setIsActive(true);
      setRemoveImage(false);
      setFilePondFiles([]);
      setVariantGroups([]);
      setVariantGroups([]);
      setModifications([]);
      setStoreSelections({});
      setStoreSelectionsInitialized(false);
    }
  }, [isOpen, product]);

  // ...


  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (stores.length === 0) {
      return;
    }

    if (storeSelectionsInitialized) {
      setStoreSelections((prev) => {
        const next: Record<string, StoreSelectionState> = {};
        let changed = false;

        stores.forEach((store) => {
          const existing = prev[store.id];
          if (existing) {
            next[store.id] = existing;
          } else {
            next[store.id] = { selected: false, price: '' };
            changed = true;
          }
        });

        if (Object.keys(next).length !== Object.keys(prev).length) {
          changed = true;
        }

        return changed ? next : prev;
      });

      return;
    }

    const initial: Record<string, StoreSelectionState> = {};
    stores.forEach((store) => {
      const existing = product?.stores?.find((storeEntry) => storeEntry.id === store.id);
      initial[store.id] = {
        selected: Boolean(existing),
        price: existing?.price != null ? existing.price.toString() : '',
      };
    });

    setStoreSelections(initial);
    setStoreSelectionsInitialized(true);
  }, [isOpen, product, stores, storeSelectionsInitialized]);

  // Auto-generate combinations whenever variant groups change (Realtime like Shopee)
  useEffect(() => {
    const cartesianProduct = (arrays: string[][]): string[][] => {
      if (arrays.length === 0) return [[]];
      let result: string[][] = [[]];
      for (const array of arrays) {
        const temp: string[][] = [];
        for (const resultItem of result) {
          for (const value of array) {
            temp.push([...resultItem, value]);
          }
        }
        result = temp;
      }
      return result;
    };

    const groupsWithVariants = variantGroups.filter(
      (group) => group.variants.length > 0 && group.variants.some((v) => v.trim() !== '')
    );

    if (groupsWithVariants.length === 0) {
      setCombinations([]);
      return;
    }

    const variantArrays = groupsWithVariants.map((group) =>
      group.variants
        .map((_, idx) => `${group.name}:${idx}`)
        .filter((_, idx) => group.variants[idx].trim() !== '')
    );

    const combos = cartesianProduct(variantArrays);
    const newCombinations: CombinationFormState[] = combos.map((combo) => {
      const variantNames = combo.map((vKey) => {
        const [groupName, vIdx] = vKey.split(':');
        const group = groupsWithVariants.find((g) => g.name === groupName);
        return (group?.variants[parseInt(vIdx)] || '').trim();
      });

      const name = variantNames.filter(Boolean).join(' × ');

      // Try to find existing combination in current state to preserve user edits
      const existing = combinations.find(c => c.name === name);

      // Try to find existing combination in saved product data (fallback)
      const saved = product?.variantCombinations?.find(c => c.name === name);

      return {
        variantIds: combo,
        name,
        price: existing?.price ?? (saved ? saved.price.toString() : (price || '0')),
        stock: existing?.stock ?? (saved ? saved.stock.toString() : '0'),
        sku: existing?.sku ?? saved?.sku ?? '',
        isActive: existing?.isActive ?? saved?.isActive ?? true,
      };
    });

    setCombinations(newCombinations);
  }, [variantGroups, price]);

  const handleVariantGroupChange = (
    index: number,
    key: keyof VariantGroupFormState,
    value: string | boolean,
  ) => {
    setVariantGroups((prev) =>
      prev.map((group, idx) =>
        idx === index
          ? { ...group, [key]: value }
          : group,
      ),
    );
  };

  const handleAddGroup = () => {
    setEditingGroupIndex(null);
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (index: number) => {
    setEditingGroupIndex(index);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = (name: string, variants: string[]) => {
    if (editingGroupIndex !== null) {
      // Update existing group
      setVariantGroups(prev => prev.map((group, idx) =>
        idx === editingGroupIndex
          ? { ...group, name, variants }
          : group
      ));
    } else {
      // Add new group
      setVariantGroups(prev => [...prev, {
        name,
        isRequired: true,
        variants
      }]);
    }
    setIsGroupModalOpen(false);
    setEditingGroupIndex(null);
  };

  const handleRemoveGroup = (index: number) => {
    setVariantGroups(prev => prev.filter((_, i) => i !== index));
  };

  const handleModificationChange = (
    index: number,
    key: keyof ModificationFormState,
    value: string | boolean,
  ) => {
    setModifications((prev) =>
      prev.map((modification, idx) =>
        idx === index
          ? { ...modification, [key]: value }
          : modification,
      ),
    );
  };

  const handleBundleItemChange = (
    index: number,
    key: keyof BundleItemFormState,
    value: string,
  ) => {
    setBundleItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, [key]: value }
          : item,
      ),
    );
  };

  const handleCombinationChange = (
    index: number,
    key: keyof CombinationFormState,
    value: string | boolean | string[],
  ) => {
    setCombinations((prev) =>
      prev.map((combination, idx) =>
        idx === index
          ? { ...combination, [key]: value }
          : combination,
      ),
    );
  };

  const toggleStore = (storeId: string) => {
    setStoreSelections((prev) => {
      const current = prev[storeId] ?? { selected: false, price: '' };
      return {
        ...prev,
        [storeId]: {
          ...current,
          selected: !current.selected,
        },
      };
    });
  };

  const toggleAllStores = () => {
    setStoreSelections((prev) => {
      const shouldSelectAll = !stores.every((store) => prev[store.id]?.selected);
      const next: Record<string, StoreSelectionState> = {};

      stores.forEach((store) => {
        const current = prev[store.id] ?? { selected: false, price: '' };
        next[store.id] = {
          ...current,
          selected: shouldSelectAll,
        };
      });

      return next;
    });
  };

  const handleStorePriceChange = (storeId: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setStoreSelections((prev) => {
      return {
        ...prev,
        [storeId]: {
          selected: true,
          price: cleaned,
        },
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Product name is required.');
      return;
    }

    // SKU is optional now (auto-generated)
    // Image is optional now (initials fallback)

    const priceValue = productType === 'bundle' && bundlePricingMode === 'sum_components'
      ? bundleComponentTotal
      : (price !== '' ? Number(price) : 0);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setLocalError('Price must be a valid non-negative number.');
      return;
    }

    const stockValue = stock !== '' ? Number(stock) : 0;
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      setLocalError('Stock must be a valid non-negative number.');
      return;
    }

    const bundlePayload = bundleItems
      .map((item, index) => ({
        component_product_id: item.componentProductId,
        quantity: item.quantity !== '' ? Number(item.quantity) : 0,
        sort_order: index,
      }))
      .filter((item) => item.component_product_id !== '');

    if (productType === 'bundle') {
      if (bundlePayload.length === 0) {
        setLocalError('Bundle products must have at least one component.');
        return;
      }

      if (bundlePayload.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
        setLocalError('Bundle component quantity must be at least 1.');
        return;
      }

      const uniqueComponentIds = new Set(bundlePayload.map((item) => item.component_product_id));
      if (uniqueComponentIds.size !== bundlePayload.length) {
        setLocalError('Bundle components cannot be duplicated.');
        return;
      }
    }

    const payload: ProductInput = {
      name: name.trim(),
      description: description.trim() || null,
      type: productType,
      bundle_pricing_mode: productType === 'bundle' ? bundlePricingMode : 'fixed',
      price: priceValue,
      sku: sku.trim(),
      barcode: barcode.trim() || null,
      stock: stockValue,
      request,
      remaining,
      is_active: isActive,
      imageFile,
      remove_image: removeImage, // Add this flag
      category_id: categoryId || undefined, // Add category assignment

      variant_groups: variantGroups.map(toVariantGroupInput),
      variants: combinations.map(c => ({
        name: c.name,
        price: Number(c.price),
        stock: Number(c.stock),
        sku: c.sku,
        isActive: c.isActive
      })),
      modifications: modifications.map(toModificationInput),
      bundle_items: productType === 'bundle' ? bundlePayload : [],
    };

    const selectedStores = Object.entries(storeSelections)
      .filter(([, state]) => state.selected)
      .map(([id, state]) => ({
        id,
        price: state.price !== '' ? Number(state.price) : undefined,
      }));

    const invalidStorePrice = selectedStores.some(
      (store) => store.price !== undefined && (!Number.isFinite(store.price) || store.price < 0),
    );

    if (invalidStorePrice) {
      setLocalError('Store prices must be valid non-negative numbers.');
      return;
    }

    payload.stores = selectedStores;
    payload.store_ids = selectedStores.map((store) => store.id);

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setLocalError(getErrorMessage(err, 'Failed to save product.'));
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {product ? 'Edit Product' : 'Create Product'}
            </h2>
            <p className="text-xs text-gray-600">
              {product
                ? 'Update product details, variants, and modifications.'
                : 'Add a new product to the catalogue.'}
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            &#10005;
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-0">
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
            {(localError || error) && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                {localError || error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <FormField label="Product Name" required>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter product name" />
                </FormField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Product Type">
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value as ProductType)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="single">Single Product</option>
                      <option value="bundle">Bundle / Paket</option>
                    </select>
                  </FormField>
                  {productType === 'bundle' ? (
                    <FormField label="Bundle Price">
                      <select
                        value={bundlePricingMode}
                        onChange={(e) => setBundlePricingMode(e.target.value as BundlePricingMode)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="fixed">Manual Price</option>
                        <option value="sum_components">Sum Components</option>
                      </select>
                    </FormField>
                  ) : null}
                </div>
                <FormField label="SKU">
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Auto-generated if empty (e.g. GA-AY-1234)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to auto-generate: &#123;TENANT&#125;-&#123;PRODUCT&#125;-&#123;RANDOM&#125;
                  </p>
                </FormField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Price (Rp)" required>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={productType === 'bundle' && bundlePricingMode === 'sum_components' ? String(bundleComponentTotal) : price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={productType === 'bundle' && bundlePricingMode === 'sum_components'}
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Barcode">
                    <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional barcode" />
                  </FormField>
                </div>
                <FormField label="Description">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the product..." />
                </FormField>

                <FormField label="Category">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- No Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                {productType === 'bundle' ? (
                  <section className="space-y-3 rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Bundle Components</h3>
                        <p className="text-xs text-gray-600">
                          Est. price Rp {bundleComponentTotal.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBundleItems((prev) => [...prev, { componentProductId: '', quantity: '1' }])}
                        disabled={bundleComponentOptions.length === 0}
                      >
                        Add Component
                      </Button>
                    </div>
                    {bundleItems.length === 0 ? (
                      <p className="text-sm text-gray-600">No components selected.</p>
                    ) : (
                      <div className="space-y-2">
                        {bundleItems.map((item, index) => {
                          const selectedIds = new Set(
                            bundleItems
                              .filter((_, idx) => idx !== index)
                              .map((entry) => entry.componentProductId),
                          );

                          return (
                            <div key={`bundle-item-${index}`} className="grid items-center gap-2 rounded-md border border-gray-200 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_96px_80px]">
                              <select
                                value={item.componentProductId}
                                onChange={(e) => handleBundleItemChange(index, 'componentProductId', e.target.value)}
                                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select component</option>
                                {bundleComponentOptions.map((component) => (
                                  <option
                                    key={component.id}
                                    value={component.id}
                                    disabled={selectedIds.has(component.id)}
                                  >
                                    {component.name} - Rp {component.price.toLocaleString('id-ID')} - stock {component.stock}
                                  </option>
                                ))}
                              </select>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleBundleItemChange(index, 'quantity', e.target.value)}
                                placeholder="Qty"
                                className="h-9"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 text-red-500 hover:text-red-600"
                                onClick={() => setBundleItems((prev) => prev.filter((_, idx) => idx !== index))}
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ) : null}

              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Stock">
                      <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
                    </FormField>
                  </div>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex items-center space-x-2 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50">
                      <Checkbox
                        id="product-request-toggle"
                        checked={request}
                        onCheckedChange={(checked) => setRequest(checked === true)}
                      />
                      <label htmlFor="product-request-toggle" className="cursor-pointer text-xs font-medium text-gray-700">
                        Request Only
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50">
                      <Checkbox
                        id="product-remaining-toggle"
                        checked={remaining}
                        onCheckedChange={(checked) => setRemaining(checked === true)}
                      />
                      <label htmlFor="product-remaining-toggle" className="cursor-pointer text-xs font-medium text-gray-700">
                        Track Stock
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50">
                      <Checkbox
                        id="product-active-toggle"
                        checked={isActive}
                        onCheckedChange={(checked) => setIsActive(checked === true)}
                      />
                      <label htmlFor="product-active-toggle" className="cursor-pointer text-xs font-medium text-gray-700">
                        Active
                      </label>
                    </div>
                  </div>
                </div>
                <FormField label="Product Image">
                  <div className="mt-1">
                    <FilePondUploader
                      files={filePondFiles}
                      onUpdateFiles={async (fileItems) => {
                        setFilePondFiles(fileItems.map((fileItem) => fileItem.file as File));
                        if (fileItems.length > 0) {
                          const file = fileItems[0].file;
                          if (file instanceof File) {
                            try {
                              const compressedFile = await compressImageFile(file);
                              setImageFile(compressedFile);
                              setRemoveImage(false);
                              setLocalError(null);
                            } catch (error) {
                              console.error('Failed to compress product image:', error);
                              setLocalError('Gagal memproses gambar. Coba gunakan file gambar lain.');
                              setFilePondFiles([]);
                              setImageFile(null);
                            }
                          }
                        } else {
                          setFilePondFiles([]);
                          setImageFile(null);
                          if (product?.image) {
                            setRemoveImage(true);
                          }
                        }
                      }}
                      allowMultiple={false}
                      maxFiles={1}
                      labelIdle='Drag & Drop your image or <span class="filepond--label-action">Browse</span>'
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Optional. Gambar akan dikonversi ke WebP dan dibatasi maksimal 1200x1200 px sebelum upload.
                  </p>
                </FormField>
              </div>
            </div>

            <section className="space-y-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Variant Groups</h3>
              </div>

              <div className="space-y-4">
                {variantGroups.map((group, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-semibold text-gray-900">{group.name}</h4>
                        <label className="inline-flex items-center space-x-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={group.isRequired}
                            onChange={(e) => handleVariantGroupChange(index, 'isRequired', e.target.checked)}
                            className="h-3 w-3 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                          />
                          <span>Required Selection</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGroup(index)}
                          className="text-gray-700 hover:bg-gray-100"
                        >
                          Edit Options
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveGroup(index)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {group.variants.map((variantName, vIdx) => (
                        <span
                          key={vIdx}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {variantName}
                        </span>
                      ))}
                      {group.variants.length === 0 && (
                        <span className="text-xs text-gray-400 italic">No options added</span>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddGroup}
                  className="w-full border-dashed border-2 border-gray-300 text-gray-700 hover:border-gray-500 py-3"
                >
                  + Add Variant Group
                </Button>
              </div>
            </section>

            {/* Variant Group Modal */}
            <VariantGroupModal
              isOpen={isGroupModalOpen}
              group={editingGroupIndex !== null ? {
                name: variantGroups[editingGroupIndex].name,
                variants: variantGroups[editingGroupIndex].variants
              } : null}
              onSave={handleSaveGroup}
              onClose={() => {
                setIsGroupModalOpen(false);
                setEditingGroupIndex(null);
              }}
            />

            {/* Realtime Variant Combinations Table (Shopee Style) */}
            {combinations.length > 0 && (
              <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Daftar Variasi</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {combinations.length} kombinasi • Edit langsung price & stock untuk setiap kombinasi
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto bg-white rounded-lg border border-gray-300">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Variasi</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 w-32">Harga (Rp)</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 w-24">Stok</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 w-32">SKU</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 w-20">Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {combinations.map((combo, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{combo.name}</td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min="0"
                              value={combo.price}
                              onChange={(e) => handleCombinationChange(index, 'price', e.target.value)}
                              className="text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min="0"
                              value={combo.stock}
                              onChange={(e) => handleCombinationChange(index, 'stock', e.target.value)}
                              className="text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="text"
                              value={combo.sku}
                              onChange={(e) => handleCombinationChange(index, 'sku', e.target.value)}
                              placeholder="Optional"
                              className="text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={combo.isActive}
                              onChange={(e) => handleCombinationChange(index, 'isActive', e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-600 italic">
                  Combinations auto-update saat Anda ubah variant groups.
                </p>
              </section>
            )}

            <section className="space-y-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Modifications</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModifications((prev) => [...prev, defaultModification()])}
                >
                  Add Modification
                </Button>
              </div>
              {modifications.length === 0 ? (
                <p className="text-sm text-gray-600">No modifications defined.</p>
              ) : (
                <div className="space-y-2">
                  {modifications.map((modification, index) => (
                    <div key={`modification-${index}`} className="rounded-md border border-gray-200 bg-white p-2">
                      <div className="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_160px_96px_80px]">
                        <div className="min-w-0">
                          <Input
                            value={modification.name}
                            onChange={(e) => handleModificationChange(index, 'name', e.target.value)}
                            placeholder="Modification name"
                            className="h-9"
                          />
                        </div>
                        <Input
                          type="number"
                          min="0"
                          value={modification.price}
                          onChange={(e) => handleModificationChange(index, 'price', e.target.value)}
                          placeholder="Additional price"
                          className="h-9"
                        />
                        <label className="inline-flex h-9 items-center space-x-2 rounded-md border border-gray-100 px-2 text-xs text-gray-600">
                          <Checkbox
                            checked={modification.isActive}
                            onCheckedChange={(checked) =>
                              handleModificationChange(index, 'isActive', checked === true)
                            }
                          />
                          <span>Active</span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 text-red-500 hover:text-red-600"
                          onClick={() => setModifications((prev) => prev.filter((_, idx) => idx !== index))}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">Availability</h3>
                {stores.length > 0 && (
                  <label className="inline-flex items-center space-x-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700">
                    <Checkbox
                      checked={allStoresSelected}
                      onCheckedChange={toggleAllStores}
                      disabled={storesLoading}
                    />
                    <span>Select all</span>
                  </label>
                )}
              </div>
              {storesLoading ? (
                <p className="text-sm text-gray-600">Loading store list...</p>
              ) : stores.length === 0 ? (
                <p className="text-sm text-gray-600">No stores available.</p>
              ) : (
                <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto border border-gray-100 p-3 sm:grid-cols-2">
                  {stores.map((store) => {
                    const selection = storeSelections[store.id] ?? { selected: false, price: '' };
                    return (
                      <div key={store.id} className="flex items-center justify-between space-x-2 rounded-md border border-gray-100 p-2 hover:bg-gray-50">
                        <label className="flex flex-1 items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                          <Checkbox
                            checked={selection.selected}
                            onCheckedChange={() => toggleStore(store.id)}
                          />
                          <span className="truncate" title={store.name}>{store.nickname || store.name}</span>
                        </label>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-600">Rp</span>
                          <Input
                            type="number"
                            min="0"
                            value={selection.price}
                            onChange={(e) => handleStorePriceChange(store.id, e.target.value)}
                            disabled={!selection.selected}
                            className="w-28 px-2 py-1"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
          <div className="flex items-center justify-end space-x-3 border-t border-gray-200 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : product ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
