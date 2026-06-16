"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { collection, doc, getDoc, getDocs, query } from "firebase/firestore";

import { AppButton } from "@/components/ui/AppButton";
import { db } from "@/lib/firebase/client";
import {
  getPresetForTenant,
  type TenantDesignPreset,
} from "@/modules/design/tenantDesignPresets";
import type { CartItem } from "@/types/cart.types";
import type {
  Product,
  ProductImage,
  ProductOption,
  ProductOptionValue,
  SelectedProductOption,
} from "@/types/product.types";

import { CartDrawer } from "./CartDrawer";
import { CartSummary } from "./CartSummary";
import { CustomerInfoModal } from "./CustomerInfoModal";
import { ProductCard } from "./ProductCard";
import { ProductOptionsModal } from "./ProductOptionsModal";
import { createOrder } from "../services/orderService";
import type { CustomerInfo, Order } from "../types/order";

interface OrderMenuClientProps {
  tenantId: string;
  tenantSlug: string;
}

interface RestaurantProfile {
  name: string;
  greeting: string;
  description: string;
  rating: string;
  reviews: string;
  estimatedTime: string;
  location: string;
  heroImageUrl: string;
  featuredCategory: string;
  deliveryEnabled: boolean;
  deliveryFee: number;
  deliveryMinimumOrder: number;
  deliveryNotes: string;
  designPreset: TenantDesignPreset;
}

interface FirestoreTenantRecord {
  name?: unknown;
  greeting?: unknown;
  description?: unknown;
  rating?: unknown;
  reviews?: unknown;
  estimatedTime?: unknown;
  location?: unknown;
  heroImageUrl?: unknown;
  featuredCategory?: unknown;
  category?: unknown;
  designPresetId?: unknown;
  deliveryConfig?: unknown;
  deliveryEnabled?: unknown;
  deliveryFee?: unknown;
}

interface FirestoreProductRecord {
  tenantId?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  imageUrl?: unknown;
  images?: unknown;
  available?: unknown;
  active?: unknown;
  category?: unknown;
  options?: unknown;
  deletedAt?: unknown;
}

interface StoredCustomerProfile {
  customerId: string;
  customerCode: string;
  displayName: string;
}

interface CustomerProfileLookupResponse {
  found?: boolean;
  customer?: {
    customerId?: unknown;
    customerCode?: unknown;
    displayName?: unknown;
  };
  message?: string;
}

const DEFAULT_PROFILE: RestaurantProfile = {
  name: "Menú del negocio",
  greeting: "Bienvenido 👋",
  description: "Explora el menú, agrega productos al carrito y confirma tu pedido.",
  rating: "4.8",
  reviews: "100",
  estimatedTime: "15–20 min",
  location: "Puerto Vallarta",
  featuredCategory: "Favoritos",
  deliveryEnabled: false,
  deliveryFee: 0,
  deliveryMinimumOrder: 0,
  deliveryNotes: "",
  heroImageUrl:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop",
  designPreset: getPresetForTenant("generico", null),
};

const CATEGORY_ICONS: Record<string, string> = {
  tacos: "🌮",
  taco: "🌮",
  hamburguesas: "🍔",
  hamburguesa: "🍔",
  postres: "🍰",
  postre: "🍰",
  nieves: "🍨",
  nieve: "🍨",
  helados: "🍦",
  helado: "🍦",
  elotes: "🌽",
  elote: "🌽",
  esquites: "🌽",
  bebidas: "🥤",
  bebida: "🥤",
  papas: "🍟",
  pollo: "🍗",
  especiales: "⭐",
  clasicos: "🍮",
  clasicos_: "🍮",
  pasteles: "🎂",
  galletas: "🍪",
  cupcakes: "🧁",
  quesadillas: "🧀",
  ordenes: "🥩",
  favoritos: "⭐",
};

