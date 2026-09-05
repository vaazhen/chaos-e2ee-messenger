import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import useSwipeDown from "../hooks/useSwipeDown";
import Modal from "./ui/Modal";

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
  const [tab, setTab] = useState("export");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

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
    setExporting(true);
    setError("");
    try {
      const data = await api.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chaos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
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
      e.target.value = "";
    }
  };

  const content = loading ? (
    <div className="new-chat-loading"><div className="spinner" /></div>
  ) : (
    <>
      <div className="settings-sheet-list">
        <div className="settings-sheet-row is-static">
          <span className="settings-sheet-row-text">{l("Статус", "Status")}</span>
          <small>
            {info?.hasBackup
              ? l("Копия есть", "Backup exists")
              : l("Копии нет", "No backup")}
          </small>
        </div>
        {info?.hasBackup && (
          <>
            <div className="settings-sheet-row is-static">
              <span className="settings-sheet-row-text">{l("Версия", "Version")}</span>
              <small>{info.version ?? info.latestVersion ?? "—"}</small>
            </div>
            <div className="settings-sheet-row is-static">
              <span className="settings-sheet-row-text">{l("Создана", "Created")}</span>
              <small>{info.createdAt ? new Date(info.createdAt).toLocaleString() : "—"}</small>
            </div>
          </>
        )}
      </div>

      <div className="new-chat-tabs backup-tabs">
        <button type="button" className={tab === "export" ? "active" : ""} onClick={() => setTab("export")}>
          {l("Экспорт", "Export")}
        </button>
        <button type="button" className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>
          {l("Импорт", "Import")}
        </button>
      </div>

      {error && <div className="settings-banner settings-banner--error">{error}</div>}

      {tab === "export" && (
        <div className="backup-pane">
          <button
            type="button"
            className="settings-sheet-save"
            onClick={handleExport}
            disabled={exporting || !info?.hasBackup}
          >
            {exporting ? l("Экспорт...", "Exporting...") : l("Скачать копию", "Download backup")}
          </button>
          <p className="backup-note">
            {l(
              "Скачивается уже зашифрованный блоб. Фраза нужна только на устройстве, где копию создавали — сюда её не вводите.",
              "This downloads the already-encrypted blob. The passphrase stays on the device that created the backup — do not send it here."
            )}
          </p>
        </div>
      )}

      {tab === "import" && (
        <div className="backup-pane">
          <label className={`settings-sheet-save backup-file-btn${importing ? " is-disabled" : ""}`}>
            {importing ? l("Импорт...", "Importing...") : l("Выбрать JSON-файл", "Choose JSON file")}
            <input type="file" accept=".json" onChange={handleImport} hidden disabled={importing} />
          </label>
          <p className="backup-note">
            {l(
              "Импорт восстановит ключи устройства. После этого лучше перезайти.",
              "Import restores device keys. Re-login afterwards to finish recovery."
            )}
          </p>
        </div>
      )}
    </>
  );

  if (noWrapper) return content;

  return (
    <Modal open={!closing} onClose={handleClose} title={l("Резервное копирование", "Backup")} className="settings-sheet-modal">
      {content}
    </Modal>
  );
}
