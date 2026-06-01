"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { collection, doc, getDoc, getDocs, query } from "firebase/firestore";

import { AppButton } from "@/components/ui/AppButton";
import { db } from "@/lib/firebase/client";
import {
  getTenantThemeCssVariables,
  normalizeTenantTheme,
} from "@/modules/theme/services/themeService";
import type { TenantTheme } from "@/modules/theme/types/theme";
import type { CartItem } from "@/types/cart.types";
import type { Product } from "@/types/product.types";

import { CartDrawer } from "./CartDrawer";
import { CartSummary } from "./CartSummary";
import { CustomerInfoModal } from "./CustomerInfoModal";
import { ProductCard } from "./ProductCard";
import { createOrder } from "../services/orderService";
import type { CustomerInfo, Order } from "../types/order";

interface OrderMenuClientProps {
  tenantId: string;
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
  tenantTheme: TenantTheme;
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
  tenantTheme?: unknown;
}

interface FirestoreProductRecord {
  tenantId?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  imageUrl?: unknown;
  available?: unknown;
  active?: unknown;
  category?: unknown;
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
  heroImageUrl:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1400&auto=format&fit=crop",
  tenantTheme: normalizeTenantTheme(null),
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

function getTypographyClassName(typography: TenantTheme["typography"]): string {
  if (typography === "soft") {
    return "font-medium";
  }

  if (typography === "modern") {
    return "font-sans";
  }

  return "font-black";
}

function getTenantThemeStyle(theme: TenantTheme): CSSProperties {
  return getTenantThemeCssVariables(theme) as CSSProperties;
}

function mapTenantProfile(record: FirestoreTenantRecord | undefined): RestaurantProfile {
  const featuredCategory =
    toOptionalString(record?.featuredCategory) ??
    toOptionalString(record?.category) ??
    DEFAULT_PROFILE.featuredCategory;

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
    tenantTheme: normalizeTenantTheme(record?.tenantTheme),
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
    available,
    category: toOptionalString(record.category),
  };
}

function mapCartItemsToOrderItems(items: CartItem[]): Order["productos"] {
  return items.map((item) => ({
    id: item.productId,
    nombre: item.productName,
    precio: item.unitPrice,
    cantidad: item.quantity,
  }));
}

function buildOrder(
  tenantId: string,
  customerInfo: CustomerInfo,
  items: CartItem[],
  total: number
): Order {
  return {
    tenantId,
    cliente: customerInfo,
    productos: mapCartItemsToOrderItems(items),
    total,
    estado: "pendiente",
    createdAt: Date.now(),
  };
}

