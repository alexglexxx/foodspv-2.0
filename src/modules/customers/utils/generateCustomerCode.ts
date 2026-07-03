const CUSTOMER_CODE_PATTERN = /^[A-Z][0-9]{5}$/;
const LEGACY_MAX_PREFIX_LENGTH = 4;
const LEGACY_SUFFIX_LENGTH = 5;

function getRandomUppercaseLetter(): string {
  return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

function getRandomDigits(length: number): string {
  return Math.floor(Math.random() * 10 ** length)
    .toString()
    .padStart(length, "0");
}

export function generateCustomerCode(tenantSlug: string): string {
  void tenantSlug;

  return `${getRandomUppercaseLetter()}${getRandomDigits(5)}`;
}

export function normalizeCustomerCode(customerCode: string): string {
  const cleanCode = customerCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (CUSTOMER_CODE_PATTERN.test(cleanCode)) {
    return cleanCode;
  }

  const suffixMatch = cleanCode.match(/(\d+)$/);

  if (!suffixMatch) {
    return cleanCode;
  }

  const suffix = suffixMatch[1];
  const prefix = cleanCode.slice(0, cleanCode.length - suffix.length);

  if (prefix.length === 0 || suffix.length === 0) {
    return cleanCode;
  }

  return `${prefix.slice(0, LEGACY_MAX_PREFIX_LENGTH)}-${suffix.slice(
    -LEGACY_SUFFIX_LENGTH
  )}`;
}
