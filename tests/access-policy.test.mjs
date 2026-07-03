import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const statusRoute = readFileSync("src/app/api/orders/status/route.ts", "utf8");
const dashboardClient = readFileSync(
  "src/modules/orders/components/OrdersDashboardClient.tsx",
  "utf8"
);
const adminPage = readFileSync("src/app/admin/page.tsx", "utf8");
const rules = readFileSync("firestore.rules", "utf8");
const menuRoute = readFileSync("src/app/api/menu/[tenantId]/route.ts", "utf8");
const tenantPage = readFileSync("src/app/[tenant]/page.tsx", "utf8");
const superadminDashboard = readFileSync(
  "src/modules/superadmin/components/SuperadminDashboard.tsx",
  "utf8"
);
const tenantList = readFileSync(
  "src/modules/superadmin/components/TenantList.tsx",
  "utf8"
);
const tenantService = readFileSync(
  "src/modules/superadmin/services/tenantService.ts",
  "utf8"
);
const tenantAvailability = readFileSync(
  "src/modules/tenants/tenantAvailability.ts",
  "utf8"
);
const superAdminAuthService = readFileSync(
  "src/modules/superadmin/services/authService.ts",
  "utf8"
);
const whatsappSenderAgent = readFileSync(
  "src/modules/orders/agents/whatsappSenderAgent.ts",
  "utf8"
);
const whatsappWorker = readFileSync(
  "src/modules/whatsapp/agents/whatsappWorkerAgent.ts",
  "utf8"
);

function resolveTenantAccess(user, tenantId) {
  if (!user) {
    return 401;
  }

  if (user.active === false) {
    return 403;
  }

  if (user.role === "superadmin") {
    return 200;
  }

  if (
    (user.role === "tenant_admin" || user.role === "employee") &&
    user.tenantId === tenantId
  ) {
    return 200;
  }

  return 403;
}

test("tenant access policy returns 401 for missing auth and 403 for cross-tenant access", () => {
  assert.equal(resolveTenantAccess(null, "tenant-a"), 401);
  assert.equal(
    resolveTenantAccess(
      { role: "employee", tenantId: "tenant-b", active: true },
      "tenant-a"
    ),
    403
  );
  assert.equal(
    resolveTenantAccess(
      { role: "tenant_admin", tenantId: "tenant-b", active: true },
      "tenant-a"
    ),
    403
  );
});

test("tenant access policy allows only same-tenant internal roles or superadmin", () => {
  assert.equal(
    resolveTenantAccess(
      { role: "employee", tenantId: "tenant-a", active: true },
      "tenant-a"
    ),
    200
  );
  assert.equal(
    resolveTenantAccess(
      { role: "tenant_admin", tenantId: "tenant-a", active: true },
      "tenant-a"
    ),
    200
  );
  assert.equal(
    resolveTenantAccess(
      { role: "superadmin", tenantId: null, active: true },
      "tenant-a"
    ),
    200
  );
});

test("orders status backend enforces the same 401/403 tenant policy", () => {
  assert.match(
    statusRoute,
    /requireEmployeeOrTenantAdmin\(request,\s*input\.tenantId\)/
  );
  assert.match(statusRoute, /status:\s*auth\.status/);
  assert.match(statusRoute, /message:\s*auth\.message/);
});

