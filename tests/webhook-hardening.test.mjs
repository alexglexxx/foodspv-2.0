import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const webhookRoute = readFileSync("src/app/api/webhook/route.ts", "utf8");
const webhookSecurity = readFileSync(
  "src/modules/webhook/services/metaWebhookSecurity.ts",
  "utf8"
);
const whatsappWorker = readFileSync(
  "src/modules/whatsapp/agents/whatsappWorkerAgent.ts",
  "utf8"
);

test("webhook route validates signed raw payloads before processing", () => {
  assert.match(webhookRoute, /const appSecret = process\.env\.META_APP_SECRET/);
  assert.match(webhookRoute, /const rawBody = await request\.text\(\)/);
  assert.match(webhookRoute, /getMetaWebhookSignatureHeader\(request\)/);
  assert.match(webhookRoute, /verifyMetaWebhookSignature\(/);
  assert.match(webhookRoute, /status:\s*401/);
  assert.match(webhookRoute, /JSON\.parse\(rawBody\)/);
});

test("webhook security helper builds sha256 HMAC signatures and compares safely", () => {
  assert.match(webhookSecurity, /createHmac\("sha256", appSecret\)/);
  assert.match(webhookSecurity, /timingSafeEqual/);
  assert.match(webhookSecurity, /x-hub-signature-256/);
  assert.match(webhookSecurity, /sha256=/);
});

test("whatsapp worker deduplicates inbound messages by messageId in Firestore", () => {
  assert.match(whatsappWorker, /collection\("webhookMessageReceipts"\)\.doc\(messageId\)/);
  assert.match(whatsappWorker, /claimIncomingMessage\(/);
  assert.match(whatsappWorker, /status:\s*"duplicate"/);
  assert.match(whatsappWorker, /processedMessages:\s*incomingMessages\.length - duplicateMessageIds\.length/);
  assert.match(whatsappWorker, /duplicateMessageIds/);
  assert.match(whatsappWorker, /whatsappSenderAgent\(/);
});
