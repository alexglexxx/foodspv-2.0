export type UserRole =
  | "superadmin"
  | "tenant_admin"
  | "employee";

export interface UserRoleProfile {
  uid: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  role: UserRole;
  tenantId: string | null;
}

export type AuthorizationFailureStatus = 401 | 403;

export type AuthorizationResult =
  | {
      authorized: true;
      user: AuthenticatedUser;
    }
  | {
      authorized: false;
      status: AuthorizationFailureStatus;
      message: string;
    };
