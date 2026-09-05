import { compactReplyTo } from "./messageModel";
import type { CompactReply, MessagePayloadV1, ParsedMessage, TimelineMessage } from "./types/protocol";

export const MAX_ENCRYPTED_PAYLOAD_CHARS = 180_000;

export interface SendInputObject {
  text?: string | undefined;
  imgFile?: unknown;
  voiceFile?: unknown;
  videoNoteFile?: unknown;
  generalFile?: unknown;
  ttl?: number | null | undefined;
  replyTo?: CompactReply | Record<string, unknown> | null | undefined;
}

export type SendInput = string | SendInputObject;

export interface ParsedSendInput {
  text: string;
  imgFile: unknown;
  voiceFile: unknown;
  videoNoteFile: unknown;
  generalFile: unknown;
  ttl: number | null | undefined;
  replyTo: CompactReply | Record<string, unknown> | null | undefined;
}

export interface BuildOptimisticMessageParams {
  clientMessageId: string;
  myId: string | number;
  parsedPayload: Partial<ParsedMessage>;
  encryptedPlaintext: string;
  ttl?: number | null | undefined;
  replyTo?: CompactReply | Record<string, unknown> | null | undefined;
  nowText: string;
  nowMs?: number | undefined;
}

export interface OptimisticMessage extends TimelineMessage {
  id: string;
  _clientMessageId: string;
  _temp: true;
  _out: true;
  senderId: string | number;
  content: string;
  status: string;
  reactions: Record<string, number>;
  myReactions: string[];
}

export function parseSendInput(input: SendInput): ParsedSendInput {
  const text = typeof input === "string" ? input : String(input?.text || "").trim();
  const imgFile = typeof input === "string" ? null : input?.imgFile;
  const voiceFile = typeof input === "string" ? null : input?.voiceFile;
  const videoNoteFile = typeof input === "string" ? null : input?.videoNoteFile;
  const generalFile = typeof input === "string" ? null : input?.generalFile;
  const ttl = typeof input === "string" ? null : input?.ttl;
  const replyTo = typeof input === "string" ? null : input?.replyTo;

  return { text, imgFile, voiceFile, videoNoteFile, generalFile, ttl, replyTo };
}

export function isEmptySend(fields: {
  text: string;
  imgFile: unknown;
  voiceFile: unknown;
  videoNoteFile: unknown;
  generalFile: unknown;
}): boolean {
  const { text, imgFile, voiceFile, videoNoteFile, generalFile } = fields;
  return !text && !imgFile && !voiceFile && !videoNoteFile && !generalFile;
}

export function buildTextPayload(
  text: string,
  ttl?: number | null,
  replyTo?: CompactReply | Record<string, unknown> | null,
): string {
  if (!ttl && !replyTo) return text;
  const payload: MessagePayloadV1 = { v: 1, type: "text", text };
  if (ttl) payload.ttl = ttl;
  if (replyTo) payload.replyTo = compactReplyTo(replyTo);
  return JSON.stringify(payload);
}

export function applyTtlAndReply(
  encryptedPlaintext: string,
  ttl?: number | null,
  replyTo?: CompactReply | Record<string, unknown> | null,
): string {
  if (!ttl && !replyTo) return encryptedPlaintext;
  try {
    const payloadObj: MessagePayloadV1 = encryptedPlaintext.startsWith("{")
      ? (JSON.parse(encryptedPlaintext) as MessagePayloadV1)
      : { v: 1, type: "text", text: encryptedPlaintext };
    if (ttl) payloadObj.ttl = ttl;
    if (replyTo) payloadObj.replyTo = compactReplyTo(replyTo);
    return JSON.stringify(payloadObj);
  } catch {
    const base: MessagePayloadV1 = { v: 1, type: "text", text: encryptedPlaintext };
    if (ttl) base.ttl = ttl;
    if (replyTo) base.replyTo = compactReplyTo(replyTo);
    return JSON.stringify(base);
  }
}

export function assertPayloadSize(plaintext: string): void {
  if (plaintext.length > MAX_ENCRYPTED_PAYLOAD_CHARS) {
    throw new Error("Файл слишком большой для отправки сообщением. Нужно вложение, а не inline.");
  }
}

export function buildOptimisticMessage(params: BuildOptimisticMessageParams): OptimisticMessage {
  const {
    clientMessageId,
    myId,
    parsedPayload,
    encryptedPlaintext,
    ttl,
    replyTo,
    nowText,
    nowMs = Date.now(),
  } = params;

  const tempExpiresAt = ttl ? new Date(nowMs + ttl * 1000).toISOString() : null;

  return {
    id: clientMessageId,
    _clientMessageId: clientMessageId,
    _temp: true,
    _out: true,
    _text: parsedPayload.text,
    _img: parsedPayload.img,
    _voice: parsedPayload.voice,
    _videoNote: parsedPayload.videoNote,
    _payload: parsedPayload.payload ?? null,
    _attachment: parsedPayload.payload?.attachment || null,
    _ttl: ttl || null,
    _replyTo: compactReplyTo(replyTo),
    expiresAt: tempExpiresAt,
    _time: nowText,
    content: encryptedPlaintext,
    senderId: myId,
    status: "SENT",
    reactions: {},
    myReactions: [],
  };
}
