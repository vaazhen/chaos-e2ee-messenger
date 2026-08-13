import { useEffect, useMemo, useState } from "react";
import { api, getCurrentDeviceId } from "../api";
import { ChevronLeftIcon, DeviceIcon, RefreshIcon } from "./Icons";

function formatDate(value, lang = "ru") {
  const isEn = String(lang || "ru").toLowerCase().startsWith("en");
  if (!value) return isEn ? "No activity" : "Нет активности";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return isEn ? "No activity" : "Нет активности";
  return date.toLocaleString(isEn ? "en-US" : "ru-RU", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function prettyDeviceName(device, lang = "ru") {
  const isEn = String(lang || "ru").toLowerCase().startsWith("en");
  const raw = String(device?.deviceName || "").trim();
  if (raw && !raw.startsWith("Mozilla/")) return raw;

  const ua = raw || String(device?.userAgent || "");
  const browser = /YaBrowser/i.test(ua) ? "Yandex"
    : /Edg\//i.test(ua) ? "Edge"
    : /Chrome/i.test(ua) ? "Chrome"
    : /Firefox/i.test(ua) ? "Firefox"
    : /Safari/i.test(ua) ? "Safari"
    : null;
  const os = /Windows/i.test(ua) ? "Windows"
    : /Mac OS|Macintosh/i.test(ua) ? "macOS"
    : /Android/i.test(ua) ? "Android"
    : /iPhone|iPad/i.test(ua) ? "iOS"
    : /Linux/i.test(ua) ? "Linux"
    : null;
  if (browser && os) return `${browser} · ${os}`;
  if (browser) return browser;
  if (os) return os;

  const id = device?.deviceId || "";
  if (id.startsWith("device-")) return `${isEn ? "Browser" : "Браузер"} ${id.slice(7, 15)}`;
  if (id) return `${isEn ? "Device" : "Устройство"} ${id.slice(0, 8)}`;
  return isEn ? "Device" : "Устройство";
}

export default function DevicesPage({ l, lang = "ru", onBack }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const currentDeviceId = useMemo(() => {
    try { return getCurrentDeviceId(); } catch { return ""; }
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch (e) {
      setDevices([]);
      setError(e?.message || l("Не удалось загрузить устройства", "Failed to load devices"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDevices(); }, []);

  const deactivate = async (device) => {
    if (!device?.id) return;
    setBusyId(device.id);
    setError("");
    try {
      await api.deactivateDevice(device.id, false);
      setConfirmId(null);
      setOpenId(null);
      await loadDevices();
    } catch (e) {
      const message = e?.message || "";
      setError(
        message.toLowerCase().includes("last active device")
          ? l("Нельзя отключить последнее активное устройство.", "Cannot disable the last active device.")
          : (message || l("Не удалось отключить устройство", "Failed to disable device"))
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="devices-page">
      <header className="settings-header">
        <button className="sidebar-action-btn" onClick={onBack} title={l("Назад", "Back")}>
          <ChevronLeftIcon />
        </button>
        <h1 className="settings-title">{l("Устройства", "Devices")}</h1>
        <button
          type="button"
          className="sidebar-action-btn"
          onClick={loadDevices}
          disabled={loading}
          title={l("Обновить", "Refresh")}
        >
          <RefreshIcon />
        </button>
      </header>

      <div className="settings-scroll">
        <p className="devices-lead">
          {l(
            "Сессии, у которых есть доступ к вашим чатам. Нажмите на устройство, чтобы увидеть детали или отключить его.",
            "Sessions that can access your chats. Tap a device to see details or revoke access."
          )}
        </p>

        {error && <div className="settings-banner settings-banner--error">{error}</div>}

        {loading ? (
          <div className="new-chat-loading"><div className="spinner" /></div>
        ) : devices.length === 0 ? (
          <div className="new-chat-empty">
            <div className="new-chat-empty-title">{l("Устройств пока нет", "No devices yet")}</div>
            <div className="new-chat-empty-sub">
              {l("После входа текущий браузер появится здесь.", "After sign-in, this browser will show up here.")}
            </div>
          </div>
        ) : (
          <div className="settings-list devices-list-card">
            {devices.map((device) => {
              const isCurrent = Boolean(device.current) || device.deviceId === currentDeviceId;
              const canRevoke = device.active && !isCurrent;
              const open = openId === (device.id || device.deviceId);
              const confirming = confirmId === device.id;

              return (
                <div key={device.id || device.deviceId} className={`device-block${open ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className={`device-row${isCurrent ? " is-current" : ""}${!device.active ? " is-off" : ""}`}
                    onClick={() => {
                      const id = device.id || device.deviceId;
                      setOpenId(open ? null : id);
                      setConfirmId(null);
                    }}
                  >
                    <span className={`device-icon${isCurrent ? " is-current" : ""}`}><DeviceIcon /></span>
                    <span className="device-main">
                      <span className="device-title">{prettyDeviceName(device, lang)}</span>
                      <span className="device-subtitle">
                        {isCurrent
                          ? l("Сейчас активно", "Active now")
                          : `${l("Был(а)", "Last seen")} ${formatDate(device.lastSeen || device.createdAt, lang)}`}
                      </span>
                    </span>
                    {isCurrent && <span className="device-badge current">{l("Текущее", "Current")}</span>}
                    {!device.active && <span className="device-badge disabled">{l("Откл.", "Off")}</span>}
                    {device.active && !isCurrent && <span className="device-badge active">{l("Сессия", "Session")}</span>}
                  </button>

                  {open && (
                    <div className="device-detail">
                      <div className="device-detail-row">
                        <span>{l("Последняя активность", "Last activity")}</span>
                        <b>{formatDate(device.lastSeen || device.createdAt, lang)}</b>
                      </div>
                      {device.deviceId && (
                        <div className="device-detail-row">
                          <span>ID</span>
                          <b className="device-id">{device.deviceId}</b>
                        </div>
                      )}
                      {isCurrent && (
                        <p className="device-detail-note">
                          {l("Это устройство. Чтобы выйти из него, используйте «Выйти» в настройках.", "This is the current device. Use Log out in Settings to leave this session.")}
                        </p>
                      )}
                      {!device.active && (
                        <p className="device-detail-note">
                          {l("Сессия уже отозвана — доступа к чатам нет.", "This session is already revoked.")}
                        </p>
                      )}
                      {canRevoke && !confirming && (
                        <button
                          type="button"
                          className="device-revoke"
                          disabled={busyId === device.id}
                          onClick={() => setConfirmId(device.id)}
                        >
                          {l("Отключить устройство", "Revoke device")}
                        </button>
                      )}
                      {canRevoke && confirming && (
                        <div className="device-confirm">
                          <p>{l("Сессия потеряет доступ к чатам. Продолжить?", "This session will lose chat access. Continue?")}</p>
                          <div className="device-confirm-actions">
                            <button type="button" className="new-chat-text-btn" onClick={() => setConfirmId(null)}>
                              {l("Отмена", "Cancel")}
                            </button>
                            <button
                              type="button"
                              className="device-revoke"
                              disabled={busyId === device.id}
                              onClick={() => deactivate(device)}
                            >
                              {busyId === device.id ? "..." : l("Отключить", "Revoke")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
