import { useEffect, useMemo, useState } from "react";
import { api, getCurrentDeviceId } from "../api";

function formatDate(value, lang = "ru") {
  const isEn = String(lang || "ru").toLowerCase().startsWith("en");
  const noData = isEn ? "No data" : "нет данных";
  if (!value) return noData;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return noData;
  return date.toLocaleString(isEn ? "en-US" : "ru-RU", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function deviceTitle(device, lang = "ru") {
  const isEn = String(lang || "ru").toLowerCase().startsWith("en");
  if (device?.deviceName) return device.deviceName;
  const id = device?.deviceId || "";
  if (!id) return isEn ? "Device" : "Устройство";
  if (id.startsWith("device-")) return `${isEn ? "Browser" : "Браузер"} ${id.slice(7, 15)}`;
  return `${isEn ? "Device" : "Устройство"} ${id.slice(0, 8)}`;
}

function deviceSub(device, lang = "ru") {
  const isEn = String(lang || "ru").toLowerCase().startsWith("en");
  const id = device?.deviceId || "";
  if (!id) return isEn ? "ID not found" : "ID не найден";
  return id.length > 28 ? `${id.slice(0, 18)}…${id.slice(-6)}` : id;
}

export default function DevicesSection({ l, effectiveLang }) {
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState("");
  const [deactivatingId, setDeactivatingId] = useState(null);

  const currentDeviceId = useMemo(() => {
    try { return getCurrentDeviceId(); } catch { return ""; }
  }, []);

  const activeDevicesCount = useMemo(() => devices.filter(d => d.active).length, [devices]);

  const loadDevices = async () => {
    setDevicesLoading(true);
    setDevicesError("");
    try {
      const data = await api.listDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch (e) {
      setDevicesError(e?.message || l("Не удалось загрузить устройства", "Failed to load devices"));
    } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => { loadDevices(); }, []);

  const deactivate = async (device) => {
    if (!device?.id || !device.active || device.current) return;
    const ok = window.confirm(
      `${l("Отключить устройство", "Disable device")} "${deviceTitle(device, effectiveLang)}"?\n\n${l("Оно больше не сможет получать и отправлять зашифрованные сообщения.", "It will no longer be able to receive or send encrypted messages.")}`
    );
    if (!ok) return;
    setDeactivatingId(device.id);
    setDevicesError("");
    try {
      await api.deactivateDevice(device.id, false);
      await loadDevices();
    } catch (e) {
      const message = e?.message || "";
      if (message.toLowerCase().includes("last active device")) {
        setDevicesError("Нельзя отключить последнее активное устройство.");
      } else {
        setDevicesError(message || l("Не удалось отключить устройство", "Failed to disable device"));
      }
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <>
      <div className="profile-device-hero">
        <div className="profile-device-hero-icon">⌘</div>
        <div>
          <b>{l("Активные устройства", "Active devices")}</b>
          <span>
            {l("Управляйте браузерами и клиентами, которым разрешено работать с E2EE.", "Manage browsers and clients allowed to use E2EE.")}
          </span>
        </div>
      </div>

      <div className="profile-security-note">
        {l("Отключённое устройство больше не сможет подключиться к WebSocket, получать crypto bundle и отправлять зашифрованные сообщения.", "A disabled device will no longer connect to WebSocket, receive crypto bundles or send encrypted messages.")}
      </div>

      <div className="profile-section-title">
        {l("Устройства", "Devices")} {devices.length ? `· ${activeDevicesCount} ${l("активн.", "active")}` : ""}
      </div>

      {devicesError && <div className="profile-error">{devicesError}</div>}

      {devicesLoading ? (
        <div className="profile-devices-loading">
          <div className="spinner" />
          <span>{l("Загружаем устройства...", "Loading devices...")}</span>
        </div>
      ) : (
        <div className="profile-devices-list">
          {devices.map(device => {
            const isCurrent = Boolean(device.current) || device.deviceId === currentDeviceId;
            const canDeactivate = device.active && !isCurrent;

            return (
              <div key={device.id || device.deviceId}
                className={`profile-device-card${!device.active ? " inactive" : ""}${isCurrent ? " current" : ""}`}
              >
                <div className="profile-device-icon">
                  {isCurrent ? "●" : device.active ? "◉" : "○"}
                </div>

                <div className="profile-device-main">
                  <div className="profile-device-line">
                    <b>{deviceTitle(device, effectiveLang)}</b>
                    {isCurrent && <span className="device-pill current">{l("это устройство", "this device")}</span>}
                    {!device.active && <span className="device-pill off">отключено</span>}
                  </div>

                  <small>{deviceSub(device, effectiveLang)}</small>

                  <div className="profile-device-meta">
                    <span>{l("Последняя активность", "Last activity")}: {formatDate(device.lastSeen || device.createdAt, effectiveLang)}</span>
                  </div>
                </div>

                <button type="button" className="profile-device-action"
                  disabled={!canDeactivate || deactivatingId === device.id}
                  onClick={() => deactivate(device)}
                  title={isCurrent ? l("Текущее устройство нельзя отключить отсюда", "Current device cannot be disabled here") : l("Отключить устройство", "Disable device")}
                >
                  {deactivatingId === device.id ? "..." : canDeactivate ? l("Отключить", "Disable") : "—"}
                </button>
              </div>
            );
          })}

          {!devices.length && (
            <div className="profile-empty-devices">
              <b>{l("Устройств пока нет", "No devices yet")}</b>
              <span>{l("После регистрации текущий браузер появится здесь автоматически.", "After registration, the current browser will appear here automatically.")}</span>
            </div>
          )}
        </div>
      )}

      <div className="profile-bottom-actions single">
        <button type="button" className="btn-sec" onClick={loadDevices} disabled={devicesLoading}>
          {l("Обновить список", "Refresh list")}
        </button>
      </div>
    </>
  );
}