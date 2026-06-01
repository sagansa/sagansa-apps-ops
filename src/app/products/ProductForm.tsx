'use client';

import { useEffect, useState } from 'react';
import {
  Product,
  ProductInput,
  ProductVariantInput,
  ProductVariantGroup,
  ProductVariantGroupInput,
  ProductModification,
  ProductModificationInput,
  ProductPriceInput,
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

type CombinationFormState = {
  variantIds: string[];
  name: string;
  price: string;
  stock: string;
  sku: string;
  isActive: boolean;
};

type CustomerTypeOption = {
  id: string;
  name: string;
  is_active?: boolean;
};

interface ProductFormProps {
  isOpen: boolean;
  product: Product | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: ProductInput) => Promise<void>;
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
  stores = [],
  storesLoading = false,
}: ProductFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
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
  const [customerTypesByStore, setCustomerTypesByStore] = useState<Record<string, CustomerTypeOption[]>>({});
  const [channelPrices, setChannelPrices] = useState<Record<string, Record<string, string>>>({});
  const [channelPricesLoading, setChannelPricesLoading] = useState(false);

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
      setCustomerTypesByStore({});
      setChannelPrices({});
      setCategoryId('');
      return;
    }

    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setPrice(product.price.toString());
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
      setCustomerTypesByStore({});
      setChannelPrices({});
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

  useEffect(() => {
    if (!isOpen || !product?.id || !storeSelectionsInitialized) {
      return;
    }

    const selectedStoreIds = Object.entries(storeSelections)
      .filter(([, state]) => state.selected)
      .map(([storeId]) => storeId);

    if (selectedStoreIds.length === 0) {
      setCustomerTypesByStore({});
      setChannelPrices({});
      return;
    }

    let cancelled = false;
    setChannelPricesLoading(true);

    Promise.all(selectedStoreIds.map(async (storeId) => {
      const [types, prices] = await Promise.all([
        apiService.getCustomerTypes(storeId),
        apiService.getProductPrices({ storeId, productId: product.id }),
      ]);

      return { storeId, types, prices };
    }))
      .then((results) => {
        if (cancelled) return;

        const nextTypes: Record<string, CustomerTypeOption[]> = {};
        const nextPrices: Record<string, Record<string, string>> = {};

        results.forEach(({ storeId, types, prices }) => {
          nextTypes[storeId] = (types as CustomerTypeOption[]).filter((type) => type.is_active !== false);
          nextPrices[storeId] = {};

          prices.forEach((priceRow) => {
            nextPrices[storeId][buildChannelPriceKey(priceRow.variantId ?? null, priceRow.customerTypeId)] = String(priceRow.price);
          });
        });

        setCustomerTypesByStore(nextTypes);
        setChannelPrices(nextPrices);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load channel prices', err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChannelPricesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, product?.id, storeSelections, storeSelectionsInitialized]);

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

  const buildChannelPriceKey = (variantId: string | null, customerTypeId: string) => `${variantId ?? 'base'}:${customerTypeId}`;

  const handleChannelPriceChange = (storeId: string, variantId: string | null, customerTypeId: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const key = buildChannelPriceKey(variantId, customerTypeId);

    setChannelPrices((prev) => ({
      ...prev,
      [storeId]: {
        ...(prev[storeId] ?? {}),
        [key]: cleaned,
      },
    }));
  };

  const getChannelPriceTargets = () => {
    const targets = [
      {
        variantId: null as string | null,
        name: 'Harga dasar',
        basePrice: price !== '' ? Number(price) : product?.price ?? 0,
      },
    ];

    (product?.variantCombinations ?? []).forEach((combination) => {
      targets.push({
        variantId: combination.id,
        name: combination.name,
        basePrice: combination.price,
      });
    });

    return targets;
  };

  const saveChannelPrices = async () => {
    if (!product?.id) {
      return;
    }

    const selectedStoreIds = Object.entries(storeSelections)
      .filter(([, state]) => state.selected)
      .map(([storeId]) => storeId);

    await Promise.all(selectedStoreIds.map((storeId) => {
      const types = customerTypesByStore[storeId] ?? [];
      const prices: ProductPriceInput[] = [];

      if (types.length === 0) {
        return Promise.resolve([]);
      }

      getChannelPriceTargets().forEach((target) => {
        types.forEach((type) => {
          const value = channelPrices[storeId]?.[buildChannelPriceKey(target.variantId, type.id)] ?? '';

          if (value !== '') {
            prices.push({
              store_id: storeId,
              product_id: product.id,
              variant_id: target.variantId,
              customer_type_id: type.id,
              price: Number(value),
              is_active: true,
            });
          }
        });
      });

      return apiService.saveProductPrices({
        storeId,
        productId: product.id,
        prices,
      });
    }));
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

    const priceValue = price !== '' ? Number(price) : 0;
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setLocalError('Price must be a valid non-negative number.');
      return;
    }

    const stockValue = stock !== '' ? Number(stock) : 0;
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      setLocalError('Stock must be a valid non-negative number.');
      return;
    }

    const payload: ProductInput = {
      name: name.trim(),
      description: description.trim() || null,
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
      await saveChannelPrices();
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
                    <Input type="number" min="0" step="100" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
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
                      onUpdateFiles={(fileItems) => {
                        setFilePondFiles(fileItems.map((fileItem) => fileItem.file));
                        if (fileItems.length > 0) {
                          const file = fileItems[0].file;
                          if (file instanceof File) {
                            setImageFile(file);
                            setRemoveImage(false);
                          }
                        } else {
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
                    Optional. Initials will be shown if no image provided.
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
                            className="h-3 w-3 rounded border-gray-300 text-amber-600 focus:ring-amber-600"
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
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
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
                  className="w-full border-dashed border-2 border-gray-300 text-gray-600 hover:border-amber-500 hover:text-amber-600 py-3"
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
              <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
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
                              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-600"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-green-700 italic">
                  ✨ Realtime: Combinations auto-update saat Anda ubah variant groups!
                </p>
              </section>
            )}

            <section className="space-y-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Harga Channel</h3>
                  <p className="mt-1 text-xs text-gray-600">
                    Berlaku untuk customer type seperti Gojek, Grab, dan ShopeeFood.
                  </p>
                </div>
                {channelPricesLoading && (
                  <span className="text-xs text-gray-500">Loading...</span>
                )}
              </div>

              {!product ? (
                <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  Simpan produk terlebih dahulu untuk mengatur harga channel.
                </p>
              ) : Object.entries(storeSelections).filter(([, state]) => state.selected).length === 0 ? (
                <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  Pilih store pada Availability untuk mengatur harga channel.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(storeSelections)
                    .filter(([, state]) => state.selected)
                    .map(([storeId]) => {
                      const store = stores.find((item) => item.id === storeId);
                      const customerTypes = customerTypesByStore[storeId] ?? [];
                      const targets = getChannelPriceTargets();

                      return (
                        <div key={storeId} className="overflow-hidden rounded-lg border border-gray-200">
                          <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
                            <p className="text-sm font-medium text-gray-900">{store?.nickname || store?.name || 'Store'}</p>
                          </div>

                          {customerTypes.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-gray-600">Belum ada customer type aktif untuk store ini.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Harga</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Default</th>
                                    {customerTypes.map((type) => (
                                      <th key={type.id} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {type.name}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                  {targets.map((target) => (
                                    <tr key={target.variantId ?? 'base'}>
                                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{target.name}</td>
                                      <td className="px-3 py-2 text-sm text-gray-600">Rp {Number(target.basePrice || 0).toLocaleString('id-ID')}</td>
                                      {customerTypes.map((type) => {
                                        const key = buildChannelPriceKey(target.variantId, type.id);
                                        return (
                                          <td key={type.id} className="px-3 py-2">
                                            <Input
                                              type="number"
                                              min="0"
                                              step="100"
                                              value={channelPrices[storeId]?.[key] ?? ''}
                                              onChange={(e) => handleChannelPriceChange(storeId, target.variantId, type.id, e.target.value)}
                                              placeholder="Default"
                                              className="w-32"
                                            />
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Modifications</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-amber-600 hover:text-amber-700"
                  onClick={() => setModifications((prev) => [...prev, defaultModification()])}
                >
                  Add Modification
                </Button>
              </div>
              {modifications.length === 0 ? (
                <p className="text-sm text-gray-600">No modifications defined.</p>
              ) : (
                <div className="space-y-3">
                  {modifications.map((modification, index) => (
                    <div key={`modification-${index}`} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
                          <Input
                            value={modification.name}
                            onChange={(e) => handleModificationChange(index, 'name', e.target.value)}
                            placeholder="Modification name"
                          />
                          <Input
                            type="number"
                            min="0"
                            value={modification.price}
                            onChange={(e) => handleModificationChange(index, 'price', e.target.value)}
                            placeholder="Additional price"
                          />
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <label className="inline-flex items-center space-x-2 text-xs text-gray-600">
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
                            className="text-red-500 hover:text-red-600"
                            onClick={() => setModifications((prev) => prev.filter((_, idx) => idx !== index))}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Availability</h3>
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
