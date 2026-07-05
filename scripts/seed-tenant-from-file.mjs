import admin from "firebase-admin";
import QRCode from "qrcode";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "foodspv-14829";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId,
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(
      error instanceof Error
        ? `No se pudo leer el JSON: ${error.message}`
        : "No se pudo leer el JSON."
    );
  }
}

function toNonEmptyString(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function toDigits(value) {
  return toNonEmptyString(value).replace(/\D/g, "");
}

function toBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function toNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toCurrencyAmount(value, fallback) {
  return Math.round(toNumber(value, fallback) * 100) / 100;
}

function getTenantUrl(slugOrTenantId) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (typeof baseUrl === "string" && baseUrl.trim().length > 0) {
    return `${baseUrl.replace(/\/$/, "")}/${slugOrTenantId}`;
  }

  return `/${slugOrTenantId}`;
}

function validateSeedInput(seedInput) {
  if (!seedInput || typeof seedInput !== "object" || Array.isArray(seedInput)) {
    fail("El JSON del tenant no tiene formato válido.");
  }

  const tenantId = toNonEmptyString(seedInput.tenantId).toLowerCase();

  if (!tenantId) {
    fail("Falta tenantId.");
  }

  if (!toNonEmptyString(seedInput.name)) {
    fail("Falta name.");
  }

  if (!toNonEmptyString(seedInput.category)) {
    fail("Falta category.");
  }

  if (!Array.isArray(seedInput.products)) {
    fail("products debe ser un arreglo.");
  }

  return tenantId;
}

function normalizeBusinessHours(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      {
        day: "monday",
        open: "09:00",
        close: "18:00",
        active: true,
      },
      {
        day: "tuesday",
        open: "09:00",
        close: "18:00",
        active: true,
      },
      {
        day: "wednesday",
        open: "09:00",
        close: "18:00",
        active: true,
      },
      {
        day: "thursday",
        open: "09:00",
        close: "18:00",
        active: true,
      },
      {
        day: "friday",
        open: "09:00",
        close: "18:00",
        active: true,
      },
      {
        day: "saturday",
        open: "10:00",
        close: "16:00",
        active: true,
      },
      {
        day: "sunday",
        open: "10:00",
        close: "14:00",
        active: false,
      },
    ];
  }

  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      day: toNonEmptyString(entry.day, "monday"),
      open: toNonEmptyString(entry.open, "09:00"),
      close: toNonEmptyString(entry.close, "18:00"),
      active: toBoolean(entry.active, true),
    }));
}

function normalizeDeliveryConfig(value) {
  return {
    enabled: toBoolean(value?.enabled, false),
    fee: toCurrencyAmount(value?.fee, 0),
    minimumOrder: toCurrencyAmount(value?.minimumOrder, 0),
    notes: toNonEmptyString(value?.notes, ""),
  };
}

function normalizeOrderConfirmationPolicy(value) {
  const enabled = toBoolean(value?.enabled, false);

  return {
    enabled,
    amountThreshold: Math.max(1, toCurrencyAmount(value?.amountThreshold, 1)),
    action: enabled ? "require_manual_confirmation" : "allow",
  };
}

function normalizeProduct(product, tenantId) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    fail("Cada producto debe ser un objeto válido.");
  }

  const id = toNonEmptyString(product.id);
  const name = toNonEmptyString(product.name);
  const category = toNonEmptyString(product.category);

  if (!id) {
    fail("Cada producto requiere id.");
  }

  if (!name) {
    fail(`Producto ${id}: falta name.`);
  }

  if (!category) {
    fail(`Producto ${id}: falta category.`);
  }

  const pricingMode = product.pricingMode === "quote" ? "quote" : "fixed";
  const price =
    pricingMode === "quote"
      ? product.price === null || product.price === undefined
        ? null
        : toCurrencyAmount(product.price, 0)
      : toCurrencyAmount(product.price, 0);

  return {
    id,
    record: {
      tenantId,
      name,
      description: toNonEmptyString(product.description, ""),
      pricingMode,
      price,
      category,
      imageUrl: toNonEmptyString(product.imageUrl, ""),
      images: Array.isArray(product.images) ? product.images : [],
      active: toBoolean(product.active, true),
      available: toBoolean(product.available, true),
      options: Array.isArray(product.options) ? product.options : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  };
}

