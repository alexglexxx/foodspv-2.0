"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { User } from "firebase/auth";

import { AppButton } from "@/components/ui/AppButton";
import type { UserRole } from "@/modules/auth/types/userRole";

import {
  createSuperAdminUser,
  fetchSuperAdminUsers,
  updateSuperAdminUser,
} from "../services/superAdminApiService";
import type {
  SuperAdminTenantSummary,
  SuperAdminUserInput,
  SuperAdminUserSummary,
} from "../types/superAdmin";

interface InternalUsersManagerProps {
  user: User;
  tenants: SuperAdminTenantSummary[];
}

const DEFAULT_USER_FORM: SuperAdminUserInput = {
  email: "",
  displayName: "",
  password: "",
  role: "tenant_admin",
  tenantId: null,
  active: true,
};

const ROLE_OPTIONS: Array<{
  value: UserRole;
  label: string;
}> = [
  { value: "superadmin", label: "superadmin" },
  { value: "tenant_admin", label: "tenant_admin" },
  { value: "employee", label: "employee" },
];

function getEmptyMessage(role: UserRole): string {
  return role === "superadmin"
    ? "Acceso global sin tenant."
    : "Asigna un tenant operativo.";
}

export function InternalUsersManager({
  user,
  tenants,
}: InternalUsersManagerProps) {
  const [users, setUsers] = useState<SuperAdminUserSummary[]>([]);
  const [form, setForm] = useState<SuperAdminUserInput>(DEFAULT_USER_FORM);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  async function loadUsers(): Promise<void> {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchSuperAdminUsers(user);

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setUsers(response.users);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron cargar usuarios."
      );
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialUsers(): Promise<void> {
      try {
        const response = await fetchSuperAdminUsers(user);

        if (cancelled) {
          return;
        }

        if (!response.success) {
          setErrorMessage(response.message);
          return;
        }

        setUsers(response.users);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "No se pudieron cargar usuarios."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialUsers();

    return () => {
      cancelled = true;
    };
  }, [user]);

  function resetForm(): void {
    setForm(DEFAULT_USER_FORM);
    setEditingUserId(null);
    setMessage(null);
    setErrorMessage(null);
  }

  function applyFormChange(
    update: Partial<SuperAdminUserInput>
  ): void {
    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        ...update,
      };

      if (nextForm.role === "superadmin") {
        nextForm.tenantId = null;
      }

      return nextForm;
    });
  }

  function editUser(selectedUser: SuperAdminUserSummary): void {
    setEditingUserId(selectedUser.uid);
    setForm({
      email: selectedUser.email,
      displayName: selectedUser.displayName,
      password: "",
      role: selectedUser.role,
      tenantId: selectedUser.tenantId,
      active: selectedUser.active,
    });
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isSavingRef.current) {
      return;
    }

    if (form.role !== "superadmin" && !form.tenantId) {
      setMessage(null);
      setErrorMessage("Selecciona un tenant para tenant_admin o employee.");
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const payload: SuperAdminUserInput = {
        ...form,
        email: form.email.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        password: form.password.trim(),
      };

      const response = editingUserId
        ? await updateSuperAdminUser(user, editingUserId, payload)
        : await createSuperAdminUser(user, payload);

      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }

      setMessage(editingUserId ? "Usuario actualizado." : "Usuario creado.");
      resetForm();
      await loadUsers();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar el usuario."
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleToggleActive(selectedUser: SuperAdminUserSummary): Promise<void> {
    const response = await updateSuperAdminUser(user, selectedUser.uid, {
      email: selectedUser.email,
      displayName: selectedUser.displayName,
      password: "",
      role: selectedUser.role,
      tenantId: selectedUser.tenantId,
      active: !selectedUser.active,
    });

    if (!response.success) {
      setMessage(null);
      setErrorMessage(response.message);
      return;
    }

    if (editingUserId === selectedUser.uid) {
      applyFormChange({ active: !selectedUser.active });
    }

    setMessage(!selectedUser.active ? "Usuario activado." : "Usuario desactivado.");
    setErrorMessage(null);
    await loadUsers();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-stone-950">
              Usuarios internos
            </h3>
            <p className="mt-1 text-sm font-semibold text-stone-600">
              `users/{'{'}uid{'}'}` define rol, tenant operativo y estado activo.
            </p>
          </div>
          <AppButton
            onClick={() => void loadUsers()}
            variant="secondary"
            size="sm"
            className="border-orange-200 text-orange-800 hover:bg-orange-50"
          >
            Recargar
          </AppButton>
        </div>

        {message ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
            {message}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3">
          {isLoading ? (
            <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm font-semibold text-stone-500">
              Cargando usuarios...
            </p>
          ) : null}

          {!isLoading && users.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm font-semibold text-stone-500">
              No hay usuarios internos todavía.
            </p>
          ) : null}

          {!isLoading
            ? users.map((internalUser) => (
                <article
                  key={internalUser.uid}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-stone-950">
                        {internalUser.email}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-stone-600">
                        {internalUser.displayName || "Sin nombre visible"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge label={internalUser.role} tone="stone" />
                        <Badge
                          label={internalUser.active ? "Activo" : "Inactivo"}
                          tone={internalUser.active ? "emerald" : "rose"}
                        />
                        <Badge
                          label={internalUser.tenantId ?? "Global"}
                          tone="amber"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <AppButton
                        onClick={() => editUser(internalUser)}
                        variant="secondary"
                        size="sm"
                        className="border-stone-300"
                      >
                        Editar
                      </AppButton>
                      <AppButton
                        onClick={() => void handleToggleActive(internalUser)}
                        variant="secondary"
                        size="sm"
                        className={
                          internalUser.active
                            ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }
                      >
                        {internalUser.active ? "Desactivar" : "Activar"}
                      </AppButton>
                    </div>
                  </div>
                </article>
              ))
            : null}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-black text-stone-950">
            {editingUserId ? "Editar usuario" : "Crear usuario"}
          </h3>
          <p className="mt-1 text-sm font-semibold text-stone-600">
            No crea claims nuevas. Solo crea Auth y escribe `users/{'{'}uid{'}'}`.
          </p>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="text-sm font-extrabold">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => applyFormChange({ email: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-stone-100"
              autoComplete="email"
              disabled={editingUserId !== null}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-extrabold">Nombre visible</span>
            <input
              type="text"
              value={form.displayName}
              onChange={(event) =>
                applyFormChange({ displayName: event.target.value })
              }
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              maxLength={80}
            />
          </label>

          <label className="block">
            <span className="text-sm font-extrabold">
              {editingUserId ? "Nueva contraseña" : "Contraseña"}
            </span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => applyFormChange({ password: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              autoComplete={editingUserId ? "new-password" : "new-password"}
              placeholder={
                editingUserId ? "Opcional para resetear password" : "Mínimo 6 caracteres"
              }
              required={editingUserId === null}
            />
          </label>

          <label className="block">
            <span className="text-sm font-extrabold">Rol</span>
            <select
              value={form.role}
              onChange={(event) =>
                applyFormChange({ role: event.target.value as UserRole })
              }
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-extrabold">Tenant operativo</span>
            <select
              value={form.tenantId ?? ""}
              onChange={(event) =>
                applyFormChange({
                  tenantId: event.target.value.trim().length > 0 ? event.target.value : null,
                })
              }
              disabled={form.role === "superadmin"}
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-stone-100"
            >
              <option value="">{getEmptyMessage(form.role)}</option>
              {tenants.map((tenant) => (
                <option key={tenant.tenantId} value={tenant.tenantId}>
                  {tenant.name} ({tenant.tenantId})
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => applyFormChange({ active: event.target.checked })}
              className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-bold text-stone-700">Usuario activo</span>
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <AppButton
              type="submit"
              loading={isSaving}
              loadingText={editingUserId ? "Guardando..." : "Creando..."}
            >
              {editingUserId ? "Guardar cambios" : "Crear usuario"}
            </AppButton>
            <AppButton
              type="button"
              onClick={resetForm}
              variant="secondary"
              className="border-stone-300"
            >
              Limpiar
            </AppButton>
          </div>
        </form>
      </section>
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "stone" | "emerald" | "rose" | "amber";
}) {
  const toneClassName =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-stone-200 bg-stone-100 text-stone-700";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] ${toneClassName}`}
    >
      {label}
    </span>
  );
}
