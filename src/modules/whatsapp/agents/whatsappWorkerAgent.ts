import "server-only";

import {
  FieldValue,
  type DocumentData,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { whatsappSenderAgent } from "@/modules/orders/agents/whatsappSenderAgent";
import type { WhatsAppSendResult } from "@/modules/orders/types/whatsapp";
import { executeRecentOrdersCommand } from "@/modules/whatsapp/commands/recentOrdersCommand";
import { extractPhoneNumberId } from "@/modules/webhook/services/metaWebhookService";
import type {
  MetaWebhookPayload,
  TenantActionEngineResult,
} from "@/modules/webhook/types/metaWebhook";
import type { TenantRouterResult } from "@/modules/webhook/agents/tenantRouterAgent";

const AUTO_REPLY_MESSAGE = `Hola 👋
FoodSPV recibió tu mensaje correctamente.`;

type FirestoreJson =
  | null
  | boolean
  | number
  | string
  | FirestoreJson[]
  | { [key: string]: FirestoreJson };

interface IncomingWhatsAppMessage {
  from: string;
  body: string;
  timestamp: string | null;
  messageId: string;
}

interface WorkerResponseResult {
  incomingMessageId: string;
  to: string;
  success: boolean;
  status: WhatsAppSendResult["status"] | "duplicate";
  messageId: string | null;
  error: string | null;
}

interface IncomingMessageReceiptRecord {
  processed?: unknown;
  processing?: unknown;
  attemptCount?: unknown;
  duplicateCount?: unknown;
}

interface IncomingMessageClaimResult {
  shouldProcess: boolean;
  reason: "new" | "retry" | "duplicate" | "in_flight";
}

export interface WhatsAppWorkerInput {
  tenantAction: TenantActionEngineResult;
  payload: MetaWebhookPayload | null;
  tenantRoute: TenantRouterResult;
}

export interface WhatsAppWorkerResult {
  success: boolean;
  eventId: string | null;
  processedMessages: number;
  error: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toFirestoreJson(value: unknown): FirestoreJson {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toFirestoreJson(item));
  }

  if (isRecord(value)) {
    return Object.entries(value).reduce<{ [key: string]: FirestoreJson }>(
      (record, [key, item]) => {
        if (typeof item !== "undefined") {
          record[key] = toFirestoreJson(item);
        }

        return record;
      },
      {}
    );
  }

  return null;
}

function extractIncomingMessages(
  payload: MetaWebhookPayload | null
): IncomingWhatsAppMessage[] {
  const messages: IncomingWhatsAppMessage[] = [];

  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const rawMessages = change.value?.messages;

      if (!Array.isArray(rawMessages)) {
        continue;
      }

      for (const rawMessage of rawMessages) {
        if (!isRecord(rawMessage)) {
          continue;
        }

        const text = isRecord(rawMessage.text) ? rawMessage.text : null;
        const from = isNonEmptyString(rawMessage.from)
          ? rawMessage.from.trim()
          : "";
        const body = isNonEmptyString(text?.body) ? text.body.trim() : "";
        const messageId = isNonEmptyString(rawMessage.id)
          ? rawMessage.id.trim()
          : "";
        const timestamp = isNonEmptyString(rawMessage.timestamp)
          ? rawMessage.timestamp.trim()
          : null;

        if (!from || !body || !messageId) {
          continue;
        }

        messages.push({
          from,
          body,
          timestamp,
          messageId,
        });
      }
    }
  }

  return messages;
}

function getWebhookMessageReceiptRef(messageId: string): DocumentReference {
  return adminDb.collection("webhookMessageReceipts").doc(messageId);
}

function getAttemptCount(record: DocumentData | IncomingMessageReceiptRecord): number {
  return typeof record.attemptCount === "number" && Number.isFinite(record.attemptCount)
    ? record.attemptCount
    : 0;
}

function getDuplicateCount(record: DocumentData | IncomingMessageReceiptRecord): number {
  return typeof record.duplicateCount === "number" && Number.isFinite(record.duplicateCount)
    ? record.duplicateCount
    : 0;
}

