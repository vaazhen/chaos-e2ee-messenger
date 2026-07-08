import { ChevronLeftIcon, DeviceIcon } from "./Icons";

/**
 * Inline sub-page within Settings flow. Lists connected devices with
 * status badges (Current/Off) and back navigation.
 */
export default function DevicesPage({ l, onBack }) {
  const devices = [
    { id: 1, name: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 YaBrowser/26.4.0.0 Safari/537.36", date: l("Был(а) 01.07.2026", "Last seen 01.07.2026"), current: true },
    { id: 2, name: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36", date: l("Был(а) 24.06.2026", "Last seen 24.06.2026"), current: false },
  ];

  return (
    <div className="devices-page">
      <header className="settings-header">
        <button className="sidebar-action-btn" onClick={onBack} title={l("Назад", "Back")}><ChevronLeftIcon /></button>
        <h1 className="settings-title">{l("Устройства", "Devices")}</h1>
        <div className="settings-header-spacer" style={{ width: 40 }} />
      </header>

      <div className="settings-scroll">
        <div className="devices-info-card">
          {l(
            "Управляйте устройствами, подключёнными к вашему аккаунту. Вы можете отключить любое устройство — после этого оно потеряет доступ к вашим чатам.",
            "Manage devices connected to your account. You can disconnect any device — after that it will lose access to your chats."
          )}
        </div>

        <div className="devices-list-card">
          {devices.map(d => (
            <div key={d.id} className="device-row">
              <span className="device-icon"><DeviceIcon /></span>
              <div className="device-main">
                <span className="device-title">{d.name}</span>
                <span className="device-subtitle">{d.date}</span>
              </div>
              <span className={`device-badge${d.current ? " current" : " disabled"}`}>
                {d.current ? l("Текущее", "Current") : l("Откл.", "Off")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
