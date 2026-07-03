import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { adminAuth } from "@/lib/firebase-admin";
import { getUserRoleProfile } from "@/modules/auth/services/userRoleService";

type SuperAdminAuthResult =
  | {
      authorized: true;
      uid: string;
      email: string | null;
    }
  | {
      authorized: false;
      status: 401 | 403;
      message: string;
    };

function getBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  return token.length > 0 ? token : null;
}

function tokenHasSuperAdminRole(decodedToken: DecodedIdToken): boolean {
  return (
    decodedToken.role === "superadmin" ||
    decodedToken.superadmin === true ||
    decodedToken.admin === true
  );
}

export async function requireSuperAdminAuth(
  request: Request
): Promise<SuperAdminAuthResult> {
  const token = getBearerToken(request);

  if (!token) {
    return {
      authorized: false,
      status: 401,
      message: "Sesión requerida.",
    };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const profile = await getUserRoleProfile(
      decodedToken.uid,
      decodedToken.email ?? null
    );
    const tokenHasRole = tokenHasSuperAdminRole(decodedToken);
    const profileHasRole = profile?.role === "superadmin";
    const profileInactive = profile?.active === false;

    if (profileInactive) {
      return {
        authorized: false,
        status: 403,
        message: "Usuario inactivo.",
      };
    }

    const hasRole = tokenHasRole || profileHasRole;

    if (!hasRole) {
      return {
        authorized: false,
        status: 403,
        message: "Permisos de superadmin requeridos.",
      };
    }

    return {
      authorized: true,
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
    };
  } catch {
    return {
      authorized: false,
      status: 401,
      message: "Sesión inválida.",
    };
  }
}
