import { getOrCreateDeviceId } from "./deviceId";

const PREVIEW_PREFIX = "cm_decrypted_preview";
const INDEX_PREFIX = "cm_decrypted_preview_index";
const MAX_INDEX_SIZE = 500;

const memory = new Map();

function normalize(value, fallback = "unknown") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

export function previewKey({ userId, deviceId, chatId, messageId }) {
  return [
    PREVIEW_PREFIX,
    normalize(userId, "anonymous"),
    normalize(deviceId, "no-device"),
    normalize(chatId, "no-chat"),
    normalize(messageId, "no-message"),
  ].join(":");
}

function indexKey({ userId, deviceId }) {
  return [
    INDEX_PREFIX,
    normalize(userId, "anonymous"),
    normalize(deviceId, "no-device"),
  ].join(":");
}

function scrubLegacyLocalStorage() {
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(PREVIEW_PREFIX) || key.startsWith(INDEX_PREFIX))) {
        doomed.push(key);
      }
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch (_) { /* storage may be unavailable */ }
}

scrubLegacyLocalStorage();

function rememberKey({ userId, deviceId }, key) {
  const idx = indexKey({ userId, deviceId });
  const current = memory.get(idx) || [];
  memory.set(idx, [key, ...current.filter((item) => item !== key)].slice(0, MAX_INDEX_SIZE));
}

export function saveMessagePreview({ userId, deviceId = getOrCreateDeviceId(), chatId, messageId, preview, createdAt, isOut }) {
  if (!chatId || !messageId) return;
  const cleanPreview = String(preview || "").trim();
  if (!cleanPreview || cleanPreview === "[encrypted]") return;

  scrubLegacyLocalStorage();
  const key = previewKey({ userId, deviceId, chatId, messageId });
  memory.set(key, {
    preview: cleanPreview,
    createdAt: createdAt || null,
    isOut: Boolean(isOut),
    savedAt: new Date().toISOString(),
  });
  rememberKey({ userId, deviceId }, key);
}

export function loadMessagePreview({ userId, deviceId = getOrCreateDeviceId(), chatId, messageId }) {
  if (!chatId || !messageId) return null;
  const value = memory.get(previewKey({ userId, deviceId, chatId, messageId }));
  return value?.preview ? value : null;
}

export function clearPreviewCacheForUser(userId, deviceId = getOrCreateDeviceId()) {
  const idx = indexKey({ userId, deviceId });
  const keys = memory.get(idx) || [];
  if (Array.isArray(keys)) {
    keys.forEach((key) => memory.delete(key));
  }
  memory.delete(idx);
  scrubLegacyLocalStorage();
}