const CATEGORY_LABELS: Record<string, string> = {
  tacos: "Tacos",
  taco: "Tacos",
  hamburguesas: "Hamburguesas",
  hamburguesa: "Hamburguesas",
  postres: "Postres",
  postre: "Postres",
  nieves: "Nieves",
  nieve: "Nieves",
  helados: "Helados",
  helado: "Helados",
  elotes: "Elotes",
  elote: "Elotes",
  esquites: "Esquites",
  bebidas: "Bebidas",
  bebida: "Bebidas",
  papas: "Papas",
  pollo: "Pollo",
  especiales: "Especiales",
  clasicos: "Clásicos",
  pasteles: "Pasteles",
  galletas: "Galletas",
  cupcakes: "Cupcakes",
  quesadillas: "Quesadillas",
  ordenes: "Órdenes",
  favoritos: "Favoritos",
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toOptionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

function toDeliveryFee(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

function mapDeliveryConfig(record: FirestoreTenantRecord | undefined): {
  enabled: boolean;
  fee: number;
  minimumOrder: number;
  notes: string;
} {
  const deliveryConfig =
    record?.deliveryConfig &&
    typeof record.deliveryConfig === "object" &&
    !Array.isArray(record.deliveryConfig)
      ? (record.deliveryConfig as {
          enabled?: unknown;
          fee?: unknown;
          minimumOrder?: unknown;
          notes?: unknown;
        })
      : null;
  const enabled =
    typeof deliveryConfig?.enabled === "boolean"
      ? deliveryConfig.enabled
      : record?.deliveryEnabled === true;

  return {
    enabled,
    fee: enabled ? toDeliveryFee(deliveryConfig?.fee ?? record?.deliveryFee) : 0,
    minimumOrder: toDeliveryFee(deliveryConfig?.minimumOrder),
    notes: toOptionalString(deliveryConfig?.notes) ?? "",
  };
}

function normalizeCategory(category?: string): string {
  if (!category) return "otros";

  return category
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function getCategoryLabel(categoryKey: string): string {
  return CATEGORY_LABELS[categoryKey] ?? categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
}

function getCategoryIcon(categoryKey: string): string {
  return CATEGORY_ICONS[categoryKey] ?? "🍽️";
}

function getCategoryPriority(categoryKey: string, featuredCategoryKey: string): number {
  if (categoryKey === featuredCategoryKey) return 0;

  if (categoryKey === "bebidas") return 80;
  if (categoryKey === "especiales") return 85;

  return 50;
}

function toPriceDelta(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value * 100) / 100
    : 0;
}

function normalizeProductOptionValues(value: unknown): ProductOptionValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((optionValue): ProductOptionValue[] => {
    if (!optionValue || typeof optionValue !== "object") {
      return [];
    }

    const record = optionValue as Record<string, unknown>;
    const id = toOptionalString(record.id);
    const label = toOptionalString(record.label);

    if (!id || !label) {
      return [];
    }

    const priceDelta = toPriceDelta(record.priceDelta);

    return [
      {
        id,
        label,
        ...(priceDelta > 0 ? { priceDelta } : {}),
        active: typeof record.active === "boolean" ? record.active : true,
      },
    ];
  });
}


function normalizeProductImage(value: unknown): ProductImage[] {
  if (!Array.isArray(value)) return [];

  const images = value.flatMap((img): ProductImage[] => {
    if (!img || typeof img !== "object") return [];
    const r = img as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : null;
    const url = typeof r.url === "string" && r.url.trim().length > 0 ? r.url.trim() : null;
    if (!id || !url) return [];
    return [{
      id,
      url,
      alt: typeof r.alt === "string" ? r.alt.trim() : undefined,
      label: typeof r.label === "string" ? r.label.trim() : undefined,
      sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : 0,
      isPrimary: typeof r.isPrimary === "boolean" ? r.isPrimary : false,
    }];
  });

  const primaryImageId =
    images.find((image) => image.isPrimary)?.id ?? images[0]?.id;

  return images
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, 5)
    .map((image, index) => ({
      ...image,
      sortOrder: index,
      isPrimary: image.id === primaryImageId,
    }));
}

function normalizeProductOptions(value: unknown): ProductOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((option): ProductOption[] => {
    if (!option || typeof option !== "object") {
      return [];
    }

    const record = option as Record<string, unknown>;
    const id = toOptionalString(record.id);
    const name = toOptionalString(record.name);
    const type =
      record.type === "multiple" || record.type === "single"
        ? record.type
        : "single";

    if (!id || !name) {
      return [];
    }

    return [
      {
        id,
        name,
        type,
        required: typeof record.required === "boolean" ? record.required : false,
        values: normalizeProductOptionValues(record.values),
      },
    ];
  });
}

