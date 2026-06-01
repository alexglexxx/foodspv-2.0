import "server-only";

import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Transaction,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import type {
  CustomerAddress,
  CustomerProfile,
} from "@/modules/customers/types/customerProfile";
import {
  generateCustomerCode,
  normalizeCustomerCode,
} from "@/modules/customers/utils/generateCustomerCode";

interface CustomerCodeRecord {
  customerId?: unknown;
}

interface CustomerProfileRecord {
  tenantId?: unknown;
  customerCode?: unknown;
  displayName?: unknown;
  phone?: unknown;
  phoneLast4?: unknown;
  totalOrders?: unknown;
  firstOrderAt?: unknown;
  lastOrderAt?: unknown;
  addresses?: unknown;
  notes?: unknown;
  blocked?: unknown;
}

export interface UpsertCustomerAddressInput {
  label?: string;
  street: string;
  neighborhood?: string;
  references?: string;
}

export interface UpsertCustomerProfileInput {
  tenantId: string;
  tenantSlug: string;
  displayName: string;
  phone: string;
  customerCode?: string;
  address?: UpsertCustomerAddressInput;
}

export interface UpsertCustomerProfileResult {
  customerProfile: CustomerProfile;
  matchedExistingCode: boolean;
  warning?: string;
}

const CUSTOMER_CODE_NOT_FOUND_WARNING =
  "Código no encontrado, se generó uno nuevo.";

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return undefined;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function getPhoneLast4(phone: string): string {
  const normalizedPhone = normalizePhone(phone);

  return normalizedPhone.slice(-4);
}