test("dashboard sends the Firebase ID token to the protected status API", () => {
  assert.match(dashboardClient, /onAuthStateChanged\(auth/);
  assert.match(dashboardClient, /firebaseUser\.getIdToken\(\)/);
  assert.match(dashboardClient, /Authorization:\s*`Bearer \$\{await firebaseUser\.getIdToken\(\)\}`/);
});

test("/admin loads without a required tenantId query for tenant admins", () => {
  assert.doesNotMatch(adminPage, /Falta el tenantId/);
  assert.doesNotMatch(adminPage, /\/admin\?tenantId=demo-tenant/);
  assert.match(adminPage, /requestedTenantId/);
});

test("dashboard resolves tenant access from users uid profile", () => {
  assert.match(dashboardClient, /doc\(db,\s*"users",\s*firebaseUser\.uid\)/);
  assert.match(dashboardClient, /setActiveTenantId\(profile\.tenantId\)/);
  assert.match(dashboardClient, /profile\.role === "superadmin"/);
  assert.match(dashboardClient, /setActiveTenantId\(supportTenantId\)/);
});

test("tenant dashboard includes operational widgets and metrics", () => {
  assert.match(dashboardClient, /Pedidos de hoy/);
  assert.match(dashboardClient, /Ventas de hoy/);
  assert.match(dashboardClient, /Ticket promedio/);
  assert.match(dashboardClient, /Accesos rápidos/);
  assert.match(dashboardClient, /Actividad reciente/);
  assert.match(dashboardClient, /Alertas operativas/);
  assert.match(dashboardClient, /Configuración de widgets/);
});

test("tenant dashboard reads products for alerts through active tenant path", () => {
  assert.match(
    dashboardClient,
    /collection\(db,\s*"tenants",\s*activeTenantId,\s*"products"\)/
  );
  assert.match(dashboardClient, /Productos sin precio/);
  assert.match(dashboardClient, /Productos sin imagen/);
  assert.match(dashboardClient, /Pedidos pendientes antiguos/);
});

test("tenant dashboard avoids fixed mobile overflow in kanban", () => {
  assert.doesNotMatch(dashboardClient, /min-w-\[960px\]/);
  assert.doesNotMatch(dashboardClient, /overflow-x-auto/);
  assert.match(dashboardClient, /overflow-x-hidden/);
  assert.match(dashboardClient, /grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4/);
});

test("Firestore Rules deny cross-tenant client access by requiring tenant role match", () => {
  assert.match(rules, /function hasTenantAccess\(tenantId\)/);
  assert.match(rules, /role\(\) in \["tenant_admin", "employee"\]/);
  assert.match(rules, /roleTenantId\(\) == tenantId/);
  assert.match(rules, /match \/tenants\/\{tenantId\}/);
  assert.match(rules, /allow read: if hasTenantAccess\(tenantId\);/);
  assert.doesNotMatch(rules, /allow read:\s*if true/);
});

test("public menu API uses a sanitized tenant payload instead of public tenant document reads", () => {
  assert.match(menuRoute, /function toPublicTenant/);
  assert.doesNotMatch(menuRoute, /metaAccessToken/);
  assert.doesNotMatch(menuRoute, /metaPhoneNumberId/);
});

test("tenant availability is centralized and reused in public tenant surfaces", () => {
  assert.match(tenantAvailability, /getTenantAvailabilityState/);
  assert.match(
    tenantAvailability,
    /record\.active === false \|\| record\.status === "inactive"/
  );
  assert.match(tenantPage, /isTenantAvailable\(tenantRecord\)/);
  assert.match(menuRoute, /isTenantAvailable\(tenantRecord\)/);
});

test("superadmin dashboard renders tenant access card with copy URL and QR actions", () => {
  assert.match(superadminDashboard, /onCopyUrl/);
  assert.match(superadminDashboard, /onDownloadQr/);
  assert.match(tenantList, /TenantAccessCard/);
  assert.match(tenantList, /onCopyUrl=\{onCopyUrl\}/);
  assert.match(tenantList, /onDownloadQr=\{onDownloadQr\}/);
});

test("superadmin tenant service backfills public URL and QR code for older tenants", () => {
  assert.match(tenantService, /resolveTenantAccessAssets/);
  assert.match(tenantService, /generateTenantQRCode/);
  assert.match(tenantService, /publicUrl: accessAssets\.publicUrl/);
  assert.match(tenantService, /qrCode: accessAssets\.qrCode/);
});

test("superadmin auth blocks inactive users while preserving role checks", () => {
  assert.match(superAdminAuthService, /getUserRoleProfile\(/);
  assert.match(superAdminAuthService, /profileInactive = profile\?\.active === false/);
  assert.match(superAdminAuthService, /message: "Usuario inactivo\."/);
});

test("whatsapp delivery paths use tenant-scoped credentials and sender agent", () => {
  assert.match(whatsappSenderAgent, /sendWhatsAppTextMessage\(/);
  assert.match(whatsappSenderAgent, /accessToken: tenantConfig\.metaAccessToken/);
  assert.match(whatsappSenderAgent, /phoneNumberId: tenantConfig\.metaPhoneNumberId/);
  assert.match(whatsappWorker, /whatsappSenderAgent\(/);
  assert.doesNotMatch(whatsappWorker, /META_WHATSAPP_TOKEN/);
});
