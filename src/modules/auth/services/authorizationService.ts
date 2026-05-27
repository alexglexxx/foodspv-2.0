import "server-only";

import { adminAuth } from "@/lib/firebase-admin";
import type {
  AuthenticatedUser,
  AuthorizationResult,
} from "../types/userRole";
import { getUserRoleProfile } from "./userRoleService";

function getBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  return token.length > 0 ? token : null;
}

function toAuthenticatedUser(profile: {
  uid: string;
  email: string;
  role: AuthenticatedUser["role"];
  tenantId: string | null;
}): AuthenticatedUser {
  return {
    uid: profile.uid,
    email: profile.email.length > 0 ? profile.email : null,
    role: profile.role,
    tenantId: profile.tenantId,
  };
}

function unauthorized(message = "Sesión requerida."): AuthorizationResult {
  return {
    authorized: false,
    status: 401,
    message,
  };
}

function forbidden(message: string): AuthorizationResult {
  return {
    authorized: false,
    status: 403,
    message,
  };
}

function hasTenantMatch(user: AuthenticatedUser, tenantId: string): boolean {
  return user.tenantId === tenantId;
}

export async function requireUserAuth(
  request: Request
): Promise<AuthorizationResult> {
  const token = getBearerToken(request);

  if (!token) {
    return unauthorized();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const profile = await getUserRoleProfile(
      decodedToken.uid,
      decodedToken.email ?? null
    );

    if (!profile) {
      return forbidden("Usuario no autorizado.");
    }

    if (profile.active === false) {
      return forbidden("Usuario inactivo.");
    }

    return {
      authorized: true,
      user: toAuthenticatedUser(profile),
    };
  } catch {
    return unauthorized("Sesión inválida.");
  }
}

export async function requireSuperAdmin(
  request: Request
): Promise<AuthorizationResult> {
  const auth = await requireUserAuth(request);

  if (!auth.authorized) {
    return auth;
  }

  if (auth.user.role !== "superadmin") {
    return forbidden("Permisos de superadmin requeridos.");
  }

  return auth;
}

export async function requireTenantAccess(
  request: Request,
  tenantId: string
): Promise<AuthorizationResult> {
  const auth = await requireUserAuth(request);

  if (!auth.authorized) {
    return auth;
  }

  if (auth.user.role === "superadmin") {
    return auth;
  }

  if (
    (auth.user.role === "tenant_admin" || auth.user.role === "employee") &&
    hasTenantMatch(auth.user, tenantId)
  ) {
    return auth;
  }

  return forbidden("Acceso al tenant requerido.");
}

export async function requireTenantAdmin(
  request: Request,
  tenantId: string
): Promise<AuthorizationResult> {
  const auth = await requireUserAuth(request);

  if (!auth.authorized) {
    return auth;
  }

  if (auth.user.role === "superadmin") {
    return auth;
  }

  if (auth.user.role === "tenant_admin" && hasTenantMatch(auth.user, tenantId)) {
    return auth;
  }

  return forbidden("Permisos de administrador del tenant requeridos.");
}

export async function requireEmployeeOrTenantAdmin(
  request: Request,
  tenantId: string
): Promise<AuthorizationResult> {
  const auth = await requireUserAuth(request);

  if (!auth.authorized) {
    return auth;
  }

  if (auth.user.role === "superadmin") {
    return auth;
  }

  if (
    (auth.user.role === "tenant_admin" || auth.user.role === "employee") &&
    hasTenantMatch(auth.user, tenantId)
  ) {
    return auth;
  }

  return forbidden("Permisos de empleado o administrador requeridos.");
}