function createAddress(input: UpsertCustomerAddressInput): CustomerAddress {
  const now = new Date();

  return {
    id: adminDb.collection("_ids").doc().id,
    label: toOptionalString(input.label),
    street: input.street.trim(),
    neighborhood: toOptionalString(input.neighborhood),
    references: toOptionalString(input.references),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeAddressKey(address: Pick<CustomerAddress, "street" | "neighborhood">): string {
  return [address.street, address.neighborhood ?? ""]
    .join("|")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function isDuplicateAddress(
  currentAddresses: CustomerAddress[],
  nextAddress: CustomerAddress
): boolean {
  const nextKey = normalizeAddressKey(nextAddress);

  return currentAddresses.some(
    (address) => normalizeAddressKey(address) === nextKey
  );
}

function mapAddress(value: unknown): CustomerAddress | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as {
    id?: unknown;
    label?: unknown;
    street?: unknown;
    neighborhood?: unknown;
    references?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  if (
    typeof record.id !== "string" ||
    record.id.trim().length === 0 ||
    typeof record.street !== "string" ||
    record.street.trim().length === 0
  ) {
    return null;
  }

  return {
    id: record.id.trim(),
    label: toOptionalString(record.label),
    street: record.street.trim(),
    neighborhood: toOptionalString(record.neighborhood),
    references: toOptionalString(record.references),
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt),
  };
}

function mapAddresses(value: unknown): CustomerAddress[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((address) => mapAddress(address))
    .filter((address): address is CustomerAddress => address !== null);
}

function mapCustomerProfile(
  id: string,
  tenantId: string,
  record: CustomerProfileRecord
): CustomerProfile {
  const phone = typeof record.phone === "string" ? record.phone : "";

  return {
    id,
    tenantId:
      typeof record.tenantId === "string" && record.tenantId.length > 0
        ? record.tenantId
        : tenantId,
    customerCode:
      typeof record.customerCode === "string" ? record.customerCode : "",
    displayName:
      typeof record.displayName === "string" ? record.displayName : "",
    phone,
    phoneLast4:
      typeof record.phoneLast4 === "string"
        ? record.phoneLast4
        : getPhoneLast4(phone),
    totalOrders:
      typeof record.totalOrders === "number" &&
      Number.isFinite(record.totalOrders)
        ? record.totalOrders
        : 0,
    firstOrderAt: toDate(record.firstOrderAt),
    lastOrderAt: toDate(record.lastOrderAt),
    addresses: mapAddresses(record.addresses),
    notes: toOptionalString(record.notes),
    blocked: record.blocked === true,
  };
}

function buildUpdatedProfile(
  currentProfile: CustomerProfile,
  input: UpsertCustomerProfileInput
): CustomerProfile {
  const now = new Date();
  const normalizedPhone = normalizePhone(input.phone);
  const nextAddress = input.address ? createAddress(input.address) : null;
  const addresses =
    nextAddress && !isDuplicateAddress(currentProfile.addresses, nextAddress)
      ? [...currentProfile.addresses, nextAddress]
      : currentProfile.addresses;

  return {
    ...currentProfile,
    displayName: input.displayName.trim(),
    phone: normalizedPhone,
    phoneLast4: getPhoneLast4(normalizedPhone),
    totalOrders: currentProfile.totalOrders + 1,
    firstOrderAt: currentProfile.firstOrderAt ?? now,
    lastOrderAt: now,
    addresses,
  };
}

function getTenantCollections(tenantId: string) {
  const tenantRef = adminDb.collection("tenants").doc(tenantId);

  return {
    customerProfilesRef: tenantRef.collection("customerProfiles"),
    customerCodesRef: tenantRef.collection("customerCodes"),
  };
}

async function upsertExistingCustomerProfile(
  transaction: Transaction,
  input: UpsertCustomerProfileInput,
  normalizedCustomerCode: string
): Promise<UpsertCustomerProfileResult | null> {
  const { customerProfilesRef, customerCodesRef } = getTenantCollections(
    input.tenantId
  );
  const codeRef = customerCodesRef.doc(normalizedCustomerCode);
  const codeSnapshot = await transaction.get(codeRef);

  if (!codeSnapshot.exists) {
    return null;
  }

  const codeRecord = (codeSnapshot.data() ?? {}) as CustomerCodeRecord;

  if (
    typeof codeRecord.customerId !== "string" ||
    codeRecord.customerId.trim().length === 0
  ) {
    return null;
  }

  const customerRef = customerProfilesRef.doc(codeRecord.customerId.trim());
  const customerSnapshot = await transaction.get(customerRef);

  if (!customerSnapshot.exists) {
    return null;
  }

  const currentProfile = mapCustomerProfile(
    customerSnapshot.id,
    input.tenantId,
    (customerSnapshot.data() ?? {}) as CustomerProfileRecord
  );
  const updatedProfile = buildUpdatedProfile(currentProfile, input);

  transaction.update(customerRef, {
    displayName: updatedProfile.displayName,
    phone: updatedProfile.phone,
    phoneLast4: updatedProfile.phoneLast4,
    totalOrders: updatedProfile.totalOrders,
    firstOrderAt: updatedProfile.firstOrderAt,
    lastOrderAt: updatedProfile.lastOrderAt,
    addresses: updatedProfile.addresses,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    customerProfile: updatedProfile,
    matchedExistingCode: true,
  };
}

async function createCustomerProfile(
  input: UpsertCustomerProfileInput,
  warning?: string
): Promise<UpsertCustomerProfileResult> {
  const { customerProfilesRef, customerCodesRef } = getTenantCollections(
    input.tenantId
  );

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const customerCode = generateCustomerCode(input.tenantSlug);
    const customerRef = customerProfilesRef.doc();
    const codeRef = customerCodesRef.doc(customerCode);
    const now = new Date();
    const normalizedPhone = normalizePhone(input.phone);
    const addresses = input.address ? [createAddress(input.address)] : [];
    const customerProfile: CustomerProfile = {
      id: customerRef.id,
      tenantId: input.tenantId,
      customerCode,
      displayName: input.displayName.trim(),
      phone: normalizedPhone,
      phoneLast4: getPhoneLast4(normalizedPhone),
      totalOrders: 1,
      firstOrderAt: now,
      lastOrderAt: now,
      addresses,
      blocked: false,
    };

    const createdProfile = await adminDb.runTransaction(
      async (transaction): Promise<CustomerProfile | null> => {
        const codeSnapshot = await transaction.get(codeRef);

        if (codeSnapshot.exists) {
          return null;
        }

        const profileData: DocumentData = {
          ...customerProfile,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        transaction.set(customerRef, profileData);
        transaction.set(codeRef, {
          customerId: customerRef.id,
          customerCode,
          tenantId: input.tenantId,
          createdAt: FieldValue.serverTimestamp(),
        });

        return customerProfile;
      }
    );

    if (createdProfile) {
      return {
        customerProfile: createdProfile,
        matchedExistingCode: false,
        warning,
      };
    }
  }

  throw new Error("No se pudo generar un código de cliente único.");
}

export async function upsertCustomerProfile(
  input: UpsertCustomerProfileInput
): Promise<UpsertCustomerProfileResult> {
  const normalizedCustomerCode = input.customerCode
    ? normalizeCustomerCode(input.customerCode)
    : undefined;

  if (normalizedCustomerCode) {
    const existingResult = await adminDb.runTransaction((transaction) =>
      upsertExistingCustomerProfile(transaction, input, normalizedCustomerCode)
    );

    if (existingResult) {
      return existingResult;
    }

    return createCustomerProfile(input, CUSTOMER_CODE_NOT_FOUND_WARNING);
  }

  return createCustomerProfile(input);
}