function getTypographyClassName(fontMood: TenantDesignPreset["fontMood"]): string {
  if (fontMood === "modern") {
    return "font-sans";
  }

  if (fontMood === "premium") {
    return "font-semibold";
  }

  if (fontMood === "warm") {
    return "font-medium";
  }

  return "font-black";
}

function getRadiusValue(radius: TenantDesignPreset["borderRadius"]): string {
  if (radius === "large") {
    return "1.5rem";
  }

  if (radius === "medium") {
    return "1rem";
  }

  return "0.75rem";
}

function getTenantDesignStyle(preset: TenantDesignPreset): CSSProperties {
  return {
    "--tenant-primary": preset.primaryColor,
    "--tenant-primary-hover": preset.accentColor,
    "--tenant-secondary": preset.secondaryColor,
    "--tenant-accent": preset.accentColor,
    "--tenant-bg": preset.backgroundColor,
    "--tenant-background": preset.backgroundColor,
    "--tenant-surface": preset.surfaceColor,
    "--tenant-card": preset.cardColor,
    "--tenant-text": preset.textColor,
    "--tenant-button-text": preset.buttonTextColor,
    "--tenant-radius": getRadiusValue(preset.borderRadius),
    "--tenant-hero-overlay": preset.heroOverlay,
    "--tenant-text-soft": preset.textColor,
    "--tenant-muted": preset.mutedTextColor,
    "--tenant-subtle": preset.cardColor,
    "--tenant-ring": preset.secondaryColor,
  } as CSSProperties;
}

function getCustomerCodeStorageKey(tenantId: string): string {
  return `foodspv_customer_code_${tenantId}`;
}

function normalizeCustomerCodeInput(customerCode: string): string {
  const [rawPrefix, rawSuffix] = customerCode.includes("-")
    ? customerCode.split("-", 2)
    : ["", ""];
  const cleanPrefix = rawPrefix.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const cleanSuffix = rawSuffix.replace(/\D/g, "");

  if (cleanPrefix.length > 0 && cleanSuffix.length > 0) {
    return `${cleanPrefix.slice(0, 4)}-${cleanSuffix}`;
  }

  const cleanCode = customerCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = cleanCode.slice(-5);
  const prefix = cleanCode.slice(0, -5).slice(0, 4);

  if (prefix.length === 0 || suffix.length === 0) {
    return cleanCode;
  }

  return `${prefix}-${suffix}`;
}

function toStoredCustomerProfile(
  response: CustomerProfileLookupResponse
): StoredCustomerProfile | null {
  const customer = response.customer;

  if (
    response.found !== true ||
    !customer ||
    !isNonEmptyString(customer.customerId) ||
    !isNonEmptyString(customer.customerCode) ||
    !isNonEmptyString(customer.displayName)
  ) {
    return null;
  }

  return {
    customerId: customer.customerId.trim(),
    customerCode: customer.customerCode.trim(),
    displayName: customer.displayName.trim(),
  };
}

