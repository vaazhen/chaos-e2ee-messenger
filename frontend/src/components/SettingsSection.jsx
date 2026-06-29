export default function SettingsSection({ l, theme, onToggleTheme, effectiveLang, onSwitchLang }) {
  return (
    <>
      <div className="profile-section-title profile-section-title--first">{l("Приложение", "App")}</div>

      <div className="profile-card">
        <button type="button" className="profile-row" onClick={onToggleTheme}>
          <span className="profile-row-icon">{theme === "dark" ? "☾" : "☀"}</span>
          <span className="profile-row-main">
            <b>{l("Оформление", "Appearance")}</b>
            <small>{theme === "dark" ? l("Тёмная тема", "Dark theme") : l("Светлая тема", "Light theme")}</small>
          </span>
          <i>›</i>
        </button>

        <button type="button" className="profile-row" onClick={onSwitchLang}>
          <span className="profile-row-icon">文</span>
          <span className="profile-row-main">
            <b>{l("Язык", "Language")}</b>
            <small>{effectiveLang === "ru" ? l("Русский", "Russian") : "English"}</small>
          </span>
          <i>›</i>
        </button>
      </div>
    </>
  );
}