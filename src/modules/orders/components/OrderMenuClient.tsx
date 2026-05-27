"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";

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

interface FirestoreProductRecord {
  tenantId?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  imageUrl?: unknown;
  available?: unknown;
  category?: unknown;
}

const RESTAURANT_PROFILE = {
  name: "Taquería Los Compadres",
  greeting: "¡Qué onda! 👋",
  description:
    "Los mejores tacos al pastor, asada y chorizo. Hechos al momento para ti.",
  rating: "4.9",
  reviews: "128",
  estimatedTime: "15–20 min",
  location: "Puerto Vallarta",
  heroImageUrl:
    "https://images.unsplash.com/photo-1613514785940-daed07799d9b?q=80&w=1400&auto=format&fit=crop",
};

const CATEGORY_PRIORITY: Record<string, number> = {
  tacos: 1,
  taco: 1,
  "articulos bandera": 1,
  "artículos bandera": 1,
  favoritos: 1,
  bebidas: 2,
  bebida: 2,
  extras: 3,
  extra: 3,
  salsas: 4,
  salsa: 4,
  postres: 5,
  postre: 5,
};

const CATEGORY_LABELS: Record<string, string> = {
  tacos: "Tacos",
  taco: "Tacos",
  bebidas: "Bebidas",
  bebida: "Bebidas",
  extras: "Extras",
  extra: "Extras",
  salsas: "Salsas",
  salsa: "Salsas",
  postres: "Postres",
  postre: "Postres",
  favoritos: "Favoritos",
  "articulos bandera": "Favoritos",
  "artículos bandera": "Favoritos",
};

const CATEGORY_ICONS: Record<string, string> = {
  tacos: "🌮",
  taco: "🌮",
  bebidas: "🥤",
  bebida: "🥤",
  extras: "🥑",
  extra: "🥑",
  salsas: "🌶️",
  salsa: "🌶️",
  postres: "🧁",
  postre: "🧁",
  favoritos: "⭐",
  "articulos bandera": "⭐",
  "artículos bandera": "⭐",
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
  return CATEGORY_LABELS[categoryKey] ?? "Otros";
}

function getCategoryIcon(categoryKey: string): string {
  return CATEGORY_ICONS[categoryKey] ?? "🍽️";
}

function getCategoryPriority(categoryKey: string): number {
  return CATEGORY_PRIORITY[categoryKey] ?? 99;
}

function mapProduct(
  productId: string,
  tenantId: string,
  record: FirestoreProductRecord
): Product | null {
  if (!isNonEmptyString(record.name) || typeof record.price !== "number") {
    return null;
  }

  return {
    id: productId,
    tenantId: isNonEmptyString(record.tenantId)
      ? record.tenantId.trim()
      : tenantId,
    name: record.name.trim(),
    description: toOptionalString(record.description),
    price: record.price,
    imageUrl: toOptionalString(record.imageUrl),
    available: typeof record.available === "boolean" ? record.available : true,
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
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] =
    useState<boolean>(false);
  const [customerModalSession, setCustomerModalSession] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [submittedTotal, setSubmittedTotal] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const productsQuery = query(
          collection(db, "tenants", tenantId, "products")
        );

        const snapshot = await getDocs(productsQuery);

        const loadedProducts = snapshot.docs
          .map((document) =>
            mapProduct(
              document.id,
              tenantId,
              document.data() as FirestoreProductRecord
            )
          )
          .filter((product): product is Product => product !== null)
          .filter((product) => product.available);

        if (!isMounted) return;

        setProducts(
          loadedProducts.sort((left, right) => {
            const leftCategory = normalizeCategory(left.category);
            const rightCategory = normalizeCategory(right.category);

            const priorityDifference =
              getCategoryPriority(leftCategory) -
              getCategoryPriority(rightCategory);

            if (priorityDifference !== 0) return priorityDifference;

            return left.name.localeCompare(right.name, "es");
          })
        );
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el menú."
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadProducts();

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
      return getCategoryPriority(leftKey) - getCategoryPriority(rightKey);
    });
  }, [products]);

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
              backgroundImage: `linear-gradient(90deg, #fffaf2 0%, rgba(255,250,242,0.82) 28%, rgba(255,250,242,0.18) 62%), url(${RESTAURANT_PROFILE.heroImageUrl})`,
            }}
            aria-hidden="true"
          />

          <div className="relative z-10">
            <div className="mb-12 flex items-center justify-end">
              <div className="inline-flex max-w-[75%] items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-sm font-bold text-stone-900 shadow-sm ring-1 ring-stone-200 backdrop-blur">
                <span aria-hidden="true">🏪</span>
                <span className="truncate">{RESTAURANT_PROFILE.name}</span>
                <span aria-hidden="true">⌄</span>
              </div>
            </div>

            <p className="text-sm font-extrabold text-orange-600">
              {RESTAURANT_PROFILE.greeting}
            </p>

            <h1 className="mt-4 max-w-[14rem] text-5xl font-black leading-[1.05] tracking-tight text-stone-950 sm:max-w-md sm:text-6xl">
              {RESTAURANT_PROFILE.name}
            </h1>

            <p className="mt-5 max-w-[17rem] text-base font-medium leading-8 text-stone-600 sm:max-w-md">
              {RESTAURANT_PROFILE.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-bold text-stone-900">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">⭐</span>
                {RESTAURANT_PROFILE.rating} ({RESTAURANT_PROFILE.reviews})
              </span>

              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">🕒</span>
                {RESTAURANT_PROFILE.estimatedTime}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 shadow-sm ring-1 ring-stone-200 backdrop-blur">
                <span aria-hidden="true">📍</span>
                {RESTAURANT_PROFILE.location}
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
              {groupedProducts.map(([categoryKey]) => (
                <div
                  key={categoryKey}
                  className="shrink-0 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-stone-900 shadow-sm ring-1 ring-stone-200 first:bg-orange-600 first:text-white"
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
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {getCategoryIcon(categoryKey)}
                  </span>

                  <h3 className="text-2xl font-black text-stone-950">
                    {getCategoryLabel(categoryKey)}
                  </h3>

                  {index === 0 ? (
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-600">
                      Nuestros más pedidos
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
