import { useEffect, useState } from "react";
import Ava from "./Ava";
import DevicesPage from "./DevicesPage";
import BottomNav from "./BottomNav";
import BackupModal from "./BackupModal";
import BrandMark from "./BrandMark";
import { SettingsRow, SettingsSection, SettingsToggle } from "./settings/SettingsRow";
import { FAQ_ITEMS, STATUS_PRESETS } from "./settings/content";
import Sheet from "./ui/Sheet";
import { api, setToken } from "../api";
import { CheckIcon, ChevronRightIcon, DeviceIcon, DownloadIcon, StarIcon,
  SunIcon, GlobeIcon, HelpIcon, InfoIcon, LogoutIcon,
} from "./Icons";

export default function SettingsPage({
  me,
  theme,
  lang,
  l,
  onToggleTheme,
  onSwitchLang,
  onLogout,
  onEditProfile,
  onOpenChat,
  onNavChange,
  unreadTotal = 0,
}) {
  const [page, setPage] = useState("main");
  const [sheet, setSheet] = useState(null);
  const [statusText, setStatusText] = useState(me?.bio || "");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusCustom, setStatusCustom] = useState("");
  const [faqOpen, setFaqOpen] = useState(null);
  const [deviceCount, setDeviceCount] = useState(null);
  const myName = [me?.firstName, me?.lastName].filter(Boolean).join(" ") || me?.username || "User";
  const username = me?.username || "";

  useEffect(() => {
    let cancelled = false;
    api.listDevices()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setDeviceCount(list.filter((d) => d.active !== false).length);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [page]);

  const saveStatus = async (value) => {
    setStatusSaving(true);
    try {
      const updated = await api.updateProfile({
        firstName: me?.firstName || "",
        lastName: me?.lastName || "",
        username: me?.username || "",
        bio: value,
        avatarUrl: me?.avatarUrl || "",
      });
      if (updated?.token) setToken(updated.token);
      setStatusText(value);
      setSheet(null);
    } catch (_) {
      /* keep sheet open */
    } finally {
      setStatusSaving(false);
    }
  };

  const openSaved = async () => {
    try {
      const res = await api.createSaved();
      if (res?.chatId) {
        onOpenChat?.(res.chatId);
        onNavChange?.("chats");
      }
    } catch (_) {
      /* ignore */
    }
  };

  const deviceSubtitle = deviceCount == null
    ? l("активные сессии", "active sessions")
    : l(`${deviceCount} активн.`, `${deviceCount} active`);

  if (page === "devices") {
    return (
      <div className="settings-shell settings-shell--full">
        <DevicesPage l={l} lang={lang} onBack={() => setPage("main")} />
        <BottomNav me={me} myName={myName} activeTab="settings" onNavChange={onNavChange} unreadTotal={unreadTotal} l={l} />
      </div>
    );
  }

  return (
    <div className="settings-shell">
      <header className="settings-header">
        <BrandMark size={28} />
        <div>
          <div className="brand-kicker">Chaos</div>
          <h1 className="settings-title">{l("Параметры", "Settings")}</h1>
        </div>
      </header>

      <div className="settings-scroll">
        <button type="button" className="settings-profile" onClick={() => onEditProfile?.()}>
          <span className="settings-avatar-btn">
            <Ava user={me} name={myName} size="lg" />
          </span>
          <span className="settings-profile-text">
            <span className="settings-name">{myName}</span>
            {username && <span className="settings-username">@{username}</span>}
          </span>
          <span className="settings-row-action"><ChevronRightIcon /></span>
        </button>

        <SettingsSection>
          <SettingsRow
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>}
            title={l("Статус", "Status")}
            subtitle={statusText?.trim() || l("Нажмите, чтобы установить", "Tap to set")}
            onClick={() => setSheet("status")}
          />
          <SettingsRow
            icon={<DeviceIcon />}
            title={l("Устройства", "Devices")}
            subtitle={deviceSubtitle}
            onClick={() => setPage("devices")}
          />
          <SettingsRow
            icon={<DownloadIcon />}
            title={l("Резервное копирование", "Backup")}
            subtitle={l("Экспорт и импорт ключей", "Export and import keys")}
            onClick={() => setSheet("backup")}
          />
          <SettingsRow icon={<StarIcon />} title={l("Избранное", "Saved Messages")} onClick={openSaved} />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow icon={<SunIcon />} title={l("Тема", "Theme")} subtitle={theme === "dark" ? l("Тёмная", "Dark") : l("Светлая", "Light")}>
            <SettingsToggle value={theme === "dark"} onChange={() => onToggleTheme?.()} />
          </SettingsRow>
          <SettingsRow icon={<GlobeIcon />} title={l("Язык", "Language")} subtitle={l("Русский", "English")} onClick={() => onSwitchLang?.()} />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow icon={<HelpIcon />} title={l("Вопросы и возможности", "FAQ")} onClick={() => { setFaqOpen(0); setSheet("faq"); }} />
          <SettingsRow icon={<InfoIcon />} title={l("О мессенджере", "About")} subtitle="v1.0.0" onClick={() => setSheet("about")} />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow icon={<LogoutIcon />} title={l("Выйти", "Log out")} danger onClick={onLogout} />
        </SettingsSection>

        <div className="settings-bottom-spacer" />
      </div>

      <BottomNav me={me} myName={myName} activeTab="settings" onNavChange={onNavChange} unreadTotal={unreadTotal} l={l} />

      <Sheet open={sheet === "status"} onClose={() => setSheet(null)} title={l("Статус", "Status")} className="settings-sheet">
        <div className="settings-sheet-list">
          {STATUS_PRESETS.map((item) => {
            const value = `${item.emoji} ${l(item.label, item.labelEn)}`;
            const selected = statusText === value;
            return (
              <button
                key={item.emoji}
                type="button"
                className={`settings-sheet-row${selected ? " is-on" : ""}`}
                disabled={statusSaving}
                onClick={() => saveStatus(value)}
              >
                <span className="settings-sheet-emoji">{item.emoji}</span>
                <span className="settings-sheet-row-text">{l(item.label, item.labelEn)}</span>
                {selected && <span className="new-chat-pick is-on"><CheckIcon /></span>}
              </button>
            );
          })}
        </div>
        <div className="settings-sheet-custom">
          <input
            className="settings-sheet-input"
            value={statusCustom}
            onChange={(e) => setStatusCustom(e.target.value)}
            placeholder={l("Свой статус", "Custom status")}
            maxLength={160}
          />
          <button
            type="button"
            className="settings-sheet-save"
            disabled={statusSaving || !statusCustom.trim()}
            onClick={() => saveStatus(statusCustom.trim())}
          >
            {l("Сохранить", "Save")}
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === "faq"} onClose={() => setSheet(null)} title={l("Вопросы и возможности", "FAQ & features")} className="settings-sheet">
        <div className="settings-sheet-list">
          {FAQ_ITEMS.map((item, index) => {
            const open = faqOpen === index;
            return (
              <div key={index} className={`settings-faq${open ? " is-open" : ""}`}>
                <button type="button" className="settings-sheet-row" onClick={() => setFaqOpen(open ? null : index)}>
                  <span className="settings-sheet-row-text">{l(item.q, item.qEn)}</span>
                  <span className="settings-faq-caret">{open ? "–" : "+"}</span>
                </button>
                {open && <p className="settings-faq-a">{l(item.a, item.aEn)}</p>}
              </div>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={sheet === "about"} onClose={() => setSheet(null)} title={l("О мессенджере", "About messenger")} className="settings-sheet">
        <div className="settings-about">
          <BrandMark size={56} />
          <b className="settings-about-name">Chaos</b>
          <small>Messenger · 1.0.0</small>
          <p>
            {l(
              "Сквозное шифрование. Открытый текст остаётся на устройствах — сервер видит только ciphertext.",
              "End-to-end encryption. Plaintext stays on devices — the server only sees ciphertext."
            )}
          </p>
        </div>
        <div className="settings-sheet-list">
          <div className="settings-sheet-row is-static">
            <span className="settings-sheet-row-text">Signal protocol</span>
            <small>X3DH + Double Ratchet</small>
          </div>
          <div className="settings-sheet-row is-static">
            <span className="settings-sheet-row-text">{l("Личные и группы", "Direct & groups")}</span>
            <small>E2EE</small>
          </div>
        </div>
      </Sheet>

      <Sheet open={sheet === "backup"} onClose={() => setSheet(null)} title={l("Резервное копирование", "Backup")} className="settings-sheet">
        <BackupModal lang={lang} theme={theme} onClose={() => setSheet(null)} noWrapper />
      </Sheet>
    </div>
  );
}
