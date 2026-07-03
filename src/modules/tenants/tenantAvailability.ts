import "server-only";

export interface TenantAvailabilityRecord {
  active?: unknown;
  status?: unknown;
  deletedAt?: unknown;
}

export type TenantAvailabilityState =
  | "available"
  | "inactive"
  | "deleted";

export function hasDeletedAt(value: unknown): boolean {
  return value !== null && value !== undefined;
}

export function getTenantAvailabilityState(
  record: TenantAvailabilityRecord | null | undefined
): TenantAvailabilityState {
  if (!record) {
    return "inactive";
  }

  if (hasDeletedAt(record.deletedAt)) {
    return "deleted";
  }

  if (record.active === false || record.status === "inactive") {
    return "inactive";
  }

  return "available";
}

export function isTenantAvailable(
  record: TenantAvailabilityRecord | null | undefined
): boolean {
  return getTenantAvailabilityState(record) === "available";
}
