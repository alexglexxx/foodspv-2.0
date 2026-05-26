export function getSearchParamValue(
  value: string | string[] | undefined
): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const firstValue = value.find(
      (item) => typeof item === "string" && item.trim().length > 0
    );

    return firstValue?.trim() ?? null;
  }

  return null;
}
