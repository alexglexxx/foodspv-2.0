import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const jsonPath = "data/tenant-seeds/tommys-place.json";
const scriptPath = "scripts/seed-tenant-from-file.mjs";
const packageJson = readFileSync("package.json", "utf8");
const seedScript = readFileSync(scriptPath, "utf8");
const tenantSeedJson = readFileSync(jsonPath, "utf8");
const auditDoc = readFileSync(
  "docs/audits/foodspv-generic-tenant-seed.md",
  "utf8"
);

test("tenant seed example json exists", () => {
  assert.equal(existsSync(jsonPath), true);
});

test("generic tenant seed script exists", () => {
  assert.equal(existsSync(scriptPath), true);
});

test("package.json exposes seed:tenant command", () => {
  assert.match(packageJson, /"seed:tenant": "node scripts\/seed-tenant-from-file\.mjs"/);
});

test("example tenant json includes products array", () => {
  const parsed = JSON.parse(tenantSeedJson);

  assert.equal(Array.isArray(parsed.products), true);
  assert.ok(parsed.products.length > 0);
});

test("example tenant json contains quote products with pricingMode quote", () => {
  assert.match(tenantSeedJson, /"pricingMode": "quote"/);
});

test("generic script persists tenant and products with merge true", () => {
  assert.match(seedScript, /\.set\(tenantRecord, \{ merge: true \}\)/);
  assert.match(seedScript, /\.set\(product\.record, \{ merge: true \}\)/);
});

test("generic script explicitly avoids deleting products not present in json", () => {
  assert.match(seedScript, /no borra productos ausentes del JSON/);
  assert.doesNotMatch(seedScript, /\.delete\(/);
});

test("generic script includes meta and webhook fields in tenant record", () => {
  assert.match(seedScript, /metaPhoneNumberId/);
  assert.match(seedScript, /metaAccessToken/);
  assert.match(seedScript, /webhookVerifyToken/);
});

test("audit documents how to use the generic seed", () => {
  assert.match(auditDoc, /npm run seed:tenant -- data\/tenant-seeds\/tommys-place\.json/);
  assert.match(auditDoc, /Campos mínimos/);
  assert.match(auditDoc, /Fixed vs quote/);
  assert.match(auditDoc, /No hardcodear tokens reales/);
  assert.match(auditDoc, /\/superadmin/);
});