function buildTenantRecord(seedInput, tenantId, slug, publicUrl, qrCode) {
  const deliveryConfig = normalizeDeliveryConfig(seedInput.deliveryConfig);
  const orderConfirmationPolicy = normalizeOrderConfirmationPolicy(
    seedInput.orderConfirmationPolicy
  );

  return {
    tenantId,
    slug,
    name: toNonEmptyString(seedInput.name),
    category: toNonEmptyString(seedInput.category),
    featuredCategory: toNonEmptyString(
      seedInput.featuredCategory,
      toNonEmptyString(seedInput.category)
    ),
    description: toNonEmptyString(seedInput.description, ""),
    greeting: toNonEmptyString(seedInput.greeting, ""),
    location: toNonEmptyString(seedInput.location, ""),
    designPresetId: toNonEmptyString(seedInput.designPresetId, ""),
    visualPresetId: toNonEmptyString(seedInput.visualPresetId, "fresh"),
    orderFlowMode: toNonEmptyString(
      seedInput.orderFlowMode,
      "simple_whatsapp"
    ),
    currency: toNonEmptyString(seedInput.currency, "MXN"),
    locale: toNonEmptyString(seedInput.locale, "es-MX"),
    timezone: toNonEmptyString(seedInput.timezone, "America/Mexico_City"),
    status: toNonEmptyString(seedInput.status, "active"),
    active: toBoolean(seedInput.active, true),
    estimatedTime: toNonEmptyString(seedInput.estimatedTime, "15–20 min"),
    estimatedPreparationMinutes: Math.max(
      1,
      Math.round(toNumber(seedInput.estimatedPreparationMinutes, 20))
    ),
    rating: toNonEmptyString(seedInput.rating, "4.8"),
    reviews: toNonEmptyString(seedInput.reviews, "0"),
    phone: toDigits(seedInput.phone),
    whatsappPhone: toDigits(seedInput.whatsappPhone),
    logoUrl: toNonEmptyString(seedInput.logoUrl, ""),
    heroImageUrl: toNonEmptyString(seedInput.heroImageUrl, ""),
    publicUrl,
    qrCode,
    deliveryConfig,
    deliveryEnabled: deliveryConfig.enabled,
    deliveryFee: deliveryConfig.enabled ? deliveryConfig.fee ?? 0 : 0,
    orderConfirmationPolicy,
    businessHours: normalizeBusinessHours(seedInput.businessHours),
    metaPhoneNumberId: toNonEmptyString(seedInput.metaPhoneNumberId, ""),
    metaAccessToken: toNonEmptyString(seedInput.metaAccessToken, ""),
    metaBusinessAccountId: toNonEmptyString(
      seedInput.metaBusinessAccountId,
      ""
    ),
    metaWabaId: toNonEmptyString(seedInput.metaWabaId, ""),
    metaAppId: toNonEmptyString(seedInput.metaAppId, ""),
    metaAppSecret: toNonEmptyString(seedInput.metaAppSecret, ""),
    webhookVerifyToken: toNonEmptyString(seedInput.webhookVerifyToken, ""),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    fail(
      "Uso: node scripts/seed-tenant-from-file.mjs data/tenant-seeds/mi-tenant.json"
    );
  }

  const resolvedPath = resolve(process.cwd(), inputPath);

  if (!existsSync(resolvedPath)) {
    fail(`No existe el archivo JSON: ${resolvedPath}`);
  }

  const seedInput = readJsonFile(resolvedPath);
  const tenantId = validateSeedInput(seedInput);
  const slug = toNonEmptyString(seedInput.slug, tenantId);
  const publicUrl = getTenantUrl(slug);
  const qrCode = await QRCode.toDataURL(publicUrl);
  const tenantRecord = buildTenantRecord(
    seedInput,
    tenantId,
    slug,
    publicUrl,
    qrCode
  );
  const normalizedProducts = seedInput.products.map((product) =>
    normalizeProduct(product, tenantId)
  );
  const fixedProducts = normalizedProducts.filter(
    (product) => product.record.pricingMode === "fixed"
  );
  const quoteProducts = normalizedProducts.filter(
    (product) => product.record.pricingMode === "quote"
  );
  const fixedProductsWithZeroPrice = fixedProducts.filter(
    (product) => product.record.price === 0
  );

  await db.collection("tenants").doc(tenantId).set(tenantRecord, { merge: true });

  for (const product of normalizedProducts) {
    await db
      .collection("tenants")
      .doc(tenantId)
      .collection("products")
      .doc(product.id)
      .set(product.record, { merge: true });
  }

  console.log("✅ Tenant sembrado correctamente");
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`Nombre: ${tenantRecord.name}`);
  console.log(`Public URL: ${publicUrl}`);
  console.log(`Productos sembrados: ${normalizedProducts.length}`);
  console.log(`Productos fixed: ${fixedProducts.length}`);
  console.log(`Productos quote: ${quoteProducts.length}`);

  if (fixedProductsWithZeroPrice.length > 0) {
    console.log(
      `⚠ Productos fixed con price 0: ${fixedProductsWithZeroPrice.length}`
    );
  }

  console.log("Nota: el seed usa set(..., { merge: true }) y no borra productos ausentes del JSON.");
}

await main();
