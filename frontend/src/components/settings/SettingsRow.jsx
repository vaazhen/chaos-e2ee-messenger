import { ChevronRightIcon } from "../Icons";

function RowContent({ icon, title, subtitle, disabled, children }) {
  return (
    <>
      {icon && <span className="settings-row-icon">{icon}</span>}
      <span className="settings-row-main">
        <span className="settings-row-title">{title}</span>
        {subtitle && <span className="settings-row-subtitle">{subtitle}</span>}
      </span>
      <span className="settings-row-action">
        {children || (!disabled && <ChevronRightIcon />)}
      </span>
    </>
  );
}

export function SettingsRow({ icon, title, subtitle, danger, disabled, onClick, children }) {
  const className = `settings-row${danger ? " danger" : ""}${disabled ? " disabled" : ""}`;

  if (children) {
    const activate = disabled ? undefined : onClick;
    return (
      <div
        className={className}
        role={activate ? "button" : undefined}
        tabIndex={activate ? 0 : undefined}
        aria-disabled={disabled || undefined}
        onClick={activate}
        onKeyDown={activate ? (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        } : undefined}
      >
        <RowContent icon={icon} title={title} subtitle={subtitle} disabled={disabled}>
          {children}
        </RowContent>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <RowContent icon={icon} title={title} subtitle={subtitle} disabled={disabled} />
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
      onClick={(event) => {
        event.stopPropagation();
        onChange?.(!value);
      }}
      role="switch"
      aria-checked={Boolean(value)}
      aria-label="Toggle"
    >
      <span className="settings-toggle-thumb" />
    </button>
  );
}
