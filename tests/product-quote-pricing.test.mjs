import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productTypes = readFileSync("src/types/product.types.ts", "utf8");
const productService = readFileSync(
  "src/modules/superadmin/services/productService.ts",
  "utf8"
);
const orderMenuClient = readFileSync(
  "src/modules/orders/components/OrderMenuClient.tsx",
  "utf8"
);
const cartSummary = readFileSync(
  "src/modules/orders/components/CartSummary.tsx",
  "utf8"
);
const cartDrawer = readFileSync(
  "src/modules/orders/components/CartDrawer.tsx",
  "utf8"
);
const customerInfoModal = readFileSync(
  "src/modules/orders/components/CustomerInfoModal.tsx",
  "utf8"
);
const orderValidator = readFileSync(
  "src/modules/orders/agents/orderValidatorAgent.ts",
  "utf8"
);
const ordersRoute = readFileSync("src/app/api/orders/route.ts", "utf8");
const whatsappComanda = readFileSync(
  "src/modules/orders/agents/whatsappComandaAgent.ts",
  "utf8"
);
const dashboardClient = readFileSync(
  "src/modules/orders/components/OrdersDashboardClient.tsx",
  "utf8"
);
const seedGoldenTenant = readFileSync("scripts/seed-golden-tenant.mjs", "utf8");
const auditDoc = readFileSync(
  "docs/audits/foodspv-product-quote-pricing.md",
  "utf8"
);

test("legacy products without pricingMode are treated as fixed", () => {
  assert.match(productTypes, /return "fixed";/);
  assert.match(productTypes, /if \(typeof input\.price === "number"/);
});

test("fixed products still require a valid price in superadmin validation", () => {
  assert.match(productService, /pricingMode === "fixed" && \(price === null \|\| price < 0\)/);
  assert.match(productService, /"El precio debe ser un número mayor o igual a 0\."/);
});

test("quote products do not require price and are persisted without forcing price 0", () => {
  assert.match(productService, /price: pricingMode === "fixed" \? price : null/);
  assert.match(productService, /price: input\.pricingMode === "quote" \? null : input\.price \?\? null/);
});

test("quote products can be added to cart and keep quote metadata", () => {
  assert.match(orderMenuClient, /quoteRequired: getPricingMode\(product\) === "quote"/);
  assert.match(orderMenuClient, /pricingMode: product\.pricingMode/);
});

test("mixed carts compute partial totals and expose quote state", () => {
  assert.match(orderMenuClient, /const pricingSummary = buildCartPricingSummary\(cartItems, deliveryFeeApplied\);/);
  assert.match(cartSummary, /Parcial/);
  assert.match(cartDrawer, /Total parcial/);
});

test("quote only carts avoid presenting final total as zero", () => {
  assert.match(cartSummary, /Por cotizar/);
  assert.match(cartDrawer, /totalMode === "quote_only" \? "Por cotizar"/);
  assert.match(customerInfoModal, /totalMode === "quote_only" \? "Por cotizar"/);
});

test("order validator allows quote items without price", () => {
  assert.match(orderValidator, /pricingMode === "fixed"/);
  assert.match(orderValidator, /pricingMode === "quote"/);
  assert.match(orderValidator, /quoteRequired inválido/);
});

test("orders route uses catalog pricingMode instead of trusting client payload", () => {
  assert.match(ordersRoute, /const pricingMode = normalizeProductPricingMode/);
  assert.match(ordersRoute, /pricingMode: product\.pricingMode/);
  assert.match(ordersRoute, /quoteRequired: product\.pricingMode === "quote"/);
});

test("whatsapp summary marks quote items and partial totals", () => {
  assert.match(whatsappComanda, /POR COTIZAR/);
  assert.match(whatsappComanda, /Por cotizar/);
  assert.match(whatsappComanda, /Total parcial/);
});

test("dashboard shows quote-aware total labels and badge", () => {
  assert.match(dashboardClient, /Cotización pendiente/);
  assert.match(dashboardClient, /Por cotizar/);
  assert.match(dashboardClient, /Total parcial/);
});

test("golden tenant includes a quote product and explicit fixed pricing on existing products", () => {
  assert.match(seedGoldenTenant, /id: "taquiza-evento"/);
  assert.match(seedGoldenTenant, /pricingMode: "quote"/);
  assert.match(seedGoldenTenant, /pricingMode: "fixed"/);
});

test("audit documents pricingMode architecture and quote flow", () => {
  assert.match(auditDoc, /`pricingMode: "fixed"`/);
  assert.match(auditDoc, /`pricingMode: "quote"`/);
  assert.match(auditDoc, /Por qué no se usa `price: 0`/);
  assert.match(auditDoc, /`totalMode: "fixed" \| "partial_quote" \| "quote_only"`/);
});
