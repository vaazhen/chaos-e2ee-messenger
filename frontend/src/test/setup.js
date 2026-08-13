import "@testing-library/jest-dom";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/motion.css";
import "../styles/primitives.css";
import "../styles/screens/auth.css";
import "../styles/screens/shell.css";
import "../styles/screens/chat.css";
import "../styles/screens/profile.css";
import "../styles/screens/settings.css";
import "../styles/responsive.css";
import { webcrypto } from "node:crypto";
import { TextEncoder, TextDecoder } from "node:util";
import { vi } from "vitest";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

if (!globalThis.TextEncoder) {
  Object.defineProperty(globalThis, "TextEncoder", {
    value: TextEncoder,
    configurable: true,
  });
}

if (!globalThis.TextDecoder) {
  Object.defineProperty(globalThis, "TextDecoder", {
    value: TextDecoder,
    configurable: true,
  });
}

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => "blob:test";
}

if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = () => {};
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (typeof Element.prototype.scrollTo !== "function") {
  Element.prototype.scrollTo = vi.fn();
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});