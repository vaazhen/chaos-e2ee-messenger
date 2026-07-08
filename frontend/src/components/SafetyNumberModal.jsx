import { useRef } from "react";
import useSwipeDown from "../hooks/useSwipeDown";

export default function SafetyNumberModal({ safetyModal, onClose, l }) {
  const modalRef = useRef(null);
  useSwipeDown(modalRef, onClose);

  if (!safetyModal.open) return null;

  const handleCopy = () => {
    const text = `Chaos Messenger Safety Number:\n\nNumeric: ${safetyModal.display?.numeric}\nHex: ${safetyModal.display?.hex}\nWords:\n${safetyModal.fingerprint?.fingerprint}`;
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  return (
    <div className="safety-modal-overlay" onClick={onClose}>
      <div ref={modalRef} className="safety-modal" onClick={e => e.stopPropagation()}>
        <div className="safety-modal-head">
          <button className="drawer-back" onClick={onClose} aria-label={l("Назад", "Back")}>‹</button>
          <b>{l("Safety Number", "Safety Number")}</b>
          <div style={{width:36}} />
        </div>

        {safetyModal.error && !safetyModal.fingerprint ? (
          <div className="safety-modal-body">
            <div className="safety-error-state">
              {l("Не удалось вычислить Safety Number", "Could not compute Safety Number")}
              <small>{safetyModal.error}</small>
            </div>
          </div>
        ) : safetyModal.fingerprint ? (
          <div className="safety-modal-body">
            <div className="safety-section">
              <div className="safety-label">{l("Цифровой отпечаток", "Numeric fingerprint")}</div>
              <div className="safety-value safety-numeric">{safetyModal.display?.numeric || ""}</div>
            </div>

            <div className="safety-section">
              <div className="safety-label">{l("Шестнадцатеричный", "Hex")}</div>
              <div className="safety-value safety-hex">{safetyModal.display?.hex || ""}</div>
            </div>

            <div className="safety-section">
              <div className="safety-label">{l("Словесный отпечаток", "Word fingerprint")}</div>
              <pre className="safety-value safety-words">{safetyModal.fingerprint.fingerprint || ""}</pre>
            </div>

            <div className="safety-note">
              {l("Сравните этот код с кодом на устройстве собеседника.", "Compare this code with the one on your contact's device.")}
            </div>
          </div>
        ) : null}

        <div className="safety-modal-actions">
          <button type="button" className="btn-sec" onClick={handleCopy}>
            {l("Копировать", "Copy")}
          </button>
          <button type="button" className="btn-pri" onClick={onClose}>
            {l("Готово", "Done")}
          </button>
        </div>
      </div>
    </div>
  );
}
