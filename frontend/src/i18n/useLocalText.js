import { useEffect, useState } from "react";

function normalizeLang(value) {
  return String(value || "").toLowerCase().startsWith("ru") ? "ru" : "en";
}

function readLang() {
  const saved = localStorage.getItem("cm_lang");
  if (saved) return normalizeLang(saved);

  const browser = navigator.language || navigator.userLanguage || "en";
  return normalizeLang(browser);
}

export default function useLocalText() {
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    const update = () => setLang(readLang());

    window.addEventListener("cm_language_changed", update);
    window.addEventListener("storage", update);

    return () => {
      window.removeEventListener("cm_language_changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return {
    lang,
    isRu: lang === "ru",
    t: (ru, en) => (lang === "ru" ? ru : en),
  };
}