export function OrderMenuClient({ tenantId }: OrderMenuClientProps) {
  const [restaurantProfile, setRestaurantProfile] =
    useState<RestaurantProfile>(DEFAULT_PROFILE);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [customerModalSession, setCustomerModalSession] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [submittedTotal, setSubmittedTotal] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const isSubmittingRef = useRef<boolean>(false);

  const featuredCategoryKey = normalizeCategory(restaurantProfile.featuredCategory);
  const tenantThemeStyle = getTenantThemeStyle(restaurantProfile.tenantTheme);
  const typographyClassName = getTypographyClassName(
    restaurantProfile.tenantTheme.typography
  );

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

  const total = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  function addProduct(product: Product): void {
    if (!product.available) {
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.productId === product.id
      );

      if (!existingItem) {
        return [
          ...currentItems,
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: product.price,
          },
        ];
      }

      return currentItems.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    });
  }

  function scrollToCategory(categoryKey: string): void {
    categoryRefs.current[categoryKey]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function increaseItem(productId: string): void {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseItem(productId: string): void {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(productId: string): void {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.productId !== productId)
    );
  }

  function resetOrderFeedback(): void {
    setSuccessMessage(null);
    setSuccessOrderId(null);
    setSubmittedTotal(null);
    setSubmitError(null);
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
      const order = buildOrder(tenantId, customerInfo, cartItems, total);
      const result = await createOrder(order);

      if (!result.success) {
        setSubmitError("No se pudo generar el pedido. Intenta de nuevo.");
        return;
      }

      setSuccessMessage("Pedido generado correctamente.");
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
      className={`min-h-screen bg-[#2b2118] text-[#fff7ed] ${typographyClassName}`}
      style={tenantThemeStyle}
    >
      <main className="mx-auto flex w-full max-w-5xl flex-col pb-32">
        <section className="relative overflow-hidden border-b border-[#6b5138] bg-[#3a2b1f] px-5 pb-5 pt-4 sm:px-8 sm:pb-6 sm:pt-5">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(58,43,31,0.98) 0%, rgba(58,43,31,0.94) 45%, rgba(58,43,31,0.78) 100%), url(${restaurantProfile.heroImageUrl})`,
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-[#2b2118]/55"
            aria-hidden="true"
          />

          <div className="relative z-10 drop-shadow-[0_2px_8px_rgba(43,33,24,0.72)]">
            <div className="mb-5 flex items-center justify-end sm:mb-6">
              <div className="inline-flex max-w-[75%] items-center gap-2 rounded-full bg-[#463426]/90 px-3 py-2 text-xs font-bold text-[#fff7ed] shadow-sm ring-1 ring-[#6b5138] backdrop-blur sm:text-sm">
                <span aria-hidden="true">🏪</span>
                <span className="truncate">{restaurantProfile.name}</span>
                <span aria-hidden="true">⌄</span>
              </div>
            </div>

            <p className="text-sm font-extrabold text-orange-400">
              {restaurantProfile.greeting}
            </p>

            <h1 className="mt-2 max-w-[14rem] text-3xl font-black leading-[1.05] tracking-tight text-[#fff7ed] sm:max-w-md sm:text-4xl">
              {restaurantProfile.name}
            </h1>

            <p className="mt-3 line-clamp-2 max-w-[17rem] text-sm font-medium leading-6 text-[#e7d4b8] sm:max-w-md">
              {restaurantProfile.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[#fff7ed] sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">⭐</span>
                {restaurantProfile.rating} ({restaurantProfile.reviews})
              </span>

              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">🕒</span>
                {restaurantProfile.estimatedTime}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-[#463426]/90 px-3 py-1.5 shadow-sm ring-1 ring-[#6b5138] backdrop-blur">
                <span aria-hidden="true">📍</span>
                {restaurantProfile.location}
              </span>
            </div>
          </div>
        </section>

        <section className="px-5 py-5 sm:px-8">
          <div className="mb-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black tracking-tight text-[#fff7ed]">
                Menú
              </h2>

              <div className="hidden rounded-full bg-[#463426] px-4 py-3 text-sm font-medium text-[#b99f80] shadow-sm ring-1 ring-[#6b5138] sm:block">
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
                      ? "shrink-0 !border-orange-600 !bg-orange-600 px-5 py-3 text-sm text-[#fff7ed] hover:!bg-orange-500 active:!bg-orange-700 focus-visible:ring-offset-[#2b2118]"
                      : "shrink-0 !border-[#6b5138] !bg-[#463426] px-5 py-3 text-sm text-[#e7d4b8] shadow-sm ring-1 ring-[#6b5138] hover:!bg-[#5a422e] active:!bg-[#3a2b1f] focus-visible:ring-offset-[#2b2118]"
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
            <div className="rounded-[2rem] border border-[#6b5138] bg-[#3a2b1f] p-6 text-sm font-medium text-[#b99f80] shadow-sm">
              Preparando el menú...
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[2rem] border border-rose-500/30 bg-rose-500/15 p-6 text-sm font-medium text-rose-300 shadow-sm">
              No se pudo cargar el menú. Intenta de nuevo en unos minutos.
            </div>
          ) : null}

          {!isLoading && !errorMessage && products.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[#6b5138] bg-[#3a2b1f] p-6 text-sm font-medium text-[#b99f80] shadow-sm">
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
                className="rounded-[1.75rem] bg-[#3a2b1f] p-5 shadow-sm ring-1 ring-[#6b5138]"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {getCategoryIcon(categoryKey)}
                  </span>

                  <h3 className="text-2xl font-black text-[#fff7ed]">
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
                    const cartItem = cartItems.find(
                      (item) => item.productId === product.id
                    );

                    return (
                      <ProductCard
                        key={product.id}
                        className="shrink-0 snap-start"
                        product={product}
                        quantityInCart={cartItem?.quantity ?? 0}
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
          isSubmitting={isSubmitting}
          successMessage={successMessage}
          successOrderId={successOrderId}
          errorMessage={submitError}
          onClose={closeCustomerModal}
          onSubmit={submitOrder}
        />
      ) : null}
    </div>
  );
}
