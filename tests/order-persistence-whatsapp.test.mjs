import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ordersRoute = readFileSync("src/app/api/orders/route.ts", "utf8");
const firestoreWriter = readFileSync(
  "src/modules/orders/agents/firestoreWriterAgent.ts",
  "utf8"
);
const orderService = readFileSync(
  "src/modules/orders/services/orderService.ts",
  "utf8"
);
const orderTypes = readFileSync("src/modules/orders/types/order.ts", "utf8");
const dashboardClient = readFileSync(
  "src/modules/orders/components/OrdersDashboardClient.tsx",
  "utf8"
);
const auditDoc = readFileSync(
  "docs/audits/foodspv-order-persistence-whatsapp.md",
  "utf8"
);

test("orders route persists to Firestore before attempting WhatsApp delivery", () => {
  const persistIndex = ordersRoute.indexOf(
    "const persistedOrder = await firestoreWriterAgent(orderToPersist);"
  );
  const whatsappIndex = ordersRoute.indexOf(
    "const whatsappDelivery = await whatsappSenderAgent({"
  );

  assert.notEqual(persistIndex, -1);
  assert.notEqual(whatsappIndex, -1);
  assert.ok(persistIndex < whatsappIndex);
});

test("orders route returns stable success payload even when WhatsApp can fail after persistence", () => {
  assert.match(ordersRoute, /warning,/);
  assert.match(ordersRoute, /orderId: persistedOrder\.orderId/);
  assert.match(
    ordersRoute,
    /customerCode: customerProfileResult\.customerProfile\.customerCode/
  );
  assert.match(ordersRoute, /whatsapp: whatsappState/);
  assert.match(
    ordersRoute,
    /"El pedido se guardó correctamente, pero falló el envío por WhatsApp\."/
  );
});

test("firestore writer stores updatedAt and supports post-save WhatsApp metadata updates", () => {
  assert.match(firestoreWriter, /updatedAt: FieldValue\.serverTimestamp\(\)/);
  assert.match(
    firestoreWriter,
    /export async function updateFirestoreOrderWhatsAppAgent/
  );
  assert.match(firestoreWriter, /whatsapp:\s*\{/);
  assert.match(firestoreWriter, /sentAt:/);
});

test("order types include order flow and WhatsApp persistence metadata", () => {
  assert.match(orderTypes, /orderFlowMode\?:OrderFlowMode;/);
  assert.match(orderTypes, /orderState\?:OrderState;/);
  assert.match(orderTypes, /whatsapp\?:OrderWhatsAppState;/);
  assert.match(orderTypes, /customerId\?:string;/);
  assert.match(orderTypes, /customerCode\?:string;/);
});

test("client order service understands warning and whatsapp response fields", () => {
  assert.match(orderService, /warning\?: string;/);
  assert.match(orderService, /whatsapp\?: Partial<OrderWhatsAppState>;/);
  assert.match(orderService, /warning: payload\.warning/);
});

test("tenant dashboard still reads tenant-scoped Firestore orders for every active tenant", () => {
  assert.match(
    dashboardClient,
    /collection\(db,\s*"tenants",\s*activeTenantId,\s*"orders"\)/
  );
  assert.match(dashboardClient, /orderBy\("createdAt", "desc"\)/);
});

test("order persistence audit documents Firestore as source of truth and simple_whatsapp dashboard support", () => {
  assert.match(auditDoc, /Firestore es la fuente de verdad\./);
  assert.match(auditDoc, /WhatsApp es un canal secundario de notificación\./);
  assert.match(auditDoc, /`simple_whatsapp` no significa “sin dashboard”\./);
  assert.match(auditDoc, /Todo tenant activo debe guardar pedidos en Firestore/);
});
