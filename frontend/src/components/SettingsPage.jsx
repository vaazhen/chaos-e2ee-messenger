import { useState } from "react";
import Ava from "./Ava";
import DevicesPage from "./DevicesPage";
import { SettingsRow, SettingsSection, SettingsToggle } from "./settings/SettingsRow";
import { DeviceIcon, DownloadIcon, StarIcon, FolderIcon, BellIcon, DatabaseIcon, SunIcon, GlobeIcon, HelpIcon, InfoIcon, LogoutIcon, PhoneIcon } from "./Icons";

/**
 * Full settings screen with profile block, themed sections (calls, system, chats,
 * notifications, data, appearance, language, support), theme toggle, and logout.
 * Sub-navigates to DevicesPage internally.
 */
export default function SettingsPage({ me, theme, l, onToggleTheme, onLogout, onEditProfile }) {
  const [page, setPage] = useState("main");
  const myName = [me?.firstName, me?.lastName].filter(Boolean).join(" ") || me?.username || "User";
  const username = me?.username || "";

  if (page === "devices") {
    return (
      <div className="settings-shell settings-shell--full">
        <DevicesPage l={l} onBack={() => setPage("main")} />
      </div>
    );
  }

  return (
    <div className="settings-shell">
      <header className="settings-header">
        <div className="settings-header-spacer" />
        <h1 className="settings-title">{l("Параметры", "Settings")}</h1>
        <div className="settings-header-spacer" />
      </header>

      <div className="settings-scroll">
        <div className="settings-profile">
          <button type="button" className="settings-avatar-btn" onClick={() => onEditProfile?.()}>
            <Ava user={me} name={myName} size="xl" />
          </button>
          <div className="settings-name">{myName}</div>
          {username && <div className="settings-username">@{username}</div>}
        </div>

        <SettingsSection>
          <SettingsRow
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>}
            title={l("Статус", "Status")}
            subtitle={l("Нажмите, чтобы установить", "Tap to set")}
          />
        </SettingsSection>

        <SettingsSection title={l("Звонки", "Calls")}>
          <SettingsRow icon={<PhoneIcon />} title={l("Недавние звонки", "Recent calls")} subtitle={l("скоро", "soon")} disabled />
        </SettingsSection>

        <SettingsSection title={l("Система", "System")}>
          <SettingsRow icon={<DeviceIcon />} title={l("Устройства", "Devices")} subtitle={l("загрузить", "load")} onClick={() => setPage("devices")} />
          <SettingsRow icon={<DownloadIcon />} title={l("Резервное копирование", "Backup")} subtitle={l("экспорт и импорт", "export / import")} disabled />
        </SettingsSection>

        <SettingsSection title={l("Чаты", "Chats")}>
          <SettingsRow icon={<StarIcon />} title={l("Избранное", "Saved Messages")} subtitle={l("ваши заметки", "your notes")} />
          <SettingsRow icon={<FolderIcon />} title={l("Папки с чатами", "Chat folders")} subtitle={l("скоро", "soon")} disabled />
        </SettingsSection>

        <SettingsSection title={l("Уведомления", "Notifications")}>
          <SettingsRow icon={<BellIcon />} title={l("Уведомления и звуки", "Notifications & sounds")} subtitle={l("скоро", "soon")} disabled />
        </SettingsSection>

        <SettingsSection title={l("Данные", "Data")}>
          <SettingsRow icon={<DatabaseIcon />} title={l("Данные и память", "Data & storage")} subtitle={l("скоро", "soon")} disabled />
        </SettingsSection>

        <SettingsSection title={l("Оформление", "Appearance")}>
          <SettingsRow icon={<SunIcon />} title={l("Тема", "Theme")} subtitle={theme === "dark" ? l("Тёмная", "Dark") : l("Светлая", "Light")}>
            <SettingsToggle value={theme === "dark"} onChange={() => onToggleTheme?.()} />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title={l("Язык", "Language")}>
          <SettingsRow icon={<GlobeIcon />} title={l("Язык", "Language")} subtitle={l("Русский", "English")} />
        </SettingsSection>

        <SettingsSection title={l("Помощь", "Support")}>
          <SettingsRow icon={<HelpIcon />} title={l("Вопросы и возможности", "FAQ")} subtitle={l("ответы на частые вопросы", "frequently asked questions")} />
          <SettingsRow icon={<InfoIcon />} title={l("О мессенджере", "About")} subtitle="v1.0" />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow icon={<LogoutIcon />} title={l("Выйти", "Log out")} danger onClick={onLogout} />
        </SettingsSection>

        <div className="settings-bottom-spacer" />
      </div>
    </div>
  );
}
