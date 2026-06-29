import { computeSafetyNumber, formatSafetyNumber } from "../safety-number";
import { api } from "../api";

export default function ChatInfoPanel({ chat, chatBg, auth, setSafetyModal, onChangeBg, onClose, onOpenSearch, lang, panelRef }) {
  const effectiveLang = String(lang || "ru").toLowerCase().startsWith("en") ? "en" : "ru";
  const l = (ru, en) => (effectiveLang === "ru" ? ru : en);

  const backgrounds = [
    { key: "clean",  label: l("Чистый", "Clean") },
    { key: "soft",   label: l("Мягкий", "Soft") },
    { key: "grid",   label: l("Сетка", "Grid") },
    { key: "paper",  label: l("Бумага", "Paper") },
  ];

  return (
    <div ref={panelRef} className="chat-tools-panel" onClick={e => e.stopPropagation()}>
      <div className="chat-tools-head">
        <div>
          <b>{l("Настройки чата", "Chat settings")}</b>
          <span>{chat?.name}</span>
        </div>

        <button
          type="button"
          className="chat-tools-close"
          onClick={onClose}
          title={l("Закрыть", "Close")}
          aria-label={l("Закрыть", "Close")}
        >
          ×
        </button>
      </div>

      <button type="button" className="tool-row" onClick={onOpenSearch}>
        <span className="tool-icon tool-icon-search" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16.2 16.2L21 21" />
          </svg>
        </span>
        <b>{l("Поиск сообщений", "Search messages")}</b>
        <i>›</i>
      </button>

      <div className="tool-card">
        <div className="tool-title">{l("Фон переписки", "Chat background")}</div>

        <div className="bg-picker">
          {backgrounds.map(item => (
            <button
              key={item.key}
              type="button"
              className={`bg-option bg-${item.key}${chatBg === item.key ? " active" : ""}`}
              onClick={() => onChangeBg(item.key)}
            >
              <span />
              <b>{item.label}</b>
            </button>
          ))}
        </div>
      </div>

      <div className="tool-card">
        <div className="tool-title">{l("Безопасность", "Security")}</div>
        <div className="tool-note">
          {l(
            "Сервер хранит только зашифрованные конверты. Сообщения расшифровываются на устройстве.",
            "The server stores only encrypted envelopes. Messages are decrypted on device."
          )}
        </div>

        <button
          type="button"
          className="tool-row"
          onClick={async () => {
            try {
              const devices = await api.resolveDevicesForSafetyNumber(chat.id);
              const ownIdentityKey = window.e2ee?.getIdentityPublicKey();
              if (!ownIdentityKey) throw new Error("No identity key");

              const theirDevice = devices?.devices?.find(d => d.userId !== auth.me?.id) || devices?.devices?.[0];
              if (!theirDevice?.identityPublicKey) throw new Error("No identity key for this chat");

              const fingerprint = await computeSafetyNumber(ownIdentityKey, theirDevice.identityPublicKey);
              const display = formatSafetyNumber(fingerprint);
              setSafetyModal({ open: true, fingerprint, display, error: null });
            } catch (e) {
              setSafetyModal({ open: true, fingerprint: null, display: null, error: e.message });
            }
          }}
        >
          <span className="tool-icon" aria-hidden="true">🔐</span>
          <b>{l("Проверить Safety Number", "Verify Safety Number")}</b>
          <i>›</i>
        </button>
      </div>

      <button type="button" className="tool-row disabled" disabled>
        <span className="tool-icon tool-icon-files" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M7 7.5h8.5a2.5 2.5 0 0 1 2.5 2.5v7.5A2.5 2.5 0 0 1 15.5 20H7a2.5 2.5 0 0 1-2.5-2.5V10A2.5 2.5 0 0 1 7 7.5Z" />
            <path d="M8.5 4h8A2.5 2.5 0 0 1 19 6.5v8" />
          </svg>
        </span>
        <b>{l("Медиа и файлы", "Media & files")}</b>
        <em>{l("позже", "coming soon")}</em>
      </button>

    </div>
  );
}