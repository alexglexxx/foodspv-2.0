import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadCustomerCodeUtils() {
  const source = readFileSync(
    "src/modules/customers/utils/generateCustomerCode.ts",
    "utf8"
  );
  const executableSource = `${source
    .replace(/export function /g, "function ")
    .replace(/: string/g, "")
    .replace(/: number/g, "")}
module.exports = { generateCustomerCode, normalizeCustomerCode };`;
  const context = {
    Math,
    String,
    module: { exports: {} },
    exports: {},
  };

  vm.runInNewContext(executableSource, context);

  return context.module.exports;
}

const customerCodeUtils = loadCustomerCodeUtils();
const upsertCustomerProfile = readFileSync(
  "src/modules/customers/server/upsertCustomerProfile.ts",
  "utf8"
);
const orderMenuClient = readFileSync(
  "src/modules/orders/components/OrderMenuClient.tsx",
  "utf8"
);
const whatsappComandaAgent = readFileSync(
  "src/modules/orders/agents/whatsappComandaAgent.ts",
  "utf8"
);

test("generateCustomerCode returns one uppercase letter followed by five digits", () => {
  for (let index = 0; index < 100; index += 1) {
    const code = customerCodeUtils.generateCustomerCode("taco-demo");
    assert.match(code, /^[A-Z][0-9]{5}$/);
  }
});

test("normalizeCustomerCode accepts new-format inputs with lowercase, spaces, and dashes", () => {
  assert.equal(customerCodeUtils.normalizeCustomerCode("a62738"), "A62738");
  assert.equal(customerCodeUtils.normalizeCustomerCode("A-62738"), "A62738");
  assert.equal(customerCodeUtils.normalizeCustomerCode("a 62738"), "A62738");
});

test("normalizeCustomerCode keeps minimum compatibility with legacy prefixed codes", () => {
  assert.equal(customerCodeUtils.normalizeCustomerCode("taco-345"), "TACO-345");
  assert.equal(customerCodeUtils.normalizeCustomerCode("taco 345"), "TACO-345");
  assert.equal(customerCodeUtils.normalizeCustomerCode("FOOD12345"), "FOOD-12345");
});

test("upsertCustomerProfile still normalizes incoming codes and generates unique codes through customerCodes", () => {
  assert.match(upsertCustomerProfile, /normalizeCustomerCode\(input\.customerCode\)/);
  assert.match(upsertCustomerProfile, /generateCustomerCode\(input\.tenantSlug\)/);
  assert.match(upsertCustomerProfile, /const codeRef = customerCodesRef\.doc\(customerCode\)/);
  assert.match(upsertCustomerProfile, /if \(codeSnapshot\.exists\) {\s*return null;/);
  assert.match(upsertCustomerProfile, /No se pudo generar un código de cliente único\./);
});

test("client and WhatsApp views use the centralized normalization and preserve compact new-format display", () => {
  assert.match(
    orderMenuClient,
    /import \{ normalizeCustomerCode \} from "@\/modules\/customers\/utils\/generateCustomerCode";/
  );
  assert.match(orderMenuClient, /return normalizeCustomerCode\(customerCode\);/);
  assert.doesNotMatch(whatsappComandaAgent, /customerCode\.split\("-"\)/);
});
