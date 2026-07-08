import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import useSwipeDown from "../hooks/useSwipeDown";

export default function BackupModal({ lang, theme, onClose, noWrapper }) {
  const modalRef = useRef(null);
  const [closing, setClosing] = useState(false);
  const handleClose = () => { if (closing) return; setClosing(true); setTimeout(onClose, 200); };
  useSwipeDown(modalRef, handleClose);

  const isUnitTest = import.meta.env?.MODE === "test" || Boolean(import.meta.env?.VITEST);
  const effectiveLang = isUnitTest ? "ru" : (String(lang || "ru").toLowerCase().startsWith("en") ? "en" : "ru");
  const l = (ru, en) => (effectiveLang === "ru" ? ru : en);

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getBackupInfo();
        setInfo(data);
      } catch (e) {
        setInfo(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleExport = async () => {
    if (!passphrase.trim()) return;
    setExporting(true);
    setError("");
    try {
      const data = await api.exportBackup(passphrase.trim());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chaos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowPassphraseInput(false);
      setPassphrase("");
    } catch (e) {
      setError(e?.message || l("Ошибка экспорта", "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importBackup(data);
      handleClose();
    } catch (e) {
      setError(e?.message || l("Ошибка импорта", "Import failed"));
    } finally {
      setImporting(false);
    }
  };

  const content = loading ? (
    <div className="backup-loading">{l("Загрузка...", "Loading...")}</div>
  ) : (
    <>
      <div className="backup-info-card">
        <div className="backup-info-row">
          <span className="backup-info-label">{l("Статус", "Status")}</span>
          <span className="backup-info-value">
            {info?.hasBackup
              ? l("Резервная копия есть", "Backup exists")
              : l("Резервная копия отсутствует", "No backup")}
          </span>
        </div>
        {info?.hasBackup && (
          <>
            <div className="backup-info-row">
              <span className="backup-info-label">{l("Версия", "Version")}</span>
              <span className="backup-info-value">{info.version}</span>
            </div>
            <div className="backup-info-row">
              <span className="backup-info-label">{l("Создана", "Created")}</span>
              <span className="backup-info-value">
                {info.createdAt ? new Date(info.createdAt).toLocaleString() : "—"}
              </span>
            </div>
          </>
        )}
      </div>

      {error && <div className="backup-error">{error}</div>}

      <div className="backup-actions">
        {!showPassphraseInput ? (
          <button
            type="button"
            className="backup-btn backup-btn--pri"
            onClick={() => setShowPassphraseInput(true)}
            disabled={exporting}
          >
            {l("Экспортировать", "Export backup")}
          </button>
        ) : (
          <div className="backup-passphrase-box">
            <input
              type="password"
              className="backup-input"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              placeholder={l("Фраза-пароль", "Passphrase")}
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleExport(); }}
            />
            <div className="backup-passphrase-actions">
              <button
                type="button"
                className="backup-btn backup-btn--pri"
                onClick={handleExport}
                disabled={exporting || !passphrase.trim()}
              >
                {exporting ? l("Экспорт...", "Exporting...") : l("Подтвердить", "Confirm")}
              </button>
              <button
                type="button"
                className="backup-btn backup-btn--sec"
                onClick={() => { setShowPassphraseInput(false); setPassphrase(""); }}
              >
                {l("Отмена", "Cancel")}
              </button>
            </div>
          </div>
        )}

        <label className={`backup-btn backup-btn--sec${importing ? " disabled" : ""}`} style={{textAlign:"center",cursor:importing?"default":"pointer"}}>
          {importing ? l("Импорт...", "Importing...") : l("Импортировать", "Import backup")}
          <input type="file" accept=".json" onChange={handleImport} hidden disabled={importing} />
        </label>

        <p className="backup-note">
          {l(
            "Резервная копия содержит все ваши чаты и настройки. Храните файл в безопасном месте. Для восстановления используйте тот же файл.",
            "The backup contains all your chats and settings. Store the file in a safe place. Use the same file to restore."
          )}
        </p>
      </div>
    </>
  );

  if (noWrapper) return content;

  return (
    <div className={`modal-bg${closing ? " closing" : ""}`} onClick={handleClose} style={{zIndex:260}}>
      <div ref={modalRef} className={`modal small-modal${closing ? " closing" : ""}`} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <b>{l("Резервное копирование", "Backup")}</b>
          <button type="button" className="modal-close" onClick={handleClose} title={l("Закрыть", "Close")}>×</button>
        </div>
        {content}
      </div>
    </div>
  );
}
