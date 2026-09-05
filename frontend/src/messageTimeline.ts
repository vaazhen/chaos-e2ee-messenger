import { isEncryptedPlaceholder, mergeIncomingMessage } from "./messageModel";
import type { ChatMessageMap, IncomingTimelineApplyOptions, TimelineMessage } from "./types/protocol";

export function messageRowId(msg: Pick<TimelineMessage, "id" | "messageId">): string {
  return String(msg.id ?? msg.messageId);
}

export function isDeletedServerMessage(msg: TimelineMessage): boolean {
  return msg.deleted === true || Boolean(msg.deletedAt);
}

export function filterVisibleMessages(
  messages: TimelineMessage[],
  hiddenIds: Set<string>,
): TimelineMessage[] {
  return messages.filter(
    (msg) => !hiddenIds.has(messageRowId(msg)) && !isDeletedServerMessage(msg),
  );
}

export function collectNewRemoteMessages(
  remote: TimelineMessage[],
  cached: TimelineMessage[],
  hiddenIds: Set<string>,
): TimelineMessage[] {
  const existingIds = new Set(
    cached.filter((m) => !isEncryptedPlaceholder(m)).map((m) => messageRowId(m)),
  );

  return remote.filter(
    (msg) =>
      !existingIds.has(messageRowId(msg)) &&
      !hiddenIds.has(messageRowId(msg)) &&
      !isDeletedServerMessage(msg),
  );
}

export function mergeDecryptedIntoChat(
  existing: TimelineMessage[],
  decrypted: TimelineMessage[],
): TimelineMessage[] {
  const merged = [...existing];
  for (const incoming of decrypted) {
    const idx = merged.findIndex((m) => messageRowId(m) === messageRowId(incoming));
    if (idx === -1) merged.push(incoming);
    else merged[idx] = mergeIncomingMessage(merged[idx], incoming);
  }
  return merged;
}

export function applyIncomingToChat(
  existing: TimelineMessage[],
  msg: TimelineMessage,
  options: IncomingTimelineApplyOptions,
): TimelineMessage[] {
  const { isOut, clientMessageId } = options;
  const withoutTemp = isOut
    ? existing.filter((m) => !(m._temp && m._clientMessageId === clientMessageId))
    : existing;
  const idx = withoutTemp.findIndex((m) => String(m.id) === String(msg.id));
  if (idx >= 0) {
    return withoutTemp.map((m, i) => (i === idx ? mergeIncomingMessage(m, msg) : m));
  }
  return [...withoutTemp, msg];
}

export function applyHydratedAttachments(
  existing: TimelineMessage[],
  hydrated: TimelineMessage[],
): TimelineMessage[] {
  if (hydrated.length === 0) return existing;
  const byId = new Map(hydrated.map((m) => [String(m.id), m]));
  return existing.map((m) => byId.get(String(m.id)) ?? m);
}

export function applyMessageStatus(
  map: ChatMessageMap,
  messageId: string | number,
  status: string,
): ChatMessageMap {
  const updated: ChatMessageMap = {};
  for (const [chatId, arr] of Object.entries(map)) {
    updated[chatId] = arr.map((m) =>
      String(m.id) === String(messageId) ? { ...m, status } : m,
    );
  }
  return updated;
}

export function applyChatOutgoingStatus(
  messages: TimelineMessage[],
  status: string,
): TimelineMessage[] {
  return messages.map((m) => (m._out && !m._temp ? { ...m, status } : m));
}

export function removeMessageFromChat(
  messages: TimelineMessage[],
  messageId: string | number,
): TimelineMessage[] {
  return messages.filter((m) => String(m.id) !== String(messageId));
}

export function appendOptimistic(
  messages: TimelineMessage[],
  tempMsg: TimelineMessage,
): TimelineMessage[] {
  return [...messages, tempMsg];
}

export function confirmOptimistic(
  messages: TimelineMessage[],
  clientMessageId: string,
  patch: Partial<TimelineMessage>,
): TimelineMessage[] {
  return messages.map((m) =>
    m.id === clientMessageId ? { ...m, ...patch, _temp: false } : m,
  );
}

export function rollbackOptimistic(
  messages: TimelineMessage[],
  clientMessageId: string,
): TimelineMessage[] {
  return messages.filter((m) => m.id !== clientMessageId);
}
