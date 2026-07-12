import { API_BASE as _API_BASE } from "./config";
export const API_BASE = _API_BASE;

let accessToken = "";

// Remove credentials left by earlier releases. Access tokens are memory-only;
// the HttpOnly refresh cookie restores the session after a reload.
try {
  sessionStorage.removeItem("cm_token");
  localStorage.removeItem("cm_token");
  localStorage.removeItem("cm_refresh_token");
} catch (_) { /* storage may be unavailable in hardened browser contexts */ }

export const getToken = () => accessToken;
export const setToken = (token) => {
  accessToken = token || "";
};
export const clearToken = () => {
  accessToken = "";
  try {
    sessionStorage.removeItem("cm_token");
    localStorage.removeItem("cm_token");
    localStorage.removeItem("cm_refresh_token");
  } catch (_) { /* ignore unavailable storage */ }
};

function safeUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getCurrentDeviceId() {
  if (window.e2ee?.getOrCreateDeviceId) {
    return window.e2ee.getOrCreateDeviceId();
  }
  // Fallback — unscoped key (matches deviceId.js and crypto-engine.js)
  const DEVICE_ID_KEY = "cm_device_id";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = "device-" + safeUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

let _refreshPromise = null;

async function tryAutoRefresh() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const response = await fetch(API_BASE + "/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data?.token) {
        setToken(data.token);
        return true;
      }
      return false;
    } catch { return false; }
    finally { _refreshPromise = null; }
  })();
  return _refreshPromise;
}

