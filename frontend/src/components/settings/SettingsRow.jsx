import { ChevronRightIcon } from "../Icons";

export function SettingsRow({ icon, title, subtitle, danger, disabled, onClick, children }) {
  return (
    <button
      type="button"
      className={`settings-row${danger ? " danger" : ""}${disabled ? " disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {icon && <span className="settings-row-icon">{icon}</span>}
      <span className="settings-row-main">
        <span className="settings-row-title">{title}</span>
        {subtitle && <span className="settings-row-subtitle">{subtitle}</span>}
      </span>
      <span className="settings-row-action">
        {children || (!disabled && <ChevronRightIcon />)}
      </span>
    </button>
  );
}

export function SettingsSection({ title, children }) {
  return (
    <div className="settings-section">
      {title && <div className="settings-section-title">{title}</div>}
      <div className="settings-list">{children}</div>
    </div>
  );
}

export function SettingsToggle({ value, onChange }) {
  return (
    <button
      type="button"
      className={`settings-toggle${value ? " on" : ""}`}
      onClick={() => onChange?.(!value)}
      aria-label="Toggle"
    >
      <span className="settings-toggle-thumb" />
    </button>
  );
}
