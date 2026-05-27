import type { User } from "firebase/auth";

import type {
  SuperAdminTenantInput,
  SuperAdminTenantMutationResponse,
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

export async function updateSuperAdminTenant(
  user: User,
  tenantId: string,
  input: SuperAdminTenantInput
): Promise<SuperAdminTenantMutationResponse> {
  const response = await fetch(`/api/superadmin/tenants/${tenantId}`, {
    method: "PATCH",
    headers: await getAuthorizationHeaders(user),
    body: JSON.stringify(input),
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
