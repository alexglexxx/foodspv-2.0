import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

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

interface UserRoleRecord {
  role?: unknown;
}

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

async function userDocumentHasSuperAdminRole(uid: string): Promise<boolean> {
  const userSnapshot = await adminDb.collection("users").doc(uid).get();
  const userRecord = (userSnapshot.data() ?? {}) as UserRoleRecord;

  return userRecord.role === "superadmin";
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
    const hasRole =
      tokenHasSuperAdminRole(decodedToken) ||
      (await userDocumentHasSuperAdminRole(decodedToken.uid));

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
