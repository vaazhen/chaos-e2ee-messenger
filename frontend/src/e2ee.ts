import type { CryptoEngine } from "./types/protocol";

/**
 * Runtime seam for the crypto engine.
 *
 * The engine is a module (`crypto-engine.ts` exports `e2ee`).
 * Callers go through `getE2ee()` so tests can stub `window.e2ee` without
 * loading WebCrypto, and production still sees the same object the module bound.
 */
export function getE2ee(): CryptoEngine | null {
  if (typeof globalThis !== "undefined" && "e2ee" in globalThis) {
    return (globalThis as typeof globalThis & { e2ee?: CryptoEngine }).e2ee ?? null;
  }
  return null;
}
