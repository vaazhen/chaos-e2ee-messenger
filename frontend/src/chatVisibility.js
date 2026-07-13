const KEY_PREFIX = "cm_hidden_chats_v1:";

function keyForUser(myId) {
  return `${KEY_PREFIX}${String(myId || "anon")}`;
}

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : fallback;
  } catch (_) {
    return fallback;
  }
}

export function getHiddenChatIds(myId) {
  if (typeof window === "undefined") return new Set();
  const raw = localStorage.getItem(keyForUser(myId));
  const arr = raw ? safeParse(raw, []) : [];
  return new Set(arr.map(String));
}

export function hideChatId(myId, chatId) {
  if (typeof window === "undefined") return;
  const id = String(chatId || "");
  if (!id) return;
  const set = getHiddenChatIds(myId);
  set.add(id);
  localStorage.setItem(keyForUser(myId), JSON.stringify([...set]));
}

export function unhideChatId(myId, chatId) {
  if (typeof window === "undefined") return;
  const id = String(chatId || "");
  if (!id) return;
  const set = getHiddenChatIds(myId);
  set.delete(id);
  localStorage.setItem(keyForUser(myId), JSON.stringify([...set]));
}

export function isChatHidden(myId, chatId) {
  if (!chatId) return false;
  return getHiddenChatIds(myId).has(String(chatId));
}

