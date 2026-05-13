const KEY_PREFIX = "cm_contact_aliases_v1:";

function keyForUser(myId) {
  return `${KEY_PREFIX}${String(myId || "anon")}`;
}

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : fallback;
  } catch (_) {
    return fallback;
  }
}

export function getAliasMap(myId) {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(keyForUser(myId));
  return raw ? safeParse(raw, {}) : {};
}

export function getAlias(myId, otherUserId) {
  const id = String(otherUserId || "");
  if (!id) return "";
  const map = getAliasMap(myId);
  const v = map[id];
  return typeof v === "string" ? v : "";
}

export function setAlias(myId, otherUserId, alias) {
  if (typeof window === "undefined") return;
  const id = String(otherUserId || "");
  if (!id) return;

  const trimmed = String(alias || "").trim();
  const map = getAliasMap(myId);

  if (!trimmed) {
    delete map[id];
  } else {
    map[id] = trimmed.slice(0, 64);
  }

  localStorage.setItem(keyForUser(myId), JSON.stringify(map));
}

export function displayNameForChat(chat, myId) {
  if (!chat) return "";
  if (chat.type !== "direct") return chat.name || "";
  if (!chat.otherUserId) return chat.name || "";
  return getAlias(myId, chat.otherUserId) || chat.name || "";
}

