import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { FirebaseAuthError } from "firebase-admin/auth";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type { UserRole } from "@/modules/auth/types/userRole";

import type {
  SuperAdminUserInput,
  SuperAdminUserSummary,
} from "../types/superAdmin";

interface FirestoreUserRecord {
  email?: unknown;
  displayName?: unknown;
  role?: unknown;
  tenantId?: unknown;
  active?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

type UserInputValidationResult =
  | {
      valid: true;
      data: SuperAdminUserInput;
    }
  | {
      valid: false;
      message: string;
    };

const USER_ROLES = new Set<UserRole>([
  "superadmin",
  "tenant_admin",
  "employee",
]);

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.has(value as UserRole);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeDisplayName(value: string): string {
  return value.trim();
}

function normalizeTenantId(value: unknown): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const tenantId = value.trim().toLowerCase();

  return /^[a-z0-9][a-z0-9-]{2,60}$/.test(tenantId) ? tenantId : null;
}

function toStringValue(value: unknown): string {
  return isNonEmptyString(value) ? value.trim() : "";
}

function toTimestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return ((value as { toMillis: () => number }).toMillis());
  }

  return null;
}

async function ensureTenantExists(tenantId: string | null): Promise<void> {
  if (!tenantId) {
    return;
  }

  const tenantSnapshot = await adminDb.collection("tenants").doc(tenantId).get();

  if (!tenantSnapshot.exists) {
    throw new Error("TENANT_NOT_FOUND");
  }
}

function toUserSummary(
  uid: string,
  record: FirestoreUserRecord
): SuperAdminUserSummary | null {
  if (!isUserRole(record.role) || !isNonEmptyString(record.email)) {
    return null;
  }

  return {
    uid,
    email: normalizeEmail(record.email),
    displayName: toStringValue(record.displayName),
    role: record.role,
    tenantId: normalizeTenantId(record.tenantId),
    active: record.active !== false,
    createdAt: toTimestampMillis(record.createdAt),
    updatedAt: toTimestampMillis(record.updatedAt),
  };
}

export function validateSuperAdminUserInput(
  value: unknown,
  options: {
    isUpdate?: boolean;
  } = {}
): UserInputValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      valid: false,
      message: "Payload de usuario inválido.",
    };
  }

  const record = value as {
    email?: unknown;
    displayName?: unknown;
    password?: unknown;
    role?: unknown;
    tenantId?: unknown;
    active?: unknown;
  };

  if (!isNonEmptyString(record.email)) {
    return {
      valid: false,
      message: "Email obligatorio.",
    };
  }

  const email = normalizeEmail(record.email);

  if (!isValidEmail(email)) {
    return {
      valid: false,
      message: "Email inválido.",
    };
  }

  if (!isUserRole(record.role)) {
    return {
      valid: false,
      message: "Rol inválido.",
    };
  }

  const displayName = isNonEmptyString(record.displayName)
    ? normalizeDisplayName(record.displayName)
    : "";
  const password =
    typeof record.password === "string" ? record.password.trim() : "";
  const tenantId = record.role === "superadmin" ? null : normalizeTenantId(record.tenantId);
  const active = record.active !== false;

  if (!options.isUpdate && password.length < 6) {
    return {
      valid: false,
      message: "La contraseña debe tener al menos 6 caracteres.",
    };
  }

  if (options.isUpdate && password.length > 0 && password.length < 6) {
    return {
      valid: false,
      message: "La nueva contraseña debe tener al menos 6 caracteres.",
    };
  }

  if (record.role !== "superadmin" && !tenantId) {
    return {
      valid: false,
      message: "tenantId válido obligatorio para tenant_admin o employee.",
    };
  }

  return {
    valid: true,
    data: {
      email,
      displayName,
      password,
      role: record.role,
      tenantId,
      active,
    },
  };
}

export async function listSuperAdminUsers(): Promise<SuperAdminUserSummary[]> {
  const snapshot = await adminDb.collection("users").get();

  return snapshot.docs
    .map((document) =>
      toUserSummary(document.id, document.data() as FirestoreUserRecord)
    )
    .filter((user): user is SuperAdminUserSummary => user !== null)
    .sort((left, right) => left.email.localeCompare(right.email, "es-MX"));
}

export async function createSuperAdminUser(
  input: SuperAdminUserInput
): Promise<SuperAdminUserSummary> {
  await ensureTenantExists(input.tenantId);

  try {
    const createdUser = await adminAuth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName || undefined,
    });

    await adminDb.collection("users").doc(createdUser.uid).set({
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      tenantId: input.tenantId,
      active: input.active,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const userRecord = await adminDb.collection("users").doc(createdUser.uid).get();
    const user = toUserSummary(
      createdUser.uid,
      (userRecord.data() ?? {}) as FirestoreUserRecord
    );

    if (!user) {
      throw new Error("USER_CREATE_FAILED");
    }

    return user;
  } catch (error) {
    if (
      error instanceof FirebaseAuthError &&
      error.code === "auth/email-already-exists"
    ) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function updateSuperAdminUser(
  uid: string,
  input: SuperAdminUserInput,
  actorUid: string
): Promise<SuperAdminUserSummary> {
  await ensureTenantExists(input.tenantId);

  const userRef = adminDb.collection("users").doc(uid);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    throw new Error("USER_NOT_FOUND");
  }

  let authUser;

  try {
    authUser = await adminAuth.getUser(uid);
  } catch (error) {
    if (
      error instanceof FirebaseAuthError &&
      error.code === "auth/user-not-found"
    ) {
      throw new Error("USER_AUTH_NOT_FOUND");
    }

    throw error;
  }

  const currentRecord = (userSnapshot.data() ?? {}) as FirestoreUserRecord;
  const currentEmail = normalizeEmail(toStringValue(currentRecord.email));

  if (currentEmail.length > 0 && input.email !== currentEmail) {
    throw new Error("EMAIL_IMMUTABLE");
  }

  if (uid === actorUid && (!input.active || input.role !== "superadmin")) {
    throw new Error("SELF_LOCKOUT_FORBIDDEN");
  }

  await adminAuth.updateUser(uid, {
    displayName: input.displayName || undefined,
    ...(input.password.length > 0 ? { password: input.password } : {}),
  });

  await userRef.set(
    {
      email: authUser.email ?? input.email,
      displayName: input.displayName,
      role: input.role,
      tenantId: input.tenantId,
      active: input.active,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const updatedSnapshot = await userRef.get();
  const user = toUserSummary(
    uid,
    (updatedSnapshot.data() ?? {}) as FirestoreUserRecord
  );

  if (!user) {
    throw new Error("USER_UPDATE_FAILED");
  }

  return user;
}
