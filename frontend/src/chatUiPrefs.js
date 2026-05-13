const KEY_PREFIX = "cm_chat_ui_prefs_v1:";

function keyForUser(userId) {
  return `${KEY_PREFIX}${String(userId || "anon")}`;
}

function parse(raw) {
  try {
    const data = JSON.parse(raw || "{}");
    return {
      muted: Array.isArray(data?.muted) ? data.muted.map(String) : [],
      archived: Array.isArray(data?.archived) ? data.archived.map(String) : [],
    };
  } catch (_) {
    return { muted: [], archived: [] };
  }
}

export function getChatUiPrefs(userId) {
  if (typeof window === "undefined") return { muted: new Set(), archived: new Set() };
  const raw = localStorage.getItem(keyForUser(userId));
  const p = parse(raw);
  return {
    muted: new Set(p.muted),
    archived: new Set(p.archived),
  };
}

export function toggleMuted(userId, chatId) {
  if (typeof window === "undefined" || !chatId) return false;
  const prefs = getChatUiPrefs(userId);
  const id = String(chatId);
  if (prefs.muted.has(id)) prefs.muted.delete(id);
  else prefs.muted.add(id);
  localStorage.setItem(keyForUser(userId), JSON.stringify({
    muted: [...prefs.muted],
    archived: [...prefs.archived],
  }));
  return prefs.muted.has(id);
}

export function toggleArchived(userId, chatId) {
  if (typeof window === "undefined" || !chatId) return false;
  const prefs = getChatUiPrefs(userId);
  const id = String(chatId);
  if (prefs.archived.has(id)) prefs.archived.delete(id);
  else prefs.archived.add(id);
  localStorage.setItem(keyForUser(userId), JSON.stringify({
    muted: [...prefs.muted],
    archived: [...prefs.archived],
  }));
  return prefs.archived.has(id);
}