async function claimIncomingMessage(
  input: {
    message: IncomingWhatsAppMessage;
    webhookEventId: string;
    tenantId: string | null;
    phoneNumberId: string | null;
  }
): Promise<IncomingMessageClaimResult> {
  const receiptRef = getWebhookMessageReceiptRef(input.message.messageId);

  return adminDb.runTransaction(
    async (transaction: Transaction): Promise<IncomingMessageClaimResult> => {
      const receiptSnapshot = await transaction.get(receiptRef);

      if (!receiptSnapshot.exists) {
        transaction.create(receiptRef, {
          messageId: input.message.messageId,
          tenantId: input.tenantId,
          phoneNumberId: input.phoneNumberId,
          from: input.message.from,
          body: input.message.body,
          sourceTimestamp: input.message.timestamp,
          firstWebhookEventId: input.webhookEventId,
          lastWebhookEventId: input.webhookEventId,
          firstSeenAt: FieldValue.serverTimestamp(),
          lastSeenAt: FieldValue.serverTimestamp(),
          claimedAt: FieldValue.serverTimestamp(),
          attemptCount: 1,
          duplicateCount: 0,
          processing: true,
          processed: false,
          lastError: null,
          responseMessageId: null,
        });

        return {
          shouldProcess: true,
          reason: "new",
        };
      }

      const receiptData =
        (receiptSnapshot.data() ?? {}) as IncomingMessageReceiptRecord;

      if (receiptData.processing === true) {
        transaction.update(receiptRef, {
          lastWebhookEventId: input.webhookEventId,
          lastSeenAt: FieldValue.serverTimestamp(),
          duplicateCount: getDuplicateCount(receiptData) + 1,
        });

        return {
          shouldProcess: false,
          reason: "in_flight",
        };
      }

      if (receiptData.processed === true) {
        transaction.update(receiptRef, {
          lastWebhookEventId: input.webhookEventId,
          lastSeenAt: FieldValue.serverTimestamp(),
          duplicateCount: getDuplicateCount(receiptData) + 1,
        });

        return {
          shouldProcess: false,
          reason: "duplicate",
        };
      }

      transaction.update(receiptRef, {
        tenantId: input.tenantId,
        phoneNumberId: input.phoneNumberId,
        from: input.message.from,
        body: input.message.body,
        sourceTimestamp: input.message.timestamp,
        lastWebhookEventId: input.webhookEventId,
        lastSeenAt: FieldValue.serverTimestamp(),
        claimedAt: FieldValue.serverTimestamp(),
        attemptCount: getAttemptCount(receiptData) + 1,
        processing: true,
        processed: false,
        lastError: null,
      });

      return {
        shouldProcess: true,
        reason: "retry",
      };
    }
  );
}

async function finalizeIncomingMessageReceipt(input: {
  message: IncomingWhatsAppMessage;
  webhookEventId: string;
  sendResult: WhatsAppSendResult;
}): Promise<void> {
  const receiptRef = getWebhookMessageReceiptRef(input.message.messageId);

  await receiptRef.set(
    {
      lastWebhookEventId: input.webhookEventId,
      lastSeenAt: FieldValue.serverTimestamp(),
      processed: input.sendResult.success,
      processing: false,
      processedAt: FieldValue.serverTimestamp(),
      lastError: input.sendResult.error,
      responseMessageId: input.sendResult.messageId,
      lastSendStatus: input.sendResult.status,
    },
    { merge: true }
  );
}

async function resolveResponseMessage(input: {
  message: IncomingWhatsAppMessage;
  tenantRoute: TenantRouterResult;
}): Promise<string | null> {
  const commandResult = await executeRecentOrdersCommand({
    tenantRoute: input.tenantRoute,
    senderPhone: input.message.from,
    messageBody: input.message.body,
  });

  if (!commandResult.matched) {
    return AUTO_REPLY_MESSAGE;
  }

  if (!commandResult.shouldReply) {
    return null;
  }

  return commandResult.message;
}

async function markWebhookEventFailed(
  webhookEventRef: DocumentReference | null,
  error: string
): Promise<void> {
  if (!webhookEventRef) {
    return;
  }

  try {
    await webhookEventRef.update({
      processed: false,
      error,
      processedAt: FieldValue.serverTimestamp(),
    });
  } catch (updateError) {
    console.error("WhatsApp worker could not mark webhook event as failed.", {
      error: updateError instanceof Error ? updateError.message : "unknown_error",
    });
  }
}

