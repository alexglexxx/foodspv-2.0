import type { User } from "firebase/auth";

import type {
  SuperAdminProductInput,
  SuperAdminProductMutationResponse,
  SuperAdminProductsResponse,
  SuperAdminTenantInput,
  SuperAdminTenantMutationResponse,
  SuperAdminTenantResponse,
  SuperAdminTenantsResponse,
} from "../types/superAdmin";

async function getAuthorizationHeaders(user: User): Promise<HeadersInit> {
  return {
    Authorization: `Bearer ${await user.getIdToken()}`,
    "Content-Type": "application/json",
  };
}

export async function fetchSuperAdminTenants(
  user: User
): Promise<SuperAdminTenantsResponse> {
  const response = await fetch("/api/superadmin/tenants", {
    headers: await getAuthorizationHeaders(user),
  });

  return (await response.json()) as SuperAdminTenantsResponse;
}

export async function createSuperAdminTenant(
  user: User,
  input: SuperAdminTenantInput
): Promise<SuperAdminTenantMutationResponse> {
  const response = await fetch("/api/superadmin/tenants", {
    method: "POST",
    headers: await getAuthorizationHeaders(user),
    body: JSON.stringify(input),
  });

  return (await response.json()) as SuperAdminTenantMutationResponse;
}

export async function fetchSuperAdminTenant(
  user: User,
  tenantId: string
): Promise<SuperAdminTenantResponse> {
  const response = await fetch(`/api/superadmin/tenants/${tenantId}`, {
    headers: await getAuthorizationHeaders(user),
  });

  return (await response.json()) as SuperAdminTenantResponse;
}

export async function updateSuperAdminTenant(
  user: User,
  tenantId: string,
  input: SuperAdminTenantInput
): Promise<SuperAdminTenantMutationResponse> {
  const editableInput: Partial<SuperAdminTenantInput> = { ...input };
  delete editableInput.tenantId;

  const response = await fetch(`/api/superadmin/tenants/${tenantId}`, {
    method: "PATCH",
    headers: await getAuthorizationHeaders(user),
    body: JSON.stringify(editableInput),
  });

  return (await response.json()) as SuperAdminTenantMutationResponse;
}

export async function deleteSuperAdminTenant(
  user: User,
  tenantId: string
): Promise<SuperAdminTenantMutationResponse> {
  const response = await fetch(`/api/superadmin/tenants/${tenantId}`, {
    method: "DELETE",
    headers: await getAuthorizationHeaders(user),
  });

  return (await response.json()) as SuperAdminTenantMutationResponse;
}

export async function permanentlyDeleteTenant(
  user: User,
  tenantId: string
): Promise<{ success: true } | { success: false; message: string }> {
  const response = await fetch(`/api/tenants/${tenantId}`, {
    method: "DELETE",
    headers: await getAuthorizationHeaders(user),
  });

  return (await response.json()) as
    | { success: true }
    | { success: false; message: string };
}

export async function fetchSuperAdminTenantProducts(
  user: User,
  tenantId: string
): Promise<SuperAdminProductsResponse> {
  const response = await fetch(
    `/api/superadmin/tenants/${tenantId}/products`,
    {
      headers: await getAuthorizationHeaders(user),
    }
  );

  return (await response.json()) as SuperAdminProductsResponse;
}

export async function createSuperAdminProduct(
  user: User,
  tenantId: string,
  input: SuperAdminProductInput
): Promise<SuperAdminProductMutationResponse> {
  const response = await fetch(
    `/api/superadmin/tenants/${tenantId}/products`,
    {
      method: "POST",
      headers: await getAuthorizationHeaders(user),
      body: JSON.stringify(input),
    }
  );

  return (await response.json()) as SuperAdminProductMutationResponse;
}

export async function updateSuperAdminProduct(
  user: User,
  tenantId: string,
  productId: string,
  input: SuperAdminProductInput
): Promise<SuperAdminProductMutationResponse> {
  const response = await fetch(
    `/api/superadmin/tenants/${tenantId}/products/${productId}`,
    {
      method: "PATCH",
      headers: await getAuthorizationHeaders(user),
      body: JSON.stringify(input),
    }
  );

  return (await response.json()) as SuperAdminProductMutationResponse;
}

export async function duplicateSuperAdminProduct(
  user: User,
  tenantId: string,
  productId: string
): Promise<SuperAdminProductMutationResponse> {
  const response = await fetch(
    `/api/superadmin/tenants/${tenantId}/products/${productId}`,
    {
      method: "POST",
      headers: await getAuthorizationHeaders(user),
      body: JSON.stringify({ action: "duplicate" }),
    }
  );

  return (await response.json()) as SuperAdminProductMutationResponse;
}

export async function setSuperAdminProductActive(
  user: User,
  tenantId: string,
  productId: string,
  active: boolean
): Promise<SuperAdminProductMutationResponse> {
  const response = await fetch(
    `/api/superadmin/tenants/${tenantId}/products/${productId}`,
    {
      method: "PATCH",
      headers: await getAuthorizationHeaders(user),
      body: JSON.stringify({ action: "set-active", active }),
    }
  );

  return (await response.json()) as SuperAdminProductMutationResponse;
}

export async function deleteSuperAdminProduct(
  user: User,
  tenantId: string,
  productId: string
): Promise<SuperAdminProductMutationResponse> {
  const response = await fetch(
    `/api/superadmin/tenants/${tenantId}/products/${productId}`,
    {
      method: "DELETE",
      headers: await getAuthorizationHeaders(user),
    }
  );

  return (await response.json()) as SuperAdminProductMutationResponse;
}
