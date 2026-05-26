"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { CartItem } from "@/types/cart.types";
import type { Product } from "@/types/product.types";

import { CartDrawer } from "./CartDrawer";
import { CartSummary } from "./CartSummary";
import { ProductCard } from "./ProductCard";

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

interface PendingOrderDraft {
  tenantId: string;
  items: CartItem[];
  total: number;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toOptionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
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
    tenantId: isNonEmptyString(record.tenantId) ? record.tenantId.trim() : tenantId,
    name: record.name.trim(),
    description: toOptionalString(record.description),
    price: record.price,
    imageUrl: toOptionalString(record.imageUrl),
    available: typeof record.available === "boolean" ? record.available : true,
    category: toOptionalString(record.category),
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

export function OrderMenuClient({ tenantId }: OrderMenuClientProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [pendingOrder, setPendingOrder] = useState<PendingOrderDraft | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const productsQuery = query(collection(db, "tenants", tenantId, "products"));
        const snapshot = await getDocs(productsQuery);
        const loadedProducts = snapshot.docs
          .map((document) =>
            mapProduct(
              document.id,
              tenantId,
              document.data() as FirestoreProductRecord
            )
          )
          .filter((product): product is Product => product !== null);

        if (!isMounted) {
          return;
        }

        setProducts(
          loadedProducts.sort((left, right) => left.name.localeCompare(right.name))
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los productos."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, [tenantId]);

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
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      );
    });
  }

  function increaseItem(productId: string): void {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  function decreaseItem(productId: string): void {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
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

  function generateOrder(): void {
    if (cartItems.length === 0) {
      setPendingOrder(null);
      return;
    }

    setPendingOrder({
      tenantId,
      items: cartItems,
      total,
    });
    setIsCartOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#f7f1e8] text-stone-900">
      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] bg-stone-950 px-6 py-8 text-white shadow-2xl sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
            FoodSPV
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Menú dinámico conectado al carrito del tenant
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
            Explora productos cargados desde Firestore, agrega al carrito y
            recalcula el total en tiempo real antes de generar el pedido.
          </p>
          <div className="mt-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm text-stone-200">
            tenantId: {tenantId}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                Catálogo
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-stone-900">
                Productos disponibles
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-stone-400 hover:bg-stone-50"
            >
              Abrir carrito
            </button>
          </div>

          {isLoading ? (
            <div className="rounded-[2rem] border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
              Cargando productos del tenant...
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
              No se pudo leer `tenants/{tenantId}/products`: {errorMessage}
            </div>
          ) : null}

          {!isLoading && !errorMessage && products.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500 shadow-sm">
              No hay productos disponibles para este tenant.
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
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

        <CartSummary
          items={cartItems}
          total={total}
          onOpenCart={() => setIsCartOpen(true)}
          onGenerateOrder={generateOrder}
        />

        <section className="mt-6 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            Siguiente acción
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">
            Botón generar pedido
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            El flujo actual prepara un borrador local del pedido con `tenantId`,
            items y total. Persistencia y envío pueden conectarse en la siguiente
            tarea sin acoplar esta pantalla al backend.
          </p>
          <div className="mt-4 rounded-2xl bg-stone-950 p-4 text-sm text-stone-100">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(
                pendingOrder ?? {
                  tenantId,
                  items: [],
                  total: 0,
                },
                null,
                2
              )}
            </pre>
          </div>
          {pendingOrder ? (
            <p className="mt-4 text-sm font-medium text-emerald-700">
              Pedido listo para continuar: {formatCurrency(pendingOrder.total)}
            </p>
          ) : null}
        </section>
      </main>

      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        total={total}
        onClose={() => setIsCartOpen(false)}
        onIncreaseItem={increaseItem}
        onDecreaseItem={decreaseItem}
        onRemoveItem={removeItem}
        onGenerateOrder={generateOrder}
      />
    </div>
  );
}