export async function call(path, opts = {}) {
  const token    = getToken();
  const deviceId = getCurrentDeviceId();

  let response = await fetch(API_BASE + path, {
    credentials: "include",
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token    ? { Authorization: "Bearer " + token } : {}),
      ...(deviceId ? { "X-Device-Id": deviceId }          : {}),
      ...(opts.headers || {}),
    },
  });

  // Auto-refresh on 401 (skip refresh endpoint itself to avoid loop)
  if (response.status === 401 && !path.includes("/auth/refresh") && !path.includes("/auth/login")) {
    const refreshed = await tryAutoRefresh();
    if (refreshed) {
      const newToken = getToken();
      response = await fetch(API_BASE + path, {
        credentials: "include",
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...(newToken ? { Authorization: "Bearer " + newToken } : {}),
          ...(deviceId ? { "X-Device-Id": deviceId }             : {}),
          ...(opts.headers || {}),
        },
      });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || `${response.status} ${response.statusText}`);
  }

  return response.json().catch(() => null);
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  sendPhone:      (phone)         => call("/auth/send-code",    { method: "POST", body: JSON.stringify({ phone, via: "sms" }) }),
  verifyOtp:      (phone, code)   => call("/auth/verify-code",  { method: "POST", body: JSON.stringify({ phone, code }) }),
  completeSetup:  (setupToken, data) => call("/auth/complete-setup", { method: "POST", body: JSON.stringify({ setupToken, ...data }) }),
  usernameAvailable: (username) => call(`/auth/username-available?username=${encodeURIComponent(username)}`),

  registerEmail:  (email, password) => call("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  loginEmail:     (email, password) => call("/auth/login",    { method: "POST", body: JSON.stringify({ email, password }) }),

  refreshToken:   () => call("/auth/refresh", { method: "POST" }),
  logout:         () => call("/auth/logout",  { method: "POST" }),

  // ── Profile ───────────────────────────────────────────────────────────────
  getMe:          ()     => call("/users/me"),
  getProfile:     ()     => call("/users/profile"),
  updateProfile:  (data) => call("/users/profile", { method: "PUT", body: JSON.stringify(data) }),

  // ── Devices ───────────────────────────────────────────────────────────────
  listDevices:      ()                          => call("/crypto/devices/my"),
  deactivateDevice: (id, confirmLastDevice = false) => call(`/crypto/devices/${id}/deactivate?confirmLastDevice=${Boolean(confirmLastDevice)}`, { method: "POST" }),

  // ── Users ─────────────────────────────────────────────────────────────────
  searchUsers:    (q) => call(`/users/search?q=${encodeURIComponent(q)}`),

  // ── Chats ─────────────────────────────────────────────────────────────────
  getChats:       ()                   => call("/chats/my"),
  createSaved:    ()                   => call("/chats/saved", { method: "POST" }),
  createDirect:   (username)           => call(`/chats/direct/by-username?username=${encodeURIComponent(username)}`, { method: "POST" }),
  createGroup:    (name, members)      => call("/chats/group", { method: "POST", body: JSON.stringify({ name, memberIds: members }) }),

  // ── Realtime recovery ────────────────────────────────────────────────────
  syncRealtime:   (after = 0, limit = 200) =>
    call(`/realtime/sync?after=${encodeURIComponent(Math.max(0, Number(after) || 0))}&limit=${encodeURIComponent(limit)}`),

  // ── Messages ──────────────────────────────────────────────────────────────
  getMessages:    (chatId, before)     => call(`/messages/chat/${chatId}/timeline?limit=50${before ? "&beforeMessageId=" + before : ""}`),
  markRead:       (chatId)             => call(`/messages/chat/${chatId}/read`,      { method: "POST" }),
  markDelivered:  (chatId)             => call(`/messages/chat/${chatId}/delivered`, { method: "POST" }),
  deleteMsg:      (id)                 => call(`/messages/${id}`, { method: "DELETE" }),
  toggleReaction: (id, emoji)          => call(`/messages/${id}/reactions`, { method: "PUT", body: JSON.stringify({ emoji }) }),

  // ── Attachments ──────────────────────────────────────────────────────────
  uploadAttachment: async (encryptedBlob, chatId = null) => {
    const token = getToken();
    const deviceId = getCurrentDeviceId();
    const form = new FormData();
    form.append("file", new Blob([encryptedBlob]), "encrypted.bin");
    if (chatId !== null && chatId !== undefined) form.append("chatId", String(chatId));
    const res = await fetch(API_BASE + "/attachments/upload", {
      method: "POST",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(deviceId ? { "X-Device-Id": deviceId } : {}),
      },
      body: form,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
  downloadAttachment: async (attachmentId) => {
    const token = getToken();
    const deviceId = getCurrentDeviceId();
    const res = await fetch(API_BASE + "/attachments/" + attachmentId, {
      credentials: "include",
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(deviceId ? { "X-Device-Id": deviceId } : {}),
      },
    });
    if (!res.ok) throw new Error("Download failed");
    return res.arrayBuffer();
  },

  // ── Push Notifications ──────────────────────────────────────────────────
  subscribePush: (subscription) => call("/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }),
  unsubscribePush: () => call("/push/unsubscribe", { method: "DELETE" }),
  getVapidKey: async () => {
    const token = getToken();
    const deviceId = getCurrentDeviceId();
    const res = await fetch(API_BASE + "/push/vapid-public-key", {
      credentials: "include",
      headers: {
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(deviceId ? { "X-Device-Id": deviceId } : {}),
      },
    });
    if (!res.ok) return null;
    return res.text();
  },

  // ── Delete Chat ─────────────────────────────────────────────────────────
  deleteChatForEveryone: (chatId) => call(`/chats/${chatId}`, { method: "DELETE" }),

  // ── i18n ──────────────────────────────────────────────────────────────────
  getTranslations: (lang) => call(`/v1/i18n/messages?lang=${encodeURIComponent(lang)}`),
  setLang:         (lang) => call(`/v1/i18n/lang?lang=${encodeURIComponent(lang)}`, { method: "POST" }),

  // ── E2EE Backup ──────────────────────────────────────────────────────────
  getBackupInfo:   ()     => call("/backup/info"),
  exportBackup:    async (passphrase) => {
    const token = getToken();
    const deviceId = getCurrentDeviceId();
    const res = await fetch(API_BASE + "/backup/export", {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Backup-Passphrase": passphrase,
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(deviceId ? { "X-Device-Id": deviceId } : {}),
      },
    });
    if (!res.ok) throw new Error("Backup export failed");
    return res.json();
  },
  importBackup:    (data) => call("/backup/import", { method: "POST", body: JSON.stringify(data) }),

  // ── Safety Numbers ───────────────────────────────────────────────────────
  resolveDevicesForSafetyNumber: (chatId) => call(`/crypto/resolve-chat-devices/${chatId}`, { method: "POST" }),
};