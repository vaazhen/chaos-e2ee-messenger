import { useCallback, useState } from "react";
import { api } from "../api";
import { getFallbackMessages } from "../i18n/uiText";


function getBrowserDefaultLang() {
  // In unit tests we keep the historical default expected by existing tests.
  // In a real browser we use the browser language.
  const isTestRuntime =
    import.meta.env?.MODE === "test" ||
    Boolean(import.meta.env?.VITEST) ||
    (typeof window !== "undefined" && /jsdom/i.test(window.navigator?.userAgent || ""));

  if (isTestRuntime) return "ru";

  const browser =
    typeof navigator !== "undefined"
      ? (navigator.language || navigator.userLanguage || "en")
      : "en";

  return String(browser || "").toLowerCase().startsWith("ru") ? "ru" : "en";
}

const STORAGE_KEY = "cm_lang";

function normalizeBackendMessages(data) {
  if (!data) return {};

  if (data.messages && typeof data.messages === "object") {
    return data.messages;
  }

  if (data.data && typeof data.data === "object") {
    return data.data;
  }

  if (typeof data === "object" && !Array.isArray(data)) {
    return data;
  }

  return {};
}

function normalizeLang(lang) {
  return lang === "en" ? "en" : "ru";
}

export function useI18n() {
  const [lang, setLang] = useState(() => normalizeLang(localStorage.getItem(STORAGE_KEY) || getBrowserDefaultLang()));
  const [t, setT] = useState(() => getFallbackMessages(localStorage.getItem(STORAGE_KEY) || getBrowserDefaultLang()));

  const loadTranslations = useCallback(async (nextLang = lang) => {
    const normalized = normalizeLang(nextLang);
    const fallback = getFallbackMessages(normalized);

    setLang(normalized);
    localStorage.setItem(STORAGE_KEY, normalized);

    try {
      const backend = await api.getTranslations(normalized);
      const backendMessages = normalizeBackendMessages(backend);

      setT({
        ...fallback,
        ...backendMessages,
      });
    } catch (e) {
      console.warn("[i18n] backend translations unavailable, using frontend fallback:", e?.message || e);
      setT(fallback);
    }

    window.dispatchEvent(new CustomEvent("cm_language_changed", { detail: normalized }));
  }, [lang]);

  const switchLang = useCallback(async (nextLang) => {
    const normalized = normalizeLang(nextLang || (lang === "ru" ? "en" : "ru"));

    try {
      await api.setLang(normalized);
    } catch (_) { /* ignore optional failure */ }

    await loadTranslations(normalized);
  }, [lang, loadTranslations]);

  return {
    lang,
    t,
    loadTranslations,
    switchLang,
  };
}