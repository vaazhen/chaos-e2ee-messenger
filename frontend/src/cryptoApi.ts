import type { CryptoApi } from "./types/protocol";

export interface CryptoHttpBody {
  message?: string;
  code?: string | number;
  error?: string;
}

export type CryptoHttpError = Error & {
  status: number;
  code?: string | number;
};

export function cryptoHttpError(
  status: number,
  statusText: string,
  body?: CryptoHttpBody | null,
): CryptoHttpError {
  const error = new Error(body?.message || `${status} ${statusText}`) as CryptoHttpError;
  error.status = status;
  if (body?.code !== undefined) error.code = body.code;
  else if (body?.error !== undefined) error.code = body.error;
  return error;
}

type LazyString = string | (() => string);

export interface CreateCryptoApiOptions {
  token?: LazyString;
  deviceId?: LazyString;
  baseUrl?: string;
  credentials?: RequestCredentials;
  extraHeaders?: Record<string, string>;
  headerFactory?: (path: string) => Record<string, string>;
}

function readLazy(value: LazyString | undefined, fallback = ""): string {
  if (typeof value === "function") return value();
  return value ?? fallback;
}

/** HTTP adapter for CryptoEngine. Failures always carry `status` (and optional `code`). */
export function createCryptoApi(options: CreateCryptoApiOptions = {}): CryptoApi {
  const {
    token,
    deviceId,
    baseUrl = "",
    credentials,
    extraHeaders = {},
    headerFactory,
  } = options;

  return async (path, opts = {}) => {
    const resolvedToken = readLazy(token);
    const resolvedDeviceId = readLazy(deviceId);
    const factoryHeaders = headerFactory?.(path) ?? {};
    const init: RequestInit = {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(resolvedToken ? { Authorization: "Bearer " + resolvedToken } : {}),
        ...(resolvedDeviceId ? { "X-Device-Id": resolvedDeviceId } : {}),
        ...extraHeaders,
        ...factoryHeaders,
        ...(opts.headers || {}),
      },
    };
    if (credentials !== undefined) init.credentials = credentials;

    const response = await fetch(baseUrl + path, init);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as CryptoHttpBody;
      throw cryptoHttpError(response.status, response.statusText, body);
    }
    return response.json().catch(() => null);
  };
}
