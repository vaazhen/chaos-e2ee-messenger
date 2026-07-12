function isAbsoluteUrl(value, protocols) {
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol);
  } catch {
    return false;
  }
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
