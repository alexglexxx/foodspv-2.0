"use client";

import { useState, type FormEvent } from "react";
import type { User } from "firebase/auth";

import {
  createSuperAdminProduct,
  deleteSuperAdminProduct,
  fetchSuperAdminTenantProducts,
  updateSuperAdminProduct,
} from "../services/superAdminApiService";
import type {
  SuperAdminProductInput,
  SuperAdminProductSummary,
} from "../types/superAdmin";
import { ProductForm } from "./ProductForm";

interface ProductManagerProps {
  user: User;
  tenantId: string;
  tenantName: string;
  onProductsChanged: () => Promise<void>;
}

const EMPTY_PRODUCT_FORM: SuperAdminProductInput = {
  name: "",
  description: "",
  price: 0,
  category: "",
  imageUrl: "",
  active: true,
  available: true,
  modifiers: [],
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

function getProductFormFromSummary(
  product: SuperAdminProductSummary
): SuperAdminProductInput {
  return {
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    imageUrl: product.imageUrl,
    active: product.active,
    available: product.available,
    modifiers: product.modifiers,
  };
}

export function ProductManager({
  user,
  tenantId,
  tenantName,
  onProductsChanged,
}: ProductManagerProps) {
  const [products, setProducts] = useState<SuperAdminProductSummary[]>([]);
  const [form, setForm] =
    useState<SuperAdminProductInput>(EMPTY_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const showForm = editingProductId !== null || form !== EMPTY_PRODUCT_FORM;

  async function loadProducts(): Promise<void> {
    setIsLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetchSuperAdminTenantProducts(user, tenantId);

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setProducts(response.products);
      setIsLoaded(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar productos."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function startNewProduct(): void {
    setForm({ ...EMPTY_PRODUCT_FORM, modifiers: [] });
    setEditingProductId(null);
    setMessage(null);
    setErrorMessage(null);
  }

  function cancelForm(): void {
    setForm(EMPTY_PRODUCT_FORM);
    setEditingProductId(null);
  }

  function editProduct(product: SuperAdminProductSummary): void {
    setForm(getProductFormFromSummary(product));
    setEditingProductId(product.productId);
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleSaveProduct(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = editingProductId
        ? await updateSuperAdminProduct(user, tenantId, editingProductId, form)
        : await createSuperAdminProduct(user, tenantId, form);

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setMessage(editingProductId ? "Producto actualizado." : "Producto creado.");
      cancelForm();
      await loadProducts();
      await onProductsChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar producto."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProduct(productId: string): Promise<void> {
    setDeletingProductId(productId);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await deleteSuperAdminProduct(user, tenantId, productId);

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      if (editingProductId === productId) {
        cancelForm();
      }

      setMessage("Producto desactivado.");
      await loadProducts();
      await onProductsChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo desactivar producto."
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  return (
    <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-orange-600">
            Productos del negocio
          </p>
          <h2 className="mt-2 text-2xl font-black">{tenantName}</h2>
          <p className="mt-2 text-sm font-semibold text-stone-500">
            Tenant: {tenantId}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void loadProducts()}
            disabled={isLoading}
            className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-extrabold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Cargando..." : "Cargar productos"}
          </button>
          <button
            type="button"
            onClick={startNewProduct}
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-stone-800"
          >
            Nuevo producto
          </button>
        </div>
      </div>

      {message ? (
        <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-5">
          <ProductForm
            form={form}
            isEditing={editingProductId !== null}
            isSaving={isSaving}
            onChange={setForm}
            onCancel={cancelForm}
            onSubmit={(event) => void handleSaveProduct(event)}
          />
        </div>
      ) : null}

      {!isLoaded && !isLoading ? (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-4 text-sm font-semibold text-stone-500">
          Carga los productos para administrar el menú de este negocio.
        </p>
      ) : null}

      {isLoaded && products.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-4 text-sm font-semibold text-stone-500">
          No hay productos registrados.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {products.map((product) => {
          const activeModifiers = product.modifiers.filter(
            (modifier) => modifier.active
          ).length;

          return (
            <article
              key={product.productId}
              className="rounded-[1.5rem] border border-stone-200 p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-black">{product.name}</h3>
                  <p className="mt-2 text-sm font-semibold text-stone-500">
                    {product.category} · {formatCurrency(product.price)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={
                      product.active
                        ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200"
                        : "rounded-full bg-stone-100 px-3 py-1 text-xs font-extrabold text-stone-600 ring-1 ring-stone-200"
                    }
                  >
                    {product.active ? "Activo" : "Inactivo"}
                  </span>
                  <span
                    className={
                      product.available
                        ? "rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-700 ring-1 ring-orange-200"
                        : "rounded-full bg-stone-100 px-3 py-1 text-xs font-extrabold text-stone-600 ring-1 ring-stone-200"
                    }
                  >
                    {product.available ? "Disponible" : "No disponible"}
                  </span>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-600">
                {product.description || "Sin descripción configurada."}
              </p>

              <p className="mt-4 text-sm font-bold text-stone-700">
                {activeModifiers} modificadores activos
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => editProduct(product)}
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-stone-100"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteProduct(product.productId)}
                  disabled={deletingProductId === product.productId}
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingProductId === product.productId
                    ? "Desactivando..."
                    : "Desactivar"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
