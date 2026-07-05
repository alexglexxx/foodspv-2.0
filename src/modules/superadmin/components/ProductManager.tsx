"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";

import { AppButton } from "@/components/ui/AppButton";
import { normalizeProductPricingMode } from "@/types/product.types";

import {
  createSuperAdminProduct,
  deleteSuperAdminProduct,
  duplicateSuperAdminProduct,
  fetchSuperAdminTenantProducts,
  setSuperAdminProductActive,
  updateSuperAdminProduct,
} from "../services/superAdminApiService";
import type {
  SuperAdminProductInput,
  SuperAdminProductSummary,
} from "../types/superAdmin";
import { ProductModal } from "./ProductModal";

interface ProductManagerProps {
  user: User;
  tenantId: string;
  tenantName: string;
  onProductsChanged: () => Promise<void>;
}

const EMPTY_PRODUCT_FORM: SuperAdminProductInput = {
  name: "",
  description: "",
  pricingMode: "fixed",
  price: 0,
  category: "",
  imageUrl: "",
  images: [],
  active: true,
  available: true,
  options: [],
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
  const pricingMode = normalizeProductPricingMode(product);

  return {
    name: product.name,
    description: product.description,
    pricingMode,
    price: pricingMode === "fixed" ? product.price ?? 0 : null,
    category: product.category,
    imageUrl: product.imageUrl,
    images: product.images || [],
    active: product.active,
    available: product.available,
    options: product.options,
  };
}

