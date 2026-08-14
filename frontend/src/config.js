function isAbsoluteUrl(value, protocols) {
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol);
  } catch {
    return false;
  }
}

export function toStompBrokerUrl(wsUrl, location = globalThis.location) {
  const resolved = wsUrl || "/ws";
  if (resolved.startsWith("ws://") || resolved.startsWith("wss://")) {
    return resolved;
  }
  if (resolved.startsWith("http://")) {
    return `ws://${resolved.slice("http://".length)}`;
  }
  if (resolved.startsWith("https://")) {
    return `wss://${resolved.slice("https://".length)}`;
  }
  const protocol = location?.protocol === "https:" ? "wss:" : "ws:";
  const host = location?.host || "localhost";
  const path = resolved.startsWith("/") ? resolved : `/${resolved}`;
  return `${protocol}//${host}${path}`;
}

export function resolveRuntimeEndpoints({
  apiBase,
  wsUrl,
  isElectron = false,
  isProduction = false,
} = {}) {
  const resolvedApi = apiBase || '/api';
  const resolvedWs = wsUrl || '/ws';

  if (isElectron && isProduction) {
    if (!isAbsoluteUrl(resolvedApi, ['https:'])) {
      throw new Error('Packaged Electron requires an absolute HTTPS VITE_API_BASE');
    }
    if (!isAbsoluteUrl(resolvedWs, ['wss:'])) {
      throw new Error('Packaged Electron requires an absolute WSS VITE_WS_URL');
    }
  }

  return { apiBase: resolvedApi, wsUrl: resolvedWs };
}

const runtime = resolveRuntimeEndpoints({
  apiBase: import.meta.env.VITE_API_BASE,
  wsUrl: import.meta.env.VITE_WS_URL,
  isElectron: Boolean(globalThis.window?.electronAPI?.isElectron),
  isProduction: import.meta.env.PROD,
});

export const API_BASE = runtime.apiBase;
export const WS_URL = runtime.wsUrl;

export function resolveCallsEnabled({ isDev = false, viteFlag } = {}) {
  return Boolean(isDev) || viteFlag === "true";
}

export const CALLS_ENABLED = resolveCallsEnabled({
  isDev: import.meta.env.DEV,
  viteFlag: import.meta.env.VITE_CALLS_ENABLED,
});

export function resolveIceServers({
  stunUrl = "stun:stun.l.google.com:19302",
  turnUrls,
  turnUsername,
  turnCredential,
} = {}) {
  const servers = [{ urls: stunUrl }];
  const urls = Array.isArray(turnUrls) ? turnUrls.filter(Boolean) : [];
  if (urls.length && turnUsername && turnCredential) {
    servers.push({ urls, username: turnUsername, credential: turnCredential });
  }
  return servers;
}

// Local coturn from backend/docker-compose.dev.yml. Without it two browsers
// on the same Mac often never get an ICE pair (Safari mDNS + STUN hairpin).
export const ICE_SERVERS = resolveIceServers({
  turnUrls: import.meta.env.DEV
    ? ["turn:127.0.0.1:3478", "turn:127.0.0.1:3478?transport=tcp"]
    : undefined,
  turnUsername: import.meta.env.DEV ? "chaos" : undefined,
  turnCredential: import.meta.env.DEV ? "chaos" : undefined,
});
