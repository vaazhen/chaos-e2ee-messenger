import { API_BASE as _API_BASE } from "./config";
export const API_BASE = _API_BASE;

export const getToken   = () => localStorage.getItem("cm_token") || "";
export const setToken   = (token) => { if (token) localStorage.setItem("cm_token", token); };
export const clearToken = () => { localStorage.removeItem("cm_token"); };

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
      const rt = localStorage.getItem("cm_refresh_token");
      if (!rt) return false;
      const response = await fetch(API_BASE + "/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data?.token) {
        setToken(data.token);
        if (data.refreshToken) localStorage.setItem("cm_refresh_token", data.refreshToken);
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

  refreshToken:   (refreshToken) => call("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  logout:         (refreshToken) => call("/auth/logout",  { method: "POST", body: JSON.stringify({ refreshToken }) }),

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

  // ── Messages ──────────────────────────────────────────────────────────────
  getMessages:    (chatId, before)     => call(`/messages/chat/${chatId}/timeline?limit=50${before ? "&beforeMessageId=" + before : ""}`),
  markRead:       (chatId)             => call(`/messages/chat/${chatId}/read`,      { method: "POST" }),
  markDelivered:  (chatId)             => call(`/messages/chat/${chatId}/delivered`, { method: "POST" }),
  deleteMsg:      (id)                 => call(`/messages/${id}`, { method: "DELETE" }),
  toggleReaction: (id, emoji)          => call(`/messages/${id}/reactions`, { method: "PUT", body: JSON.stringify({ emoji }) }),

  // ── Attachments ──────────────────────────────────────────────────────────
  uploadAttachment: async (encryptedBlob) => {
    const token = getToken();
    const deviceId = getCurrentDeviceId();
    const form = new FormData();
    form.append("file", new Blob([encryptedBlob]), "encrypted.bin");
    const res = await fetch(API_BASE + "/attachments/upload", {
      method: "POST",
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
};