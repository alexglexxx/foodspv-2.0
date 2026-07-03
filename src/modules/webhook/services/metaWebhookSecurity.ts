import { createHmac, timingSafeEqual } from "node:crypto";

const META_SIGNATURE_PREFIX = "sha256=";
const META_SIGNATURE_PATTERN = /^sha256=[a-f0-9]{64}$/i;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function getMetaWebhookSignatureHeader(request: Request): string | null {
  const signatureHeader = request.headers.get("x-hub-signature-256");

  if (!isNonEmptyString(signatureHeader)) {
    return null;
  }

  const normalizedSignature = signatureHeader.trim().toLowerCase();

  return META_SIGNATURE_PATTERN.test(normalizedSignature)
    ? normalizedSignature
    : null;
}

export function buildMetaWebhookSignature(
  rawBody: string,
  appSecret: string
): string {
  const digest = createHmac("sha256", appSecret).update(rawBody).digest("hex");

  return `${META_SIGNATURE_PREFIX}${digest}`;
}

export function verifyMetaWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  appSecret: string | null | undefined;
}): boolean {
  if (!isNonEmptyString(input.appSecret) || !isNonEmptyString(input.signatureHeader)) {
    return false;
  }

  const normalizedSignature = input.signatureHeader.trim().toLowerCase();

  if (!META_SIGNATURE_PATTERN.test(normalizedSignature)) {
    return false;
  }

  const expectedSignature = buildMetaWebhookSignature(
    input.rawBody,
    input.appSecret
  );
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(normalizedSignature, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
