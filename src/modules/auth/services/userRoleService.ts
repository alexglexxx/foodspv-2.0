import "server-only";

import { adminDb } from "@/lib/firebase-admin";
import type { UserRole, UserRoleProfile } from "../types/userRole";

interface FirestoreUserRoleRecord {
  email?: unknown;
  role?: unknown;
  tenantId?: unknown;
  active?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const USER_ROLES = new Set<UserRole>([
  "superadmin",
  "tenant_admin",
  "employee",
]);

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.has(value as UserRole);
}

function toEmail(value: unknown, fallback: string | null): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback ?? "";
}

function toTenantId(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

export async function getUserRoleProfile(
  uid: string,
  fallbackEmail: string | null = null
): Promise<UserRoleProfile | null> {
  const userSnapshot = await adminDb.collection("users").doc(uid).get();

  if (!userSnapshot.exists) {
    return null;
  }

  const record = userSnapshot.data() as FirestoreUserRoleRecord | undefined;

  if (!isUserRole(record?.role)) {
    return null;
  }

  return {
    uid: userSnapshot.id,
    email: toEmail(record?.email, fallbackEmail),
    role: record.role,
    tenantId: toTenantId(record.tenantId),
    active: record.active !== false,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
