export default function SafetyNumberModal({ safetyModal, onClose, l }) {
  if (!safetyModal.open) return null;

  if (safetyModal.error && !safetyModal.fingerprint) {
    return (
      <div className="safety-modal-overlay" onClick={onClose}>
        <div className="safety-modal" onClick={e => e.stopPropagation()}>
          <div className="safety-modal-head">
            <b>{l("Safety Number", "Safety Number")}</b>
            <button type="button" className="safety-modal-close" onClick={onClose}>×</button>
          </div>
          <div className="safety-modal-body">
            <div className="safety-error-state">
              {l("Не удалось вычислить Safety Number", "Could not compute Safety Number")}
              <small>{safetyModal.error}</small>
            </div>
          </div>
          <div className="safety-modal-actions">
            <button type="button" className="btn-pri" onClick={onClose}>
              {l("Закрыть", "Close")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!safetyModal.fingerprint) return null;

  return (
    <div className="safety-modal-overlay" onClick={onClose}>
      <div className="safety-modal" onClick={e => e.stopPropagation()}>
        <div className="safety-modal-head">
          <b>{l("Safety Number", "Safety Number")}</b>
          <button type="button" className="safety-modal-close" onClick={onClose}>×</button>
        </div>

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
            {l("Сравните этот код с кодом на устройстве собеседника. Если коды совпадают — соединение безопасно.", "Compare this code with the one on your contact's device. If they match, the connection is secure.")}
          </div>
        </div>

        <div className="safety-modal-actions">
          <button
            type="button"
            className="btn-sec"
            onClick={() => {
              const text = `Chaos Messenger Safety Number:\n\nNumeric: ${safetyModal.display?.numeric}\nHex: ${safetyModal.display?.hex}\nWords:\n${safetyModal.fingerprint.fingerprint}`;
              navigator.clipboard?.writeText(text).catch(() => {});
            }}
          >
            {l("Копировать", "Copy")}
          </button>
          <button type="button" className="btn-pri" onClick={onClose}>
            {l("Закрыть", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}