async function lookupCustomerProfile(
  tenantId: string,
  customerCode: string
): Promise<StoredCustomerProfile | null> {
  const params = new URLSearchParams({
    tenantId,
    customerCode,
  });
  const response = await fetch(`/api/customers/profile?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    return null;
  }

  return toStoredCustomerProfile(
    (await response.json()) as CustomerProfileLookupResponse
  );
}

function mapTenantProfile(record: FirestoreTenantRecord | undefined): RestaurantProfile {
  const featuredCategory =
    toOptionalString(record?.featuredCategory) ??
    toOptionalString(record?.category) ??
    DEFAULT_PROFILE.featuredCategory;
  const category = toOptionalString(record?.category) ?? "generico";
  const designPresetId = toOptionalString(record?.designPresetId);
  const designPreset = getPresetForTenant(category, designPresetId);
  const deliveryConfig = mapDeliveryConfig(record);

  return {
    name: toOptionalString(record?.name) ?? DEFAULT_PROFILE.name,
    greeting: toOptionalString(record?.greeting) ?? DEFAULT_PROFILE.greeting,
    description: toOptionalString(record?.description) ?? DEFAULT_PROFILE.description,
    rating: toOptionalString(record?.rating) ?? DEFAULT_PROFILE.rating,
    reviews: toOptionalString(record?.reviews) ?? DEFAULT_PROFILE.reviews,
    estimatedTime:
      toOptionalString(record?.estimatedTime) ?? DEFAULT_PROFILE.estimatedTime,
    location: toOptionalString(record?.location) ?? DEFAULT_PROFILE.location,
    heroImageUrl:
      toOptionalString(record?.heroImageUrl) ?? DEFAULT_PROFILE.heroImageUrl,
    featuredCategory,
    deliveryEnabled: deliveryConfig.enabled,
    deliveryFee: deliveryConfig.fee,
    deliveryMinimumOrder: deliveryConfig.minimumOrder,
    deliveryNotes: deliveryConfig.notes,
    designPreset,
  };
}

function mapProduct(
  productId: string,
  tenantId: string,
  record: FirestoreProductRecord
): Product | null {
  if (!isNonEmptyString(record.name) || typeof record.price !== "number") {
    return null;
  }

  const active =
    typeof record.active === "boolean" ? record.active : true;

  if (
    active === false ||
    (record.deletedAt !== null && record.deletedAt !== undefined)
  ) {
    return null;
  }

  const available =
    typeof record.available === "boolean" ? record.available : active;

  return {
    id: productId,
    tenantId: isNonEmptyString(record.tenantId)
      ? record.tenantId.trim()
      : tenantId,
    name: record.name.trim(),
    description: toOptionalString(record.description),
    price: record.price,
    imageUrl: toOptionalString(record.imageUrl),
    images: normalizeProductImage(record.images),
    available,
    category: toOptionalString(record.category),
    options: normalizeProductOptions(record.options),
  };
}

function getActiveProductOptions(product: Product): ProductOption[] {
  return (product.options ?? [])
    .map((option) => ({
      ...option,
      values: option.values.filter((value) => value.active),
    }))
    .filter((option) => option.values.length > 0);
}

function getCartItemUnitPrice(item: CartItem): number {
  return (
    item.unitPrice +
    (item.selectedOptions ?? []).reduce(
      (sum, option) => sum + option.priceDeltaTotal,
      0
    )
  );
}

function getCartItemId(
  productId: string,
  selectedOptions: SelectedProductOption[]
): string {
  const optionsKey = selectedOptions
    .map(
      (option) =>
        `${option.optionId}:${[...option.valueIds].sort((left, right) =>
          left.localeCompare(right)
        ).join(",")}`
    )
    .sort((left, right) => left.localeCompare(right))
    .join("|");

  return optionsKey ? `${productId}__${optionsKey}` : productId;
}

function mapCartItemsToOrderItems(items: CartItem[]): Order["productos"] {
  return items.map((item) => ({
    id: item.productId,
    nombre: item.productName,
    precio: item.unitPrice,
    cantidad: item.quantity,
    selectedOptions: item.selectedOptions,
  }));
}

function buildOrder(
  tenantId: string,
  tenantSlug: string,
  customerInfo: CustomerInfo,
  items: CartItem[],
  total: number,
  deliveryType: "pickup" | "delivery",
  deliveryAddress: string,
  deliveryFee: number
): Order {
  const normalizedDeliveryAddress = deliveryAddress.trim();
  const deliveryFields =
    deliveryType === "delivery"
      ? {
          deliveryType,
          deliveryAddress: normalizedDeliveryAddress,
          deliveryFee,
        }
      : {
          deliveryType,
        };

  return {
    tenantId,
    tenantSlug,
    cliente: customerInfo,
    productos: mapCartItemsToOrderItems(items),
    total,
    ...deliveryFields,
    estado: "pendiente",
    createdAt: Date.now(),
  };
}

export function OrderMenuClient({ tenantId, tenantSlug }: OrderMenuClientProps) {
  const [restaurantProfile, setRestaurantProfile] =
    useState<RestaurantProfile>(DEFAULT_PROFILE);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(
    null
  );
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [customerModalSession, setCustomerModalSession] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [submittedTotal, setSubmittedTotal] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">(
    "pickup"
  );
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [storedCustomerCode, setStoredCustomerCode] = useState<string>("");
  const [storedCustomerProfile, setStoredCustomerProfile] =
    useState<StoredCustomerProfile | null>(null);
  const [isLoadingStoredCustomerProfile, setIsLoadingStoredCustomerProfile] =
    useState<boolean>(false);
  const [successCustomerCode, setSuccessCustomerCode] = useState<string | null>(
    null
  );
  const [successCustomerCodeWasProvided, setSuccessCustomerCodeWasProvided] =
    useState<boolean>(false);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const isSubmittingRef = useRef<boolean>(false);

  const featuredCategoryKey = normalizeCategory(restaurantProfile.featuredCategory);
  const tenantDesignStyle = getTenantDesignStyle(restaurantProfile.designPreset);
  const typographyClassName = getTypographyClassName(
    restaurantProfile.designPreset.fontMood
  );
  const deliveryEnabled = restaurantProfile.deliveryEnabled;
  const deliveryFee = restaurantProfile.deliveryFee;

  useEffect(() => {
    let isMounted = true;

    async function loadMenuData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const tenantRef = doc(db, "tenants", tenantId);
        const productsQuery = query(collection(db, "tenants", tenantId, "products"));

        const [tenantSnapshot, productsSnapshot] = await Promise.all([
          getDoc(tenantRef),
          getDocs(productsQuery),
        ]);

        const profile = mapTenantProfile(
          tenantSnapshot.exists()
            ? (tenantSnapshot.data() as FirestoreTenantRecord)
            : undefined
        );

        const loadedProducts = productsSnapshot.docs
          .map((document) =>
            mapProduct(document.id, tenantId, document.data() as FirestoreProductRecord)
          )
          .filter((product): product is Product => product !== null)
          .filter((product) => product.available);

        if (!isMounted) return;

        const currentFeaturedCategoryKey = normalizeCategory(profile.featuredCategory);

        setRestaurantProfile(profile);
        if (!profile.deliveryEnabled) {
          setDeliveryType("pickup");
          setDeliveryAddress("");
        }

        setProducts(
          loadedProducts.sort((left, right) => {
            const leftCategory = normalizeCategory(left.category);
            const rightCategory = normalizeCategory(right.category);

            const priorityDifference =
              getCategoryPriority(leftCategory, currentFeaturedCategoryKey) -
              getCategoryPriority(rightCategory, currentFeaturedCategoryKey);

            if (priorityDifference !== 0) return priorityDifference;

            if (leftCategory !== rightCategory) {
              return leftCategory.localeCompare(rightCategory, "es");
            }

            return left.name.localeCompare(right.name, "es");
          })
        );
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo cargar el menú."
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadMenuData();

    return () => {
      isMounted = false;
    };
  }, [tenantId]);

  useEffect(() => {
    let isMounted = true;
    const storageKey = getCustomerCodeStorageKey(tenantId);
    const savedCustomerCode = window.localStorage.getItem(storageKey);
    const timeoutId = window.setTimeout(() => {
      if (!isMounted) return;

      if (!savedCustomerCode) {
        setStoredCustomerCode("");
        setStoredCustomerProfile(null);
        setIsLoadingStoredCustomerProfile(false);
        return;
      }

      const normalizedCustomerCode = normalizeCustomerCodeInput(savedCustomerCode);

      setStoredCustomerCode(normalizedCustomerCode);
      setStoredCustomerProfile(null);
      setIsLoadingStoredCustomerProfile(true);

      lookupCustomerProfile(tenantId, normalizedCustomerCode)
        .then((profile) => {
          if (!isMounted) return;

          setStoredCustomerProfile(profile);
        })
        .catch(() => {
          if (!isMounted) return;

          setStoredCustomerProfile(null);
        })
        .finally(() => {
          if (isMounted) setIsLoadingStoredCustomerProfile(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [tenantId]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();

    for (const product of products) {
      const categoryKey = normalizeCategory(product.category);
      const currentProducts = groups.get(categoryKey) ?? [];

      groups.set(categoryKey, [...currentProducts, product]);
    }

    return Array.from(groups.entries()).sort(([leftKey], [rightKey]) => {
      const priorityDifference =
        getCategoryPriority(leftKey, featuredCategoryKey) -
        getCategoryPriority(rightKey, featuredCategoryKey);

      if (priorityDifference !== 0) return priorityDifference;

      return leftKey.localeCompare(rightKey, "es");
    });
  }, [products, featuredCategoryKey]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * getCartItemUnitPrice(item),
    0
  );
  const effectiveDeliveryType =
    deliveryEnabled && deliveryType === "delivery" ? "delivery" : "pickup";
  const effectiveDeliveryAddress =
    effectiveDeliveryType === "delivery" ? deliveryAddress : "";
  const deliveryFeeApplied =
    effectiveDeliveryType === "delivery" ? deliveryFee : 0;
  const total = subtotal + deliveryFeeApplied;

  function addConfiguredProduct(
    product: Product,
    selectedOptions: SelectedProductOption[]
  ): void {
    if (!product.available) {
      return;
    }

    const cartItemId = getCartItemId(product.id, selectedOptions);

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.cartItemId === cartItemId
      );

      if (!existingItem) {
        return [
          ...currentItems,
          {
            cartItemId,
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: product.price,
            selectedOptions,
          },
        ];
      }

      return currentItems.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    });

    setCustomizingProduct(null);
  }

  function addProduct(product: Product): void {
    if (!product.available) {
      return;
    }

    if (getActiveProductOptions(product).length > 0) {
      setCustomizingProduct(product);
      return;
    }

    addConfiguredProduct(product, []);
  }

  function scrollToCategory(categoryKey: string): void {
    categoryRefs.current[categoryKey]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function increaseItem(cartItemId: string): void {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseItem(cartItemId: string): void {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(cartItemId: string): void {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.cartItemId !== cartItemId)
    );
  }

  function resetOrderFeedback(): void {
    setSuccessMessage(null);
    setSuccessOrderId(null);
    setSuccessCustomerCode(null);
    setSuccessCustomerCodeWasProvided(false);
    setSubmittedTotal(null);
    setSubmitError(null);
  }

  function forgetStoredCustomerCode(): void {
    window.localStorage.removeItem(getCustomerCodeStorageKey(tenantId));
    setStoredCustomerCode("");
    setStoredCustomerProfile(null);
  }

  function updateStoredCustomerCode(customerCode: string): void {
    setStoredCustomerCode(customerCode);

    if (
      storedCustomerProfile &&
      normalizeCustomerCodeInput(customerCode) !== storedCustomerProfile.customerCode
    ) {
      setStoredCustomerProfile(null);
    }
  }

  function openCustomerModal(): void {
    if (cartItems.length === 0) return;

    resetOrderFeedback();
    setIsCartOpen(false);
    setCustomerModalSession((currentValue) => currentValue + 1);
    setIsCustomerModalOpen(true);
  }

  function closeCustomerModal(): void {
    if (isSubmitting) return;

    setIsCustomerModalOpen(false);
    resetOrderFeedback();
  }

  async function submitOrder(customerInfo: CustomerInfo): Promise<void> {
    if (cartItems.length === 0 || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (
        effectiveDeliveryType === "delivery" &&
        effectiveDeliveryAddress.trim().length === 0
      ) {
        setSubmitError("Agrega la dirección para poder enviar tu pedido a domicilio.");
        return;
      }

      if (
        effectiveDeliveryType === "delivery" &&
        restaurantProfile.deliveryMinimumOrder > 0 &&
        subtotal < restaurantProfile.deliveryMinimumOrder
      ) {
        setSubmitError(
          `El pedido mínimo para domicilio es ${formatCurrency(restaurantProfile.deliveryMinimumOrder)}.`
        );
        return;
      }

      const order = buildOrder(
        tenantId,
        tenantSlug,
        customerInfo,
        cartItems,
        total,
        effectiveDeliveryType,
        effectiveDeliveryAddress,
        deliveryFeeApplied
      );
      const result = await createOrder(order);

      if (!result.success) {
        setSubmitError("No se pudo generar el pedido. Intenta de nuevo.");
        return;
      }

      if (result.customerCode) {
        const normalizedSubmittedCustomerCode = customerInfo.customerCode
          ? normalizeCustomerCodeInput(customerInfo.customerCode)
          : "";

        window.localStorage.setItem(
          getCustomerCodeStorageKey(tenantId),
          result.customerCode
        );
        setStoredCustomerCode(result.customerCode);
        setSuccessCustomerCode(result.customerCode);
        setSuccessCustomerCodeWasProvided(
          normalizedSubmittedCustomerCode.length > 0 &&
            normalizedSubmittedCustomerCode === result.customerCode &&
            !result.customerProfileWarning
        );

        lookupCustomerProfile(tenantId, result.customerCode)
          .then((profile) => setStoredCustomerProfile(profile))
          .catch(() => setStoredCustomerProfile(null));
      }

      setSuccessMessage(
        effectiveDeliveryType === "delivery"
          ? "Pedido realizado con éxito. Tu pedido será enviado a la dirección indicada."
          : "Pedido realizado con éxito. Puedes pasar por tu pedido en 15 a 20 minutos."
      );
      setSuccessOrderId(result.orderId);
      setSubmittedTotal(total);
      setCartItems([]);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? "No se pudo generar el pedido. Intenta de nuevo."
          : "Ocurrió un error inesperado al generar el pedido."
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={`min-h-screen bg-[var(--tenant-bg)] text-[var(--tenant-text)] ${typographyClassName}`}
      style={tenantDesignStyle}
    >
      <main className="mx-auto flex w-full max-w-5xl flex-col pb-32">
        <section className="relative overflow-hidden border-b border-[var(--tenant-ring)] bg-[var(--tenant-surface)] px-5 pb-5 pt-4 sm:px-8 sm:pb-6 sm:pt-5">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{
              backgroundImage: `${restaurantProfile.designPreset.heroOverlay}, url(${restaurantProfile.heroImageUrl})`,
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 drop-shadow-[0_2px_8px_rgba(15,15,16,0.52)]">
            <div className="mb-5 flex items-center justify-end sm:mb-6">
              <div className="inline-flex max-w-[75%] items-center gap-2 rounded-full bg-[var(--tenant-subtle)]/90 px-3 py-2 text-xs font-bold text-[var(--tenant-text)] shadow-sm ring-1 ring-[var(--tenant-ring)] backdrop-blur sm:text-sm">
                <span aria-hidden="true">🏪</span>
                <span className="truncate">{restaurantProfile.name}</span>
                <span aria-hidden="true">⌄</span>
              </div>
            </div>

            <p className="text-sm font-extrabold text-[var(--tenant-accent)]">
              {restaurantProfile.greeting}
            </p>

            <h1 className="mt-2 max-w-[14rem] text-3xl font-black leading-[1.05] tracking-tight text-[var(--tenant-text)] sm:max-w-md sm:text-4xl">
              {restaurantProfile.name}
            </h1>

            <p className="mt-3 line-clamp-2 max-w-[17rem] text-sm font-medium leading-6 text-[var(--tenant-text)] opacity-85 sm:max-w-md">
              {restaurantProfile.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--tenant-text)] sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">⭐</span>
                {restaurantProfile.rating} ({restaurantProfile.reviews})
              </span>

              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">🕒</span>
                {restaurantProfile.estimatedTime}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--tenant-subtle)]/90 px-3 py-1.5 shadow-sm ring-1 ring-[var(--tenant-ring)] backdrop-blur">
                <span aria-hidden="true">📍</span>
                {restaurantProfile.location}
              </span>
            </div>
          </div>
        </section>

        <section className="px-5 py-5 sm:px-8">
          <div className="mb-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black tracking-tight text-[var(--tenant-text)]">
                Menú
              </h2>

              <div className="hidden rounded-full bg-[var(--tenant-surface)] px-4 py-3 text-sm font-medium text-[var(--tenant-muted)] shadow-sm ring-1 ring-[var(--tenant-ring)] sm:block">
                🔎 Buscar productos...
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {groupedProducts.map(([categoryKey], index) => (
                <AppButton
                  key={categoryKey}
                  onClick={() => scrollToCategory(categoryKey)}
                  variant={index === 0 ? "primary" : "secondary"}
                  className={
                    index === 0
                      ? "shrink-0 !border-[var(--tenant-primary)] !bg-[var(--tenant-primary)] px-5 py-3 text-sm text-[var(--tenant-button-text)] hover:!bg-[var(--tenant-primary-hover)] active:!bg-[var(--tenant-primary)] focus-visible:ring-offset-[var(--tenant-background)]"
                      : "shrink-0 !border-[var(--tenant-ring)] !bg-[var(--tenant-surface)] px-5 py-3 text-sm text-[var(--tenant-text)] shadow-sm ring-1 ring-[var(--tenant-ring)] hover:!bg-[var(--tenant-subtle)] active:!bg-[var(--tenant-surface)] focus-visible:ring-offset-[var(--tenant-background)]"
                  }
                >
                  <span className="mr-2" aria-hidden="true">
                    {getCategoryIcon(categoryKey)}
                  </span>
                  {getCategoryLabel(categoryKey)}
                </AppButton>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-[var(--tenant-radius)] border border-[var(--tenant-ring)] bg-[var(--tenant-surface)] p-6 text-sm font-medium text-[var(--tenant-muted)] shadow-sm">
              Preparando el menú...
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[2rem] border border-rose-500/30 bg-rose-500/15 p-6 text-sm font-medium text-rose-300 shadow-sm">
              No se pudo cargar el menú. Intenta de nuevo en unos minutos.
            </div>
          ) : null}

          {!isLoading && !errorMessage && products.length === 0 ? (
            <div className="rounded-[var(--tenant-radius)] border border-dashed border-[var(--tenant-ring)] bg-[var(--tenant-surface)] p-6 text-sm font-medium text-[var(--tenant-muted)] shadow-sm">
              Por ahora no hay productos disponibles.
            </div>
          ) : null}

          <div className="space-y-6">
            {groupedProducts.map(([categoryKey, categoryProducts], index) => (
              <section
                key={categoryKey}
                ref={(element) => {
                  categoryRefs.current[categoryKey] = element;
                }}
                className="rounded-[var(--tenant-radius)] bg-[var(--tenant-surface)] p-5 shadow-sm ring-1 ring-[var(--tenant-ring)]"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {getCategoryIcon(categoryKey)}
                  </span>

                  <h3 className="text-2xl font-black text-[var(--tenant-text)]">
                    {getCategoryLabel(categoryKey)}
                  </h3>

                  {index === 0 ? (
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-extrabold text-amber-300">
                      Los favoritos de la casa
                    </span>
                  ) : null}
                </div>

                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
                  {categoryProducts.map((product) => {
                    const quantityInCart = cartItems
                      .filter((item) => item.productId === product.id)
                      .reduce(
                        (sum, item) => sum + item.quantity,
                        0
                    );

                    return (
                      <ProductCard
                        key={product.id}
                        className="shrink-0 snap-start"
                        product={product}
                        quantityInCart={quantityInCart}
                        onAddProduct={addProduct}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {successMessage ? (
            <p className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-sm font-bold text-emerald-300">
              {successMessage}
            </p>
          ) : null}

          {submitError ? (
            <p className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/15 p-4 text-sm font-bold text-rose-300">
              {submitError}
            </p>
          ) : null}
        </section>
      </main>

      <CartSummary
        items={cartItems}
        total={total}
        onOpenCart={() => setIsCartOpen(true)}
        onGenerateOrder={openCustomerModal}
      />

      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        total={total}
        onClose={() => setIsCartOpen(false)}
        onIncreaseItem={increaseItem}
        onDecreaseItem={decreaseItem}
        onRemoveItem={removeItem}
        onGenerateOrder={openCustomerModal}
      />

      {isCustomerModalOpen ? (
        <CustomerInfoModal
          key={customerModalSession}
          isOpen={isCustomerModalOpen}
          total={submittedTotal ?? total}
          deliveryEnabled={deliveryEnabled}
          deliveryType={effectiveDeliveryType}
          deliveryFee={deliveryFeeApplied}
          deliveryMinimumOrder={restaurantProfile.deliveryMinimumOrder}
          deliveryNotes={restaurantProfile.deliveryNotes}
          deliveryAddress={effectiveDeliveryAddress}
          isSubmitting={isSubmitting}
          successMessage={successMessage}
          successOrderId={successOrderId}
          successCustomerCode={successCustomerCode}
          successCustomerCodeWasProvided={successCustomerCodeWasProvided}
          errorMessage={submitError}
          initialCustomerCode={storedCustomerCode}
          customerDisplayName={storedCustomerProfile?.displayName ?? null}
          isLoadingCustomerProfile={isLoadingStoredCustomerProfile}
          onDeliveryTypeChange={setDeliveryType}
          onDeliveryAddressChange={setDeliveryAddress}
          onCustomerCodeChange={updateStoredCustomerCode}
          onForgetCustomerCode={forgetStoredCustomerCode}
          onClose={closeCustomerModal}
          onSubmit={submitOrder}
        />
      ) : null}

      {customizingProduct ? (
        <ProductOptionsModal
          key={customizingProduct.id}
          product={customizingProduct}
          isOpen={customizingProduct !== null}
          onClose={() => setCustomizingProduct(null)}
          onAddToCart={addConfiguredProduct}
        />
      ) : null}
    </div>
  );
}
