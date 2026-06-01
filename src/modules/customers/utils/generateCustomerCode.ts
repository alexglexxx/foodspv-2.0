const FALLBACK_PREFIX = "FOOD";
const MAX_PREFIX_LENGTH = 4;

function getCleanTenantPrefix(tenantSlug: string): string {
  const cleanPrefix = tenantSlug
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, MAX_PREFIX_LENGTH);

  return cleanPrefix.length > 0 ? cleanPrefix : FALLBACK_PREFIX;
}

export function generateCustomerCode(tenantSlug: string): string {
  const prefix = getCleanTenantPrefix(tenantSlug);
  const randomNumber = Math.floor(10000 + Math.random() * 90000);

  return `${prefix}-${randomNumber}`;
}

export function normalizeCustomerCode(customerCode: string): string {
  const [rawPrefix, rawSuffix] = customerCode.includes("-")
    ? customerCode.split("-", 2)
    : ["", ""];
  const cleanPrefix = rawPrefix.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const cleanSuffix = rawSuffix.replace(/\D/g, "");

  if (cleanPrefix.length > 0 && cleanSuffix.length > 0) {
    return `${cleanPrefix.slice(0, MAX_PREFIX_LENGTH)}-${cleanSuffix}`;
  }

  const cleanCode = customerCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = cleanCode.slice(-5);
  const prefix = cleanCode.slice(0, -5).slice(0, MAX_PREFIX_LENGTH);

  if (prefix.length === 0 || suffix.length === 0) {
    return cleanCode;
  }

  return `${prefix}-${suffix}`;
}