async function appendWebhookEventSummary(
  webhookEventRef: DocumentReference,
  summary: Record<string, unknown>
): Promise<void> {
  await webhookEventRef.set(summary, { merge: true });
}

function extractDuplicateMessageIds(
  responseResults: WorkerResponseResult[]
): string[] {
  return responseResults
    .filter((result) => result.status === "duplicate")
    .map((result) => result.incomingMessageId);
}

export async function whatsappWorkerAgent(
  input: WhatsAppWorkerInput
): Promise<WhatsAppWorkerResult> {
  let webhookEventRef: DocumentReference | null = null;

  try {
    const phoneNumberId = extractPhoneNumberId(input.payload);
    const tenantId = input.tenantRoute.found ? input.tenantRoute.tenantId : null;

    webhookEventRef = await adminDb.collection("webhookEvents").add({
      payload: toFirestoreJson(input.payload),
      tenantId,
      phoneNumberId,
      eventType: input.tenantAction.eventType,
      action: input.tenantAction.action,
      timestamp: FieldValue.serverTimestamp(),
      processed: false,
    });

    if (
      !input.tenantRoute.found ||
      !input.tenantAction.shouldProcess ||
      input.tenantAction.action !== "process_customer_message"
    ) {
      await webhookEventRef.update({
        processed: true,
        processedAt: FieldValue.serverTimestamp(),
        incomingMessages: [],
        responseResults: [],
      });

      return {
        success: true,
        eventId: webhookEventRef.id,
        processedMessages: 0,
        error: null,
      };
    }

    const incomingMessages = extractIncomingMessages(input.payload);

    if (incomingMessages.length === 0) {
      await webhookEventRef.update({
        processed: true,
        processedAt: FieldValue.serverTimestamp(),
        incomingMessages: [],
        responseResults: [],
      });

      return {
        success: true,
        eventId: webhookEventRef.id,
        processedMessages: 0,
        error: null,
      };
    }

    const responseResults: WorkerResponseResult[] = [];

    for (const message of incomingMessages) {
      const claimResult = await claimIncomingMessage({
        message,
        webhookEventId: webhookEventRef.id,
        tenantId,
        phoneNumberId,
      });

      if (!claimResult.shouldProcess) {
        responseResults.push({
          incomingMessageId: message.messageId,
          to: message.from,
          success: true,
          status: "duplicate",
          messageId: null,
          error: null,
        });
        continue;
      }

      const responseMessage = await resolveResponseMessage({
        message,
        tenantRoute: input.tenantRoute,
      });
      const sendResult =
        responseMessage === null
          ? {
              success: true,
              status: "sent" as const,
              messageId: null,
              error: null,
            }
          : await whatsappSenderAgent({
              tenantId: tenantId ?? "",
              recipientPhone: message.from,
              whatsappMessage: responseMessage,
            });

      await finalizeIncomingMessageReceipt({
        message,
        webhookEventId: webhookEventRef.id,
        sendResult,
      });

      responseResults.push({
        incomingMessageId: message.messageId,
        to: message.from,
        success: sendResult.success,
        status: sendResult.status,
        messageId: sendResult.messageId,
        error: sendResult.error,
      });
    }

    const failedResults = responseResults.filter((result) => !result.success);
    const duplicateMessageIds = extractDuplicateMessageIds(responseResults);
    const processed = failedResults.length === 0;
    const error =
      failedResults.length > 0
        ? failedResults
            .map((result) => result.error ?? result.status)
            .join(" | ")
        : null;

    await appendWebhookEventSummary(webhookEventRef, {
      processed,
      processedAt: FieldValue.serverTimestamp(),
      incomingMessages,
      responseResults,
      duplicateMessageIds,
      error,
    });

    console.info("WhatsApp worker processed webhook event", {
      eventId: webhookEventRef.id,
      tenantId,
      phoneNumberId,
      messageCount: incomingMessages.length,
      duplicateCount: duplicateMessageIds.length,
      processed,
    });

    return {
      success: processed,
      eventId: webhookEventRef.id,
      processedMessages: incomingMessages.length - duplicateMessageIds.length,
      error,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado procesando webhook WhatsApp.";

    console.error("WhatsApp worker failed.", { error: message });
    await markWebhookEventFailed(webhookEventRef, message);

    return {
      success: false,
      eventId: webhookEventRef?.id ?? null,
      processedMessages: 0,
      error: message,
    };
  }
}
