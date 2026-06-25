'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BundlePricingMode,
  Product,
  ProductInput,
  ProductModification,
  ProductModificationInput,
  ProductVariantGroup,
  ProductVariantGroupInput,
  ProductType,
} from '@/app/services/api';
import apiService from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { useImageField } from '@/hooks/useImageField';
import { SortableList } from '@/components/ui/SortableList';

type StoreSelectionState = {
  selected: boolean;
  price: string;
  stock: string;
};

type BundleItemFormState = {
  componentProductId: string;
  quantity: string;
};

type VariantOptionFormState = {
  name: string;
  price: string;
  stock: string;
  isActive: boolean;
};

type VariantGroupFormState = {
  name: string;
  isRequired: boolean;
  variants: VariantOptionFormState[];
};

type ModificationFormState = {
  name: string;
  price: string;
  isActive: boolean;
  linkedProductId: string;
  linkedProductQuantity: string;
};

const defaultVariantOption = (): VariantOptionFormState => ({
  name: '',
  price: '',
  stock: '',
  isActive: true,
});

const defaultVariantGroup = (): VariantGroupFormState => ({
  name: '',
  isRequired: false,
  variants: [defaultVariantOption()],
});

const mapVariantGroupToState = (group: ProductVariantGroup): VariantGroupFormState => ({
  name: group.name,
  isRequired: group.isRequired,
  variants: group.variants.length > 0
    ? group.variants.map((variant) => ({
      name: variant.name,
      price: variant.price != null ? variant.price.toString() : '',
      stock: variant.stock != null ? variant.stock.toString() : '',
      isActive: variant.isActive ?? true,
    }))
    : [defaultVariantOption()],
});

const toVariantGroupInput = (group: VariantGroupFormState): ProductVariantGroupInput => ({
  name: group.name.trim(),
  isRequired: group.isRequired,
  variants: group.variants
    .filter((variant) => variant.name.trim() !== '')
    .map((variant) => ({
      name: variant.name.trim(),
      price: variant.price !== '' ? Number(variant.price) : undefined,
      stock: variant.stock !== '' ? Number(variant.stock) : undefined,
      isActive: variant.isActive,
    })),
});

const defaultModification = (): ModificationFormState => ({
  name: '',
  price: '',
  isActive: true,
  linkedProductId: '',
  linkedProductQuantity: '1',
});

const mapModificationToState = (modification: ProductModification): ModificationFormState => ({
  name: modification.name,
  price: modification.price != null ? modification.price.toString() : '',
  isActive: modification.isActive ?? true,
  linkedProductId: modification.linkedProductId ?? '',
  linkedProductQuantity: modification.linkedProductQuantity != null
    ? modification.linkedProductQuantity.toString()
    : '1',
});

