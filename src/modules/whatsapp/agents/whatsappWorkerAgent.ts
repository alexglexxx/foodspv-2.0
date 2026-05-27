import "server-only";

import { FieldValue, type DocumentReference } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { extractPhoneNumberId } from "@/modules/webhook/services/metaWebhookService";
import type {
  MetaWebhookPayload,
  TenantActionEngineResult,
} from "@/modules/webhook/types/metaWebhook";
import type { TenantRouterResult } from "@/modules/webhook/agents/tenantRouterAgent";

import {
  sendWhatsAppTextMessage,
  type WhatsAppCloudSendResult,
} from "../services/whatsappCloudService";

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
  status: WhatsAppCloudSendResult["status"];
  messageId: string | null;
  error: string | null;
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
      const sendResult = await sendWhatsAppTextMessage({
        to: message.from,
        body: AUTO_REPLY_MESSAGE,
        phoneNumberId,
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
    const processed = failedResults.length === 0;
    const error =
      failedResults.length > 0
        ? failedResults
            .map((result) => result.error ?? result.status)
            .join(" | ")
        : null;

    await webhookEventRef.update({
      processed,
      processedAt: FieldValue.serverTimestamp(),
      incomingMessages,
      responseResults,
      error,
    });

    console.info("WhatsApp worker processed webhook event", {
      eventId: webhookEventRef.id,
      tenantId,
      phoneNumberId,
      messageCount: incomingMessages.length,
      processed,
    });

    return {
      success: processed,
      eventId: webhookEventRef.id,
      processedMessages: incomingMessages.length,
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
