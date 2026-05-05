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

export async function call(path, opts = {}) {
  const token    = getToken();
  const deviceId = getCurrentDeviceId();

  const response = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token    ? { Authorization: "Bearer " + token } : {}),
      ...(deviceId ? { "X-Device-Id": deviceId }          : {}),
      ...(opts.headers || {}),
    },
  });

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
  getRequests:    ()                   => call("/chats/requests"),
  createSaved:    ()                   => call("/chats/saved", { method: "POST" }),
  createDirect:   (username)           => call(`/chats/direct/by-username?username=${encodeURIComponent(username)}`, { method: "POST" }),
  createGroup:    (name, members)      => call("/chats/group", { method: "POST", body: JSON.stringify({ name, memberIds: members }) }),
  inviteGroupParticipants: (chatId, userIds) =>
    call(`/chats/${chatId}/group/participants`, { method: "POST", body: JSON.stringify({ userIds }) }),
  patchGroupSettings: (chatId, payload) =>
    call(`/chats/${chatId}/group/settings`, { method: "PATCH", body: JSON.stringify(payload || {}) }),
  patchParticipantRole: (chatId, participantUserId, role) =>
    call(`/chats/${chatId}/group/participants/${participantUserId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  patchGroupPermissions: (chatId, payload) =>
    call(`/chats/${chatId}/group/permissions`, { method: "PATCH", body: JSON.stringify(payload || {}) }),
  removeGroupParticipant: (chatId, participantUserId) =>
    call(`/chats/${chatId}/group/participants/${participantUserId}`, { method: "DELETE" }),
  muteGroupParticipant: (chatId, participantUserId, minutes) =>
    call(`/chats/${chatId}/group/participants/${participantUserId}/mute?minutes=${encodeURIComponent(minutes)}`, { method: "POST" }),
  unmuteGroupParticipant: (chatId, participantUserId) =>
    call(`/chats/${chatId}/group/participants/${participantUserId}/mute`, { method: "DELETE" }),
  banGroupParticipant: (chatId, participantUserId, reason = "") =>
    call(`/chats/${chatId}/group/participants/${participantUserId}/ban?reason=${encodeURIComponent(reason)}`, { method: "POST" }),
  unbanGroupParticipant: (chatId, participantUserId) =>
    call(`/chats/${chatId}/group/participants/${participantUserId}/ban`, { method: "DELETE" }),
  deleteGroup: (chatId) => call(`/chats/${chatId}/group`, { method: "DELETE" }),
  acceptRequest:  (chatId)             => call(`/chats/${chatId}/requests/accept`, { method: "POST" }),
  declineRequest: (chatId)             => call(`/chats/${chatId}/requests/decline`, { method: "POST" }),

  // ── Messages ──────────────────────────────────────────────────────────────
  getMessages:    (chatId, before)     => call(`/messages/chat/${chatId}/timeline?limit=50${before ? "&beforeMessageId=" + before : ""}`),
  markRead:       (chatId)             => call(`/messages/chat/${chatId}/read`,      { method: "POST" }),
  markDelivered:  (chatId)             => call(`/messages/chat/${chatId}/delivered`, { method: "POST" }),
  deleteMsg:      (id)                 => call(`/messages/${id}`, { method: "DELETE" }),
  toggleReaction: (id, emoji)          => call(`/messages/${id}/reactions`, { method: "PUT", body: JSON.stringify({ emoji }) }),

  // ── i18n ──────────────────────────────────────────────────────────────────
  getTranslations: (lang) => call(`/v1/i18n/messages?lang=${encodeURIComponent(lang)}`),
  setLang:         (lang) => call(`/v1/i18n/lang?lang=${encodeURIComponent(lang)}`, { method: "POST" }),
};