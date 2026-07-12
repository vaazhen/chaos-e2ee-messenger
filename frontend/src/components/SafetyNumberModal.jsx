import { useRef, useState } from "react";
import useSwipeDown from "../hooks/useSwipeDown";

const TRUST_COPY = {
  VERIFIED: {
    ru: "Устройство подтверждено",
    en: "Device verified",
    className: "verified",
  },
  KEY_CHANGED: {
    ru: "Ключ устройства изменился. Не доверяйте переписке до повторной проверки.",
    en: "The device key changed. Do not trust this conversation until you verify it again.",
    className: "changed",
  },
  UNVERIFIED: {
    ru: "Устройство ещё не подтверждено",
    en: "Device not verified yet",
    className: "unverified",
  },
};

export default function SafetyNumberModal({ safetyModal, onClose, onSelectDevice, onVerify, l }) {
  const modalRef = useRef(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  useSwipeDown(modalRef, onClose);

  if (!safetyModal.open) return null;

  const devices = safetyModal.devices || [];
  const selected = devices.find(device => device.deviceId === safetyModal.selectedDeviceId) || devices[0];
  const trust = TRUST_COPY[selected?.trustState] || TRUST_COPY.UNVERIFIED;

  const handleCopy = () => {
    if (!selected) return;
    const text = `Chaos Messenger Safety Number\nDevice: ${selected.deviceName}\nNumeric: ${selected.display?.numeric}\nHex: ${selected.display?.hex}\nWords:\n${selected.fingerprint?.fingerprint}`;
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  const handleVerify = async () => {
    if (!selected || verifying) return;
    setVerifying(true);
    setVerifyError("");
    try {
      await onVerify(selected.deviceId);
    } catch (error) {
      setVerifyError(error?.message || l("Не удалось сохранить проверку", "Could not save verification"));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="safety-modal-overlay" onClick={onClose}>
      <div ref={modalRef} className="safety-modal" onClick={e => e.stopPropagation()}>
        <div className="safety-modal-head">
          <button className="drawer-back" onClick={onClose} aria-label={l("Назад", "Back")}>‹</button>
          <b>{l("Проверка шифрования", "Verify encryption")}</b>
          <div style={{ width: 36 }} />
        </div>

        {safetyModal.error && !selected ? (
          <div className="safety-modal-body">
            <div className="safety-error-state">
              {l("Не удалось вычислить Safety Number", "Could not compute Safety Number")}
              <small>{safetyModal.error}</small>
            </div>
          </div>
        ) : selected ? (
          <div className="safety-modal-body">
            {devices.length > 1 && (
              <label className="safety-device-picker">
                <span>{l("Устройство собеседника", "Contact device")}</span>
                <select
                  value={selected.deviceId}
                  onChange={event => {
                    setVerifyError("");
                    onSelectDevice(event.target.value);
                  }}
                >
                  {devices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>{device.deviceName}</option>
                  ))}
                </select>
              </label>
            )}

            <div className={`safety-trust-state ${trust.className}`} role="status">
              {l(trust.ru, trust.en)}
            </div>

            <div className="safety-section">
              <div className="safety-label">{l("Цифровой отпечаток", "Numeric fingerprint")}</div>
              <div className="safety-value safety-numeric">{selected.display?.numeric || ""}</div>
            </div>

            <div className="safety-section">
              <div className="safety-label">{l("Шестнадцатеричный", "Hex")}</div>
              <div className="safety-value safety-hex">{selected.display?.hex || ""}</div>
            </div>

            <div className="safety-section">
              <div className="safety-label">{l("Словесный отпечаток", "Word fingerprint")}</div>
              <pre className="safety-value safety-words">{selected.fingerprint?.fingerprint || ""}</pre>
            </div>

            <div className="safety-note">
              {l(
                "Сравните код голосом или лично. Нажмите «Подтвердить» только после полного совпадения.",
                "Compare the code by voice or in person. Verify only after the codes match exactly."
              )}
            </div>
            {verifyError && <div className="safety-inline-error" role="alert">{verifyError}</div>}
          </div>
        ) : null}

        <div className="safety-modal-actions">
          <button type="button" className="btn-sec" onClick={handleCopy} disabled={!selected}>
            {l("Копировать", "Copy")}
          </button>
          {selected?.trustState !== "VERIFIED" ? (
            <button type="button" className="btn-pri" onClick={handleVerify} disabled={verifying || !selected}>
              {verifying ? l("Сохранение…", "Saving…") : l("Подтвердить", "Verify")}
            </button>
          ) : (
            <button type="button" className="btn-pri" onClick={onClose}>
              {l("Готово", "Done")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
