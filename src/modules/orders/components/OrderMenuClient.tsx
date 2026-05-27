"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
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

  const featuredCategoryKey = normalizeCategory(restaurantProfile.featuredCategory);

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
    if (cartItems.length === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const order = buildOrder(tenantId, customerInfo, cartItems, total);
      const result = await createOrder(order);

      if (!result.success) {
        const validationMessage =
          result.errors.length > 0 ? ` ${result.errors.join(" ")}` : "";

        setSubmitError(`${result.message}${validationMessage}`);
        return;
      }

      setSuccessMessage(result.message);
      setSuccessOrderId(result.orderId);
      setSubmittedTotal(total);
      setCartItems([]);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al generar el pedido."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf5ed] text-stone-950">
      <main className="mx-auto flex w-full max-w-5xl flex-col pb-32">
        <section className="relative overflow-hidden border-b border-stone-200 bg-[#fffaf2] px-5 pb-8 pt-6 sm:px-8">
          <div
            className="absolute inset-y-0 right-0 w-[62%] bg-cover bg-center opacity-95"
            style={{
              backgroundImage: `linear-gradient(90deg, #fffaf2 0%, rgba(255,250,242,0.86) 30%, rgba(255,250,242,0.2) 68%), url(${restaurantProfile.heroImageUrl})`,
            }}
            aria-hidden="true"
          />

          <div className="relative z-10">
            <div className="mb-12 flex items-center justify-end">
              <div className="inline-flex max-w-[75%] items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-sm font-bold text-stone-900 shadow-sm ring-1 ring-stone-200 backdrop-blur">
                <span aria-hidden="true">🏪</span>
                <span className="truncate">{restaurantProfile.name}</span>
                <span aria-hidden="true">⌄</span>
              </div>
            </div>

            <p className="text-sm font-extrabold text-orange-600">
              {restaurantProfile.greeting}
            </p>

            <h1 className="mt-4 max-w-[14rem] text-5xl font-black leading-[1.05] tracking-tight text-stone-950 sm:max-w-md sm:text-6xl">
              {restaurantProfile.name}
            </h1>

            <p className="mt-5 max-w-[17rem] text-base font-medium leading-8 text-stone-600 sm:max-w-md">
              {restaurantProfile.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-bold text-stone-900">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">⭐</span>
                {restaurantProfile.rating} ({restaurantProfile.reviews})
              </span>

              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">🕒</span>
                {restaurantProfile.estimatedTime}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 shadow-sm ring-1 ring-stone-200 backdrop-blur">
                <span aria-hidden="true">📍</span>
                {restaurantProfile.location}
              </span>
            </div>
          </div>
        </section>

        <section className="px-5 py-7 sm:px-8">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-4xl font-black tracking-tight text-stone-950">
                Menú
              </h2>

              <div className="hidden rounded-full bg-white px-4 py-3 text-sm font-medium text-stone-400 shadow-sm ring-1 ring-stone-200 sm:block">
                🔎 Buscar productos...
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {groupedProducts.map(([categoryKey], index) => (
                <div
                  key={categoryKey}
                  className={
                    index === 0
                      ? "shrink-0 rounded-full bg-orange-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm"
                      : "shrink-0 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-stone-900 shadow-sm ring-1 ring-stone-200"
                  }
                >
                  <span className="mr-2" aria-hidden="true">
                    {getCategoryIcon(categoryKey)}
                  </span>
                  {getCategoryLabel(categoryKey)}
                </div>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-[2rem] border border-stone-200 bg-white p-6 text-sm font-medium text-stone-500 shadow-sm">
              Preparando el menú...
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700 shadow-sm">
              No se pudo cargar el menú. Intenta de nuevo en unos minutos.
            </div>
          ) : null}

          {!isLoading && !errorMessage && products.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-6 text-sm font-medium text-stone-500 shadow-sm">
              Por ahora no hay productos disponibles.
            </div>
          ) : null}

          <div className="space-y-6">
            {groupedProducts.map(([categoryKey, categoryProducts], index) => (
              <section
                key={categoryKey}
                className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-stone-200"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {getCategoryIcon(categoryKey)}
                  </span>

                  <h3 className="text-2xl font-black text-stone-950">
                    {getCategoryLabel(categoryKey)}
                  </h3>

                  {index === 0 ? (
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-600">
                      Los favoritos de la casa
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {categoryProducts.map((product) => {
                    const cartItem = cartItems.find(
                      (item) => item.productId === product.id
                    );

                    return (
                      <ProductCard
                        key={product.id}
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
            <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          {submitError ? (
            <p className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">
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
