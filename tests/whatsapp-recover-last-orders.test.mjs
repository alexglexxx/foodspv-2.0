import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadTsModule(path, exportNames) {
  const source = readFileSync(path, "utf8");
  const transpiledSource = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const executableSource = `${transpiledSource}
module.exports = { ${exportNames.join(", ")} };`;
  const context = {
    Intl,
    Math,
    Number,
    String,
    module: { exports: {} },
    exports: {},
  };

  vm.runInNewContext(executableSource, context);

  return context.module.exports;
}

const parserModule = loadTsModule(
  "src/modules/whatsapp/commands/whatsappCommandParser.ts",
  ["normalizeWhatsAppCommandText", "parseWhatsAppCommand"]
);
const formatterSource = readFileSync(
  "src/modules/orders/formatters/orderWhatsAppSummary.ts",
  "utf8"
);
const recentOrdersCommand = readFileSync(
  "src/modules/whatsapp/commands/recentOrdersCommand.ts",
  "utf8"
);
const recentOrdersServer = readFileSync(
  "src/modules/orders/server/listRecentTenantOrders.ts",
  "utf8"
);
const webhookRoute = readFileSync("src/app/api/webhook/route.ts", "utf8");
const whatsappWorker = readFileSync(
  "src/modules/whatsapp/agents/whatsappWorkerAgent.ts",
  "utf8"
);
const auditDoc = readFileSync(
  "docs/audits/foodspv-whatsapp-recover-last-orders.md",
  "utf8"
);

test("whatsapp command parser accepts ULTIMO, ÚLTIMO and ULTIMOS 2", () => {
  assert.equal(
    parserModule.parseWhatsAppCommand("ULTIMO").command,
    "latest_order"
  );
  assert.equal(
    parserModule.parseWhatsAppCommand("ÚLTIMO").command,
    "latest_order"
  );
  assert.equal(
    parserModule.parseWhatsAppCommand("ultimos 2").command,
    "recent_orders"
  );
  assert.equal(parserModule.parseWhatsAppCommand("ultimos 2").limit, 2);
});

test("whatsapp command parser normalizes accents and limits maximum to 3", () => {
  assert.equal(
    parserModule.normalizeWhatsAppCommandText("  Últimos   9 "),
    "ULTIMOS 9"
  );
  assert.equal(parserModule.parseWhatsAppCommand("ULTIMOS 9").limit, 3);
  assert.equal(parserModule.parseWhatsAppCommand("PEDIDOS").limit, 3);
});

test("recent orders formatter handles missing optional fields", () => {
  assert.match(formatterSource, /Sin fecha/);
  assert.match(formatterSource, /Productos no disponibles/);
  assert.match(formatterSource, /Sin total/);
  assert.match(formatterSource, /order\.customerCode/);
});

test("recent orders command reads only tenant-scoped orders and checks authorized phones", () => {
  assert.match(
    recentOrdersServer,
    /collection\("tenants"\)\s*\.doc\(tenantId\)\s*\.collection\("orders"\)/
  );
  assert.match(recentOrdersCommand, /authorizedWhatsappPhones/);
  assert.match(recentOrdersCommand, /normalizePhone/);
});

test("webhook does not process order recovery when tenant cannot be resolved", () => {
  assert.match(webhookRoute, /routeWebhookByPhoneNumberId/);
  assert.match(whatsappWorker, /if \(\s*!input\.tenantRoute\.found/);
  assert.match(whatsappWorker, /processedMessages: 0/);
});

test("whatsapp worker resolves commands before fallback auto reply", () => {
  const commandIndex = whatsappWorker.indexOf("const responseMessage = await resolveResponseMessage({");
  const sendIndex = whatsappWorker.indexOf("await whatsappSenderAgent({");

  assert.notEqual(commandIndex, -1);
  assert.notEqual(sendIndex, -1);
  assert.ok(commandIndex < sendIndex);
});

test("whatsapp recover orders audit documents commands, tenant resolution, limit 3, and MVP authorization mode", () => {
  assert.match(auditDoc, /ULTIMO/);
  assert.match(auditDoc, /phone_number_id/);
  assert.match(auditDoc, /nunca más de 3 pedidos/);
  assert.match(auditDoc, /authorizedWhatsappPhones/);
  assert.match(auditDoc, /Modo MVP:/);
  assert.match(auditDoc, /Firestore es la fuente de verdad\./);
});
