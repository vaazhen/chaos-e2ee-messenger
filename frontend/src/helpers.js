import { loadMessagePreview } from "./previewCache";
import { getOrCreateDeviceId } from "./deviceId";

export const COLORS = [
  "#111111|#555555",
  "#0f6ea8|#49b2ef",
  "#1c7c54|#62d39a",
  "#7c3aed|#c084fc",
  "#ea580c|#fdba74",
  "#be123c|#fb7185",
  "#0f766e|#5eead4"
];

export const color = (i) => {
  const [a, b] = COLORS[Math.abs(Number(i || 0)) % COLORS.length].split("|");
  return [a, b];
};

export const getTime = (iso) => {
  const d = iso ? new Date(iso) : new Date();

  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const diff = now - d;

  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  if (diff < 604800000) {
    return d.toLocaleDateString("ru-RU", { weekday: "short" });
  }

  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

export const initials = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase() || "?";

export const AVATAR_PRESETS = [
  { emoji: "🦊", bg: "linear-gradient(135deg,#e05555,#e09e4f)" },
  { emoji: "🐺", bg: "linear-gradient(135deg,#4fa3e0,#2d6fa8)" },
  { emoji: "🦁", bg: "linear-gradient(135deg,#e09e4f,#d4691e)" },
  { emoji: "🐯", bg: "linear-gradient(135deg,#da7de0,#9d7de0)" },
  { emoji: "🐻", bg: "linear-gradient(135deg,#3fb950,#1a3d1a)" },
  { emoji: "🐼", bg: "linear-gradient(135deg,#8b949e,#21262d)" },
  { emoji: "🦄", bg: "linear-gradient(135deg,#da7de0,#4fa3e0)" },
  { emoji: "🐉", bg: "linear-gradient(135deg,#3fb950,#4fa3e0)" },
];

export const avatarPreset = (avatarUrl) => {
  if (!avatarUrl) return null;

  if (String(avatarUrl) === "preset:saved") {
    return { emoji: "★", bg: "linear-gradient(135deg,#111111,#777777)" };
  }

  if (!String(avatarUrl).startsWith("preset:")) return null;

  const idx = Number(String(avatarUrl).split(":")[1]);
  return Number.isInteger(idx) && idx >= 0 && idx < AVATAR_PRESETS.length ? AVATAR_PRESETS[idx] : null;
};

const DEFAULT_MAP_CHAT_LABELS = {
  contact: "Контакт",
  saved: "Избранное",
  group: "Группа",
  newMessage: "Новое сообщение",
};

export const mapChat = (c, myId, labels) => {
  const L = { ...DEFAULT_MAP_CHAT_LABELS, ...(labels || {}) };
  const chatId = c.chatId ?? c.id;
  const rawType = String(c.type || "").toLowerCase();

  const isGroup = rawType === "group";
  const isSaved = rawType === "saved";

  const otherFirstName = c.otherFirstName ?? c.firstName ?? "";
  const otherLastName  = c.otherLastName  ?? c.lastName  ?? "";
  const otherUsername  = c.otherUsername  ?? c.username  ?? "";
  const otherBio = c.otherBio ?? c.bio ?? c.about ?? "";

  const fallbackName = [otherFirstName, otherLastName].filter(Boolean).join(" ") || otherUsername || L.contact;

  const name = isSaved
    ? L.saved
    : isGroup
      ? (c.name || L.group)
      : fallbackName;

  const lastMessageId = c.lastMessageId ?? c.messageId ?? null;
  const lastMessageAt = c.lastMessageAt ?? c.createdAt ?? c.updatedAt ?? null;
  const lastSenderId  = c.lastMessageSenderId ?? c.senderId ?? null;
  const directStatus = c.directStatus ?? c.direct_status ?? null;
  const directRequestedBy = c.directRequestedBy ?? c.direct_requested_by ?? null;

  let cached = null;

  try {
    const deviceId = getOrCreateDeviceId();

    cached = lastMessageId
      ? loadMessagePreview({
          userId: myId,
          deviceId,
          chatId,
          messageId: lastMessageId,
        })
      : null;
  } catch (_) {}

  const serverPreview = String(c.lastContent || "").trim();
  const normalizedServerPreview = serverPreview === "[encrypted]" ? "" : serverPreview;
  const hasLastMessage = Boolean(lastMessageId);
  const fallbackPreview = hasLastMessage ? L.newMessage : "";
  const resolvedPreview = String(cached?.preview || normalizedServerPreview || fallbackPreview).trim();

  return {
    id: chatId,
    type: isSaved ? "saved" : (isGroup ? "group" : "direct"),

    name,
    username: otherUsername,
    bio: String(otherBio || "").trim(),
    otherUserId: c.otherUserId ?? null,
    directStatus,
    directRequestedBy,
    isRequest: String(directStatus || "").toUpperCase() === "PENDING"
      && String(directRequestedBy || "") !== String(myId || ""),
    colorIdx: Number(chatId || 0) % 7,
    avatarUrl: isSaved ? "preset:saved" : (c.otherAvatarUrl ?? c.avatarUrl ?? null),

    online: Boolean(c.online),
    unread: Number(c.unreadCount ?? c.unread ?? 0),

    time: getTime(cached?.createdAt || lastMessageAt),
    preview: resolvedPreview,

    lastMessageId,
    lastOut: cached ? Boolean(cached.isOut) : Number(lastSenderId) === Number(myId),
    lastMessageAt,

    members: Array.isArray(c.participants) ? c.participants.length : Number(c.members ?? 0),
    groupParticipants: Array.isArray(c.groupParticipants)
      ? c.groupParticipants.map((p) => ({
          ...p,
          role: p?.role || "MEMBER",
          banned: Boolean(p?.banned),
          mutedUntil: p?.mutedUntil || null,
        }))
      : [],
    myRole: c.myRole || null,
    whoCanWrite: c.whoCanWrite || null,
    whoCanEditInfo: c.whoCanEditInfo || null,
    whoCanInvite: c.whoCanInvite || null,
    groupBio: c.groupBio || null,
    isSaved,
  };
};

export const truncatePreview = (text, maxLength = 80) => {
  const safeText = String(text ?? "");

  if (!safeText) return "";

  // If already short enough or already appears truncated, return as is
  if (safeText.length <= maxLength) return safeText;
  if (safeText.endsWith("…") || safeText.endsWith("...")) return safeText;

  const codepoints = Array.from(safeText);

  if (codepoints.length <= maxLength) {
    return safeText;
  }

  const sliced = codepoints.slice(0, maxLength).join("").replace(/\s+$/u, "");

  return `${sliced}…`;
};

export const truncateChatPreview = (text, maxLength = 34) => {
  const safeText = String(text ?? "");

  if (!safeText) return "";

  const codepoints = Array.from(safeText);

  if (codepoints.length <= maxLength) {
    return safeText;
  }

  const sliced = codepoints.slice(0, maxLength).join("").replace(/\s+$/u, "");

  return `${sliced}…`;
};

const WORD_CHAR_RE = /[\p{L}\p{N}_]/u;

function isWordChar(ch) {
  return WORD_CHAR_RE.test(ch);
}

export function findWordStartMatches(text, query) {
  const source = String(text ?? "");
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle || !source) return [];

  const lower = source.toLowerCase();
  const hits = [];
  let from = 0;

  while (from < lower.length) {
    const idx = lower.indexOf(needle, from);
    if (idx === -1) break;

    const prev = idx > 0 ? lower[idx - 1] : "";
    if (idx === 0 || !isWordChar(prev)) {
      hits.push(idx);
    }

    from = idx + 1;
  }

  return hits;
}

export function messageMatchesQuery(msg, query) {
  const text = String(msg?._text || msg?.content || "");
  return findWordStartMatches(text, query).length > 0;
}