function getProductPricingLabel(product: SuperAdminProductSummary): string {
  return normalizeProductPricingMode(product) === "quote"
    ? "Por cotizar"
    : formatCurrency(product.price ?? 0);
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
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [productPendingDelete, setProductPendingDelete] =
    useState<SuperAdminProductSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [actionProductId, setActionProductId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isLoadingProductsRef = useRef<boolean>(false);
  const isSavingProductRef = useRef<boolean>(false);
  const deletingProductRef = useRef<string | null>(null);

  const loadProducts = useCallback(async (): Promise<void> => {
    if (isLoadingProductsRef.current) {
      return;
    }

    isLoadingProductsRef.current = true;
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
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar productos."
      );
    } finally {
      isLoadingProductsRef.current = false;
      setIsLoading(false);
    }
  }, [tenantId, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProducts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProducts]);

  function startNewProduct(): void {
    if (isSaving) {
      return;
    }

    setForm({ ...EMPTY_PRODUCT_FORM, options: [] });
    setEditingProductId(null);
    setIsProductModalOpen(true);
    setMessage(null);
    setErrorMessage(null);
  }

  function cancelForm(): void {
    setForm(EMPTY_PRODUCT_FORM);
    setEditingProductId(null);
    setIsProductModalOpen(false);
  }

  function editProduct(product: SuperAdminProductSummary): void {
    setForm(getProductFormFromSummary(product));
    setEditingProductId(product.productId);
    setIsProductModalOpen(true);
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleSaveProduct(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (isSavingProductRef.current) {
      return;
    }

    isSavingProductRef.current = true;
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
      isSavingProductRef.current = false;
      setIsSaving(false);
    }
  }

  function openDeleteProductModal(product: SuperAdminProductSummary): void {
    if (deletingProductRef.current !== null) {
      return;
    }

    setProductPendingDelete(product);
    setMessage(null);
    setErrorMessage(null);
  }

  function closeDeleteProductModal(): void {
    if (deletingProductRef.current !== null) {
      return;
    }

    setProductPendingDelete(null);
  }

  async function handleDeleteProduct(): Promise<void> {
    const product = productPendingDelete;

    if (!product) {
      return;
    }

    if (deletingProductRef.current !== null) {
      return;
    }

    const productId = product.productId;

    deletingProductRef.current = productId;
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

      setProductPendingDelete(null);
      setMessage("Producto eliminado correctamente.");
      await loadProducts();
      await onProductsChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar producto."
      );
    } finally {
      deletingProductRef.current = null;
      setDeletingProductId(null);
    }
  }

  async function handleDuplicateProduct(
    product: SuperAdminProductSummary
  ): Promise<void> {
    if (actionProductId !== null || deletingProductRef.current !== null) {
      return;
    }

    setActionProductId(product.productId);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await duplicateSuperAdminProduct(
        user,
        tenantId,
        product.productId
      );

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setMessage(`Producto duplicado: ${response.product?.name ?? "copia creada"}.`);
      await loadProducts();
      await onProductsChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo duplicar producto."
      );
    } finally {
      setActionProductId(null);
    }
  }

  async function handleToggleProductActive(
    product: SuperAdminProductSummary
  ): Promise<void> {
    if (actionProductId !== null || deletingProductRef.current !== null) {
      return;
    }

    const nextActive = !product.active;

    setActionProductId(product.productId);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await setSuperAdminProductActive(
        user,
        tenantId,
        product.productId,
        nextActive
      );

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setMessage(nextActive ? "Producto activado." : "Producto desactivado.");
      await loadProducts();
      await onProductsChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del producto."
      );
    } finally {
      setActionProductId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-950">{tenantName}</h2>
          <p className="mt-1 text-sm font-semibold text-stone-500">
            Tenant: {tenantId}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <AppButton
            onClick={() => void loadProducts()}
            loading={isLoading}
            loadingText="Cargando..."
            variant="secondary"
          >
            Actualizar productos
          </AppButton>
          <AppButton
            onClick={startNewProduct}
            disabled={isSaving}
          >
            Agregar producto
          </AppButton>
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

      {!isLoading && products.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-4 text-sm font-semibold text-stone-500">
          No hay productos registrados.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {products.map((product) => {
          const activeOptions = product.options.filter((option) =>
            option.values.some((value) => value.active)
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
                    {product.category} · {getProductPricingLabel(product)}
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
                {activeOptions} opciones activas
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <AppButton
                  onClick={() => editProduct(product)}
                  variant="secondary"
                  size="sm"
                  disabled={
                    isSaving ||
                    deletingProductId !== null ||
                    actionProductId !== null
                  }
                >
                  ✏️ Editar
                </AppButton>
                <AppButton
                  onClick={() => void handleDuplicateProduct(product)}
                  variant="secondary"
                  size="sm"
                  disabled={
                    deletingProductId !== null ||
                    (actionProductId !== null &&
                      actionProductId !== product.productId)
                  }
                  loading={actionProductId === product.productId}
                  loadingText="Copiando..."
                >
                  📄 Duplicar
                </AppButton>
                <AppButton
                  onClick={() => void handleToggleProductActive(product)}
                  variant="secondary"
                  size="sm"
                  disabled={
                    deletingProductId !== null ||
                    (actionProductId !== null &&
                      actionProductId !== product.productId)
                  }
                  loading={actionProductId === product.productId}
                  loadingText="Actualizando..."
                >
                  {product.active ? "👁 Desactivar" : "👁 Activar"}
                </AppButton>
                <AppButton
                  onClick={() => openDeleteProductModal(product)}
                  disabled={
                    actionProductId !== null ||
                    (deletingProductId !== null &&
                      deletingProductId !== product.productId)
                  }
                  loading={deletingProductId === product.productId}
                  loadingText="Eliminando..."
                  variant="danger"
                  size="sm"
                >
                  🗑️ Eliminar
                </AppButton>
              </div>
            </article>
          );
        })}
      </div>

      {isProductModalOpen ? (
        <ProductModal
          form={form}
          isEditing={editingProductId !== null}
          isSaving={isSaving}
          onChange={setForm}
          onCancel={cancelForm}
          onSubmit={(event) => void handleSaveProduct(event)}
        />
      ) : null}

      {productPendingDelete ? (
        <DeleteProductModal
          productName={productPendingDelete.name}
          isDeleting={deletingProductId === productPendingDelete.productId}
          onCancel={closeDeleteProductModal}
          onDelete={() => void handleDeleteProduct()}
        />
      ) : null}
    </div>
  );
}

function DeleteProductModal({
  productName,
  isDeleting,
  onCancel,
  onDelete,
}: {
  productName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 px-4 py-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-product-modal-title"
      onMouseDown={() => {
        if (!isDeleting) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-stone-100 px-5 py-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-rose-700">
            Productos
          </p>
          <h2
            id="delete-product-modal-title"
            className="mt-1 text-xl font-black text-stone-950"
          >
            Eliminar producto
          </h2>
        </div>

        <div className="px-5 py-5">
          <p className="text-base font-semibold leading-7 text-stone-800">
            ¿Seguro que deseas eliminar &quot;{productName}&quot;?
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-stone-500">
            Esta acción no afecta pedidos anteriores.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 sm:flex-row sm:justify-end">
          <AppButton
            onClick={onCancel}
            variant="secondary"
            disabled={isDeleting}
          >
            Cancelar
          </AppButton>
          <AppButton
            onClick={onDelete}
            variant="danger"
            loading={isDeleting}
            loadingText="Eliminando..."
          >
            Eliminar
          </AppButton>
        </div>
      </div>
    </div>
  );
}