const toModificationInput = (modification: ModificationFormState): ProductModificationInput => ({
  name: modification.name.trim(),
  price: modification.price !== '' ? Number(modification.price) : undefined,
  isActive: modification.isActive,
  linkedProductId: modification.linkedProductId || null,
  linkedProductQuantity: modification.linkedProductId
    ? (modification.linkedProductQuantity !== '' ? Number(modification.linkedProductQuantity) : 1)
    : null,
});

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
  const [productType, setProductType] = useState<ProductType>('single');
  const [bundlePricingMode, setBundlePricingMode] = useState<BundlePricingMode>('fixed');
  const [bundleItems, setBundleItems] = useState<BundleItemFormState[]>([]);
  const [variantGroups, setVariantGroups] = useState<VariantGroupFormState[]>([]);
  const [modifications, setModifications] = useState<ModificationFormState[]>([]);
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [remaining, setRemaining] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const productImage = useImageField({
    currentImageUrl: product?.imageUrl,
    hasExistingImage: !!product?.image,
  });
  const resetProductImage = productImage.reset;
  const [storeSelections, setStoreSelections] = useState<Record<string, StoreSelectionState>>({});
  const [storeSelectionsInitialized, setStoreSelectionsInitialized] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const allStoresSelected = stores.length > 0 && stores.every((store) => storeSelections[store.id]?.selected);
  const bundleComponentOptions = useMemo(
    () => products
      .filter((candidate) => candidate.id !== product?.id && candidate.type !== 'bundle')
      .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })),
    [product?.id, products],
  );
  const linkedModificationProductOptions = bundleComponentOptions;
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
      resetProductImage();
      setStoreSelections({});
      setStoreSelectionsInitialized(false);
      setCategoryId('');
      return;
    }

    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setProductType(product.type ?? 'single');
      setBundlePricingMode(product.bundlePricingMode ?? 'fixed');
      setBundleItems(product.bundleItems?.map((item) => ({
        componentProductId: item.componentProductId,
        quantity: item.quantity.toString(),
      })) ?? []);
      setVariantGroups(product.variantGroups?.map(mapVariantGroupToState) ?? []);
      setModifications(product.modifications?.map(mapModificationToState) ?? []);
      setBarcode(product.barcode || '');
      setCategoryId(product.categoryDetail?.id || '');
      setRemaining(product.remaining);
      setIsActive(product.isActive);
      resetProductImage();
      // Image is displayed directly via imageUrl — no fetch needed

    } else {
      setName('');
      setDescription('');
      setProductType('single');
      setBundlePricingMode('fixed');
      setBundleItems([]);
      setVariantGroups([]);
      setModifications([]);
      setBarcode('');
      setRemaining(true);
      setIsActive(true);
      resetProductImage();
      setStoreSelections({});
      setStoreSelectionsInitialized(false);
    }
  }, [isOpen, product, resetProductImage]);

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
            next[store.id] = { selected: false, price: '', stock: '' };
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
        stock: existing?.stock != null ? existing.stock.toString() : '',
      };
    });

    setStoreSelections(initial);
    setStoreSelectionsInitialized(true);
  }, [isOpen, product, stores, storeSelectionsInitialized]);

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

  const handleVariantGroupChange = (
    groupIndex: number,
    key: keyof Omit<VariantGroupFormState, 'variants'>,
    value: string | boolean,
  ) => {
    setVariantGroups((prev) =>
      prev.map((group, idx) =>
        idx === groupIndex
          ? { ...group, [key]: value }
          : group,
      ),
    );
  };

  const handleVariantOptionChange = (
    groupIndex: number,
    variantIndex: number,
    key: keyof VariantOptionFormState,
    value: string | boolean,
  ) => {
    setVariantGroups((prev) =>
      prev.map((group, idx) => {
        if (idx !== groupIndex) {
          return group;
        }

        return {
          ...group,
          variants: group.variants.map((variant, optionIdx) =>
            optionIdx === variantIndex
              ? { ...variant, [key]: value }
              : variant,
          ),
        };
      }),
    );
  };

  const addVariantOption = (groupIndex: number) => {
    setVariantGroups((prev) =>
      prev.map((group, idx) =>
        idx === groupIndex
          ? { ...group, variants: [...group.variants, defaultVariantOption()] }
          : group,
      ),
    );
  };

  const removeVariantOption = (groupIndex: number, variantIndex: number) => {
    setVariantGroups((prev) =>
      prev.map((group, idx) => {
        if (idx !== groupIndex) {
          return group;
        }

        return {
          ...group,
          variants: group.variants.filter((_, optionIdx) => optionIdx !== variantIndex),
        };
      }),
    );
  };

  const handleModificationChange = (
    index: number,
    key: keyof ModificationFormState,
    value: string | boolean,
  ) => {
    setModifications((prev) =>
      prev.map((modification, idx) => {
        if (idx !== index) {
          return modification;
        }

        if (key === 'linkedProductId' && typeof value === 'string') {
          const linkedProduct = linkedModificationProductOptions.find((candidate) => candidate.id === value);
          return {
            ...modification,
            linkedProductId: value,
            linkedProductQuantity: value ? (modification.linkedProductQuantity || '1') : modification.linkedProductQuantity,
            name: linkedProduct ? linkedProduct.name : modification.name,
          };
        }

        return {
          ...modification,
          [key]: value,
        };
      }),
    );
  };

  const toggleStore = (storeId: string) => {
    setStoreSelections((prev) => {
      const current = prev[storeId] ?? { selected: false, price: '', stock: '' };
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
        const current = prev[store.id] ?? { selected: false, price: '', stock: '' };
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
      const current = prev[storeId] ?? { selected: false, price: '', stock: '' };

      return {
        ...prev,
        [storeId]: {
          ...current,
          selected: true,
          price: cleaned,
        },
      };
    });
  };

  const handleStoreStockChange = (storeId: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setStoreSelections((prev) => {
      const current = prev[storeId] ?? { selected: false, price: '', stock: '' };

      return {
        ...prev,
        [storeId]: {
          ...current,
          selected: true,
          stock: cleaned,
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

    const preparedVariantGroups = variantGroups
      .map((group) => ({
        ...group,
        name: group.name.trim(),
        variants: group.variants
          .map((variant) => ({
            ...variant,
            name: variant.name.trim(),
          }))
          .filter((variant) => variant.name !== ''),
      }))
      .filter((group) => group.name !== '' || group.variants.length > 0);

    const invalidVariantGroup = preparedVariantGroups.some(
      (group) => group.name === '' || group.variants.length === 0,
    );

    if (invalidVariantGroup) {
      setLocalError('Each variant group must have a name and at least one variant.');
      return;
    }

    const invalidVariantValue = preparedVariantGroups.some((group) =>
      group.variants.some((variant) => {
        const price = variant.price !== '' ? Number(variant.price) : 0;
        const stock = variant.stock !== '' ? Number(variant.stock) : 0;

        return !Number.isFinite(price)
          || price < 0
          || !Number.isInteger(stock)
          || stock < 0;
      }),
    );

    if (invalidVariantValue) {
      setLocalError('Variant price and stock must be valid non-negative numbers.');
      return;
    }

    const preparedModifications = modifications
      .map((modification) => {
        const linkedProduct = linkedModificationProductOptions.find(
          (candidate) => candidate.id === modification.linkedProductId,
        );

        return {
          ...modification,
          name: modification.name.trim() || linkedProduct?.name || '',
        };
      })
      .filter((modification) => modification.name.trim() !== '' || modification.linkedProductId);

    const invalidModificationLink = preparedModifications.some((modification) => {
      if (!modification.linkedProductId) {
        return false;
      }

      const quantity = modification.linkedProductQuantity !== ''
        ? Number(modification.linkedProductQuantity)
        : 0;

      return !Number.isInteger(quantity) || quantity < 1;
    });

    if (invalidModificationLink) {
      setLocalError('Linked product quantity in modifications must be at least 1.');
      return;
    }

    const selectedStores = Object.entries(storeSelections)
      .filter(([, state]) => state.selected)
      .map(([id, state]) => ({
        id,
        price: state.price !== '' ? Number(state.price) : undefined,
        stock: state.stock !== '' ? Number(state.stock) : undefined,
      }));

    if (selectedStores.length === 0) {
      setLocalError('Select at least one store.');
      return;
    }

    const invalidStorePrice = selectedStores.some(
      (store) => store.price !== undefined && (!Number.isFinite(store.price) || store.price < 0),
    );

    if (invalidStorePrice) {
      setLocalError('Store prices must be valid non-negative numbers.');
      return;
    }

    const invalidStoreStock = selectedStores.some(
      (store) => store.stock !== undefined && (!Number.isInteger(store.stock) || store.stock < 0),
    );

    if (invalidStoreStock) {
      setLocalError('Store stock must be a valid non-negative whole number.');
      return;
    }

    const firstStoreWithPrice = selectedStores.find((store) => store.price !== undefined);
    const firstStoreWithStock = selectedStores.find((store) => store.stock !== undefined);
    const fallbackPrice = productType === 'bundle' && bundlePricingMode === 'sum_components'
      ? bundleComponentTotal
      : (firstStoreWithPrice?.price ?? product?.price ?? 0);
    const fallbackStock = firstStoreWithStock?.stock ?? product?.stock ?? 0;

    const payload: ProductInput = {
      name: name.trim(),
      description: description.trim() || null,
      type: productType,
      bundle_pricing_mode: productType === 'bundle' ? bundlePricingMode : 'fixed',
      price: fallbackPrice,
      sku: '',
      barcode: barcode.trim() || null,
      stock: fallbackStock,
      request: false,
      remaining,
      is_active: isActive,
      imageFile: productImage.file,
      remove_image: productImage.shouldRemove,
      category_id: categoryId || undefined, // Add category assignment
      variants: product?.variantCombinations?.map((combination) => ({
        name: combination.name,
        sku: combination.sku ?? undefined,
        price: combination.price,
        stock: combination.stock,
        isActive: combination.isActive,
      })) ?? [],
      variant_groups: preparedVariantGroups.map(toVariantGroupInput),
      bundle_items: productType === 'bundle' ? bundlePayload : [],
      modifications: preparedModifications.map(toModificationInput),
    };

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
      <div className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {product ? 'Edit Product' : 'Create Product'}
            </h2>
            <p className="text-xs text-gray-600">
              {product
                ? 'Update product details and store availability.'
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
                <FormField label="Barcode">
                  <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional barcode" />
                </FormField>
                <FormField label="Description">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the product..." />
                </FormField>

                <FormField label="Category" className="space-y-3">
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
                <div className="col-span-1 sm:col-span-2">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    <ImageUploader {...productImage.uploaderProps} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Optional. Gambar akan di-crop 1:1 dan dikonversi ke WebP (maks. 1200×1200 px).
                  </p>
                </FormField>
              </div>
            </div>

            <section className="space-y-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Variants</h3>
                  <p className="text-xs text-gray-600">
                    Group product options such as size, spice level, or serving choice.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVariantGroups((prev) => [...prev, defaultVariantGroup()])}
                >
                  Add Group
                </Button>
              </div>
              {variantGroups.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-600">
                  No variants defined.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Tip: drag the handle (⋮) to reorder groups and options.</p>
                  <SortableList
                    items={variantGroups}
                    getId={(_, index) => `variant-group-${index}`}
                    onReorder={(reordered) => setVariantGroups(reordered)}
                    renderItem={(group, groupIndex) => (
                      <div className="space-y-3 rounded-md border border-gray-200 bg-white p-3">
                        <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_150px_96px]">
                          <Input
                            value={group.name}
                            onChange={(e) => handleVariantGroupChange(groupIndex, 'name', e.target.value)}
                            placeholder="Group name, e.g. Size"
                            className="h-9"
                          />
                          <label className="flex h-9 items-center gap-2 rounded-md border border-gray-200 px-3 text-xs font-medium text-gray-700">
                            <Checkbox
                              checked={group.isRequired}
                              onCheckedChange={(checked) => handleVariantGroupChange(groupIndex, 'isRequired', checked === true)}
                            />
                            <span>Required</span>
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 text-red-500 hover:text-red-600"
                            onClick={() => setVariantGroups((prev) => prev.filter((_, idx) => idx !== groupIndex))}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="hidden grid-cols-[minmax(180px,1fr)_120px_120px_96px_80px] gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid">
                            <span>Option</span>
                            <span>Price</span>
                            <span>Stock</span>
                            <span>Status</span>
                            <span>Action</span>
                          </div>
                          {group.variants.length > 0 ? (
                            <SortableList
                              items={group.variants}
                              getId={(_, vIndex) => `variant-${groupIndex}-${vIndex}`}
                              onReorder={(reordered) =>
                                setVariantGroups((prev) =>
                                  prev.map((g, idx) =>
                                    idx === groupIndex ? { ...g, variants: reordered } : g,
                                  ),
                                )
                              }
                              renderItem={(variant, variantIndex) => (
                                <div className="grid gap-2 rounded-md border border-gray-100 bg-gray-50 p-2 lg:grid-cols-[minmax(180px,1fr)_120px_120px_96px_80px]">
                                  <div className="space-y-1 lg:space-y-0">
                                    <span className="text-sm font-medium text-gray-700 lg:hidden">Option</span>
                                    <Input
                                      value={variant.name}
                                      onChange={(e) => handleVariantOptionChange(groupIndex, variantIndex, 'name', e.target.value)}
                                      placeholder="Option name"
                                      className="h-9 bg-white"
                                    />
                                  </div>
                                  <div className="space-y-1 lg:space-y-0">
                                    <span className="text-sm font-medium text-gray-700 lg:hidden">Price</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={variant.price}
                                      onChange={(e) => handleVariantOptionChange(groupIndex, variantIndex, 'price', e.target.value)}
                                      placeholder="0"
                                      className="h-9 bg-white"
                                    />
                                  </div>
                                  <div className="space-y-1 lg:space-y-0">
                                    <span className="text-sm font-medium text-gray-700 lg:hidden">Stock</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={variant.stock}
                                      onChange={(e) => handleVariantOptionChange(groupIndex, variantIndex, 'stock', e.target.value)}
                                      placeholder="0"
                                      className="h-9 bg-white"
                                    />
                                  </div>
                                  <div className="space-y-1 lg:space-y-0">
                                    <span className="text-sm font-medium text-gray-700 lg:hidden">Status</span>
                                    <label className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700">
                                      <Checkbox
                                        checked={variant.isActive}
                                        onCheckedChange={(checked) => handleVariantOptionChange(groupIndex, variantIndex, 'isActive', checked === true)}
                                      />
                                      <span>Active</span>
                                    </label>
                                  </div>
                                  <div className="space-y-1 lg:space-y-0">
                                    <span className="text-sm font-medium text-gray-700 lg:hidden">Action</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-full text-red-500 hover:text-red-600"
                                      onClick={() => removeVariantOption(groupIndex, variantIndex)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              )}
                            />
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addVariantOption(groupIndex)}
                        >
                          Add Option
                        </Button>
                      </div>
                    )}
                  />
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Modifications</h3>
                  <p className="text-xs text-gray-600">
                    Link an option to a stock product when it consumes inventory.
                  </p>
                </div>
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
                <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-600">
                  No modifications defined.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden grid-cols-[minmax(180px,1fr)_120px_minmax(220px,1.1fr)_96px_96px_80px] gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid">
                    <span>Name</span>
                    <span>Price</span>
                    <span>Linked Stock</span>
                    <span>Qty</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>
                  <p className="text-xs text-gray-500">Tip: drag the handle (⋮) to reorder modifications.</p>
                  <SortableList
                    items={modifications}
                    getId={(_, index) => `modification-${index}`}
                    onReorder={(reordered) => setModifications(reordered)}
                    renderItem={(modification, index) => (
                      <div className="grid gap-2 rounded-md border border-gray-200 bg-white p-3 lg:grid-cols-[minmax(180px,1fr)_120px_minmax(220px,1.1fr)_96px_96px_80px]">
                        <div className="space-y-1 lg:space-y-0">
                          <span className="text-sm font-medium text-gray-700 lg:hidden">Name</span>
                          <Input
                            value={modification.name}
                            onChange={(e) => handleModificationChange(index, 'name', e.target.value)}
                            placeholder="Modification name"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1 lg:space-y-0">
                          <span className="text-sm font-medium text-gray-700 lg:hidden">Price</span>
                          <Input
                            type="number"
                            min="0"
                            value={modification.price}
                            onChange={(e) => handleModificationChange(index, 'price', e.target.value)}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1 lg:space-y-0">
                          <span className="text-sm font-medium text-gray-700 lg:hidden">Linked Stock</span>
                          <select
                            value={modification.linkedProductId}
                            onChange={(e) => handleModificationChange(index, 'linkedProductId', e.target.value)}
                            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">No linked stock</option>
                            {linkedModificationProductOptions.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name} - stock {candidate.stock}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1 lg:space-y-0">
                          <span className="text-sm font-medium text-gray-700 lg:hidden">Qty</span>
                          <Input
                            type="number"
                            min="1"
                            value={modification.linkedProductQuantity}
                            onChange={(e) => handleModificationChange(index, 'linkedProductQuantity', e.target.value)}
                            placeholder="1"
                            className="h-9"
                            disabled={!modification.linkedProductId}
                          />
                        </div>
                        <div className="space-y-1 lg:space-y-0">
                          <span className="text-sm font-medium text-gray-700 lg:hidden">Status</span>
                          <label className="flex h-9 items-center gap-2 rounded-md border border-gray-200 px-2 text-xs font-medium text-gray-700">
                            <Checkbox
                              checked={modification.isActive}
                              onCheckedChange={(checked) => handleModificationChange(index, 'isActive', checked === true)}
                            />
                            <span>Active</span>
                          </label>
                        </div>
                        <div className="space-y-1 lg:space-y-0">
                          <span className="text-sm font-medium text-gray-700 lg:hidden">Action</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 w-full text-red-500 hover:text-red-600"
                            onClick={() => setModifications((prev) => prev.filter((_, idx) => idx !== index))}
                          >
                            Remove
                          </Button>
                        </div>
                        {modification.linkedProductId ? (
                          <p className="text-xs text-gray-500 lg:col-span-6">
                            Stock will be deducted from the linked product when this modification is ordered.
                          </p>
                        ) : null}
                      </div>
                    )}
                  />
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
                    const selection = storeSelections[store.id] ?? { selected: false, price: '', stock: '' };
                    return (
                      <div
                        key={store.id}
                        className={`grid items-center gap-2 rounded-md border border-gray-100 p-2 hover:bg-gray-50 ${
                          selection.selected ? 'sm:grid-cols-[minmax(0,1fr)_140px_120px]' : 'sm:grid-cols-1'
                        }`}
                      >
                        <label className="flex flex-1 items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                          <Checkbox
                            checked={selection.selected}
                            onCheckedChange={() => toggleStore(store.id)}
                          />
                          <span className="truncate" title={store.name}>{store.nickname || store.name}</span>
                        </label>
                        {selection.selected ? (
                          <>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-600">Rp</span>
                              <Input
                                type="number"
                                min="0"
                                value={selection.price}
                                onChange={(e) => handleStorePriceChange(store.id, e.target.value)}
                                className="w-28 px-2 py-1"
                                placeholder="0"
                              />
                            </div>
                            <Input
                              type="number"
                              min="0"
                              value={selection.stock}
                              onChange={(e) => handleStoreStockChange(store.id, e.target.value)}
                              className="px-2 py-1"
                              placeholder="Stock"
                            />
                          </>
                        ) : null}
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
