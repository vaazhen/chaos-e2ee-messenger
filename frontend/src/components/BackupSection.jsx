import { useState } from "react";
import { createEncryptedBackup, decryptBackup, restoreKeysFromBackup } from "../backup";
import { api } from "../api";

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

function ignore() {}

export default function BackupSection({ l, effectiveLang }) {
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [backupConfirmPassphrase, setBackupConfirmPassphrase] = useState("");
  const [importPassphrase, setImportPassphrase] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [backupError, setBackupError] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupTab, setBackupTab] = useState("export");

  return (
    <>
      <div className="profile-device-hero">
        <div className="profile-device-hero-icon">🔐</div>
        <div>
          <b>{l("E2EE Резервное копирование", "E2EE Backup")}</b>
          <span>
            {l("Экспортируйте или импортируйте зашифрованные ключи устройства. Пароль нужен для расшифровки — не теряйте его.", "Export or import encrypted device keys. The passphrase is required for decryption — do not lose it.")}
          </span>
        </div>
      </div>

      <div className="profile-security-note">
        {l("Резервная копия содержит identity-ключи, signed pre-key и registration ID. Старые сессии не восстанавливаются — для истории сообщений после смены устройства используйте синхронизацию.", "The backup contains your identity keys, signed pre-key and registration ID. Past sessions are not restored — contact sync is needed for message history after device change.")}
      </div>

      <div className="profile-backup-tabs" style={{display:"flex",gap:8,margin:"14px 0 10px",padding:"0 4px"}}>
        <button type="button" className="btn-sec"
          style={{flex:1, fontWeight: backupTab === "export" ? 900 : 600, background: backupTab === "export" ? "var(--bg3)" : "transparent"}}
          onClick={() => setBackupTab("export")}
        >
          {l("Экспорт", "Export")}
        </button>
        <button type="button" className="btn-sec"
          style={{flex:1, fontWeight: backupTab === "import" ? 900 : 600, background: backupTab === "import" ? "var(--bg3)" : "transparent"}}
          onClick={async () => {
            setBackupTab("import");
            try {
              const info = await api.getBackupInfo();
              setBackupInfo(info);
            } catch { ignore(); }
          }}
        >
          {l("Импорт", "Import")}
        </button>
      </div>

      {backupError && <div className="profile-error">{backupError}</div>}
      {backupStatus && <div className="profile-success">{backupStatus}</div>}

      {backupTab === "export" && (
        <div className="profile-card" style={{padding:18}}>
          <label className="profile-field">
            <span>{l("Пароль для шифрования", "Encryption passphrase")}</span>
            <input type="password" value={backupPassphrase}
              onChange={e => setBackupPassphrase(e.target.value)}
              placeholder={l("Минимум 8 символов", "At least 8 characters")} />
            <small style={{opacity:.55,fontSize:11,marginTop:4,display:"block"}}>
              {l("Пароль не хранится на сервере и не восстанавливается. Используйте минимум 8 символов: буквы, цифры, спецсимволы.",
                "Passphrase is not stored on the server and cannot be recovered. Use at least 8 characters: letters, digits, special chars.")}
            </small>
          </label>

          <label className="profile-field">
            <span>{l("Подтвердите пароль", "Confirm passphrase")}</span>
            <input type="password" value={backupConfirmPassphrase}
              onChange={e => setBackupConfirmPassphrase(e.target.value)}
              placeholder={l("Повторите пароль", "Repeat passphrase")} />
          </label>

          <div className="profile-bottom-actions" style={{marginTop:14}}>
            <button type="button" className="btn-pri"
              disabled={backupLoading || !backupPassphrase || backupPassphrase !== backupConfirmPassphrase || backupPassphrase.length < 8}
              onClick={async () => {
                setBackupError("");
                setBackupStatus("");
                setBackupLoading(true);
                try {
                  const backup = await createEncryptedBackup(backupPassphrase);
                  await api.importBackup(backup);
                  setBackupStatus(l("Резервная копия сохранена на сервере", "Backup saved to server"));
                  setBackupPassphrase("");
                  setBackupConfirmPassphrase("");
                } catch (e) {
                  setBackupError(e.message);
                } finally {
                  setBackupLoading(false);
                }
              }}
            >
              {backupLoading ? l("Создание...", "Creating...") : l("Создать резервную копию", "Create backup")}
            </button>
          </div>
        </div>
      )}

      {backupTab === "import" && (
        <>
          {backupInfo?.hasBackup && (
            <div className="profile-security-note" style={{marginTop:0}}>
              {l("Последняя копия от ", "Latest backup: ")}
              {backupInfo.createdAt ? formatDate(backupInfo.createdAt, effectiveLang) : l("неизвестно", "unknown")}
              {backupInfo.latestVersion != null && ` · v${backupInfo.latestVersion}`}
            </div>
          )}

          {!backupInfo?.hasBackup && (
            <div className="profile-empty-devices" style={{marginTop:8}}>
              <b>{l("Нет резервных копий", "No backups found")}</b>
              <span>{l("Сначала создайте экспорт на исходном устройстве.", "Create an export on the source device first.")}</span>
            </div>
          )}

          {backupInfo?.hasBackup && (
            <div className="profile-card" style={{padding:18}}>
              <label className="profile-field">
                <span>{l("Пароль для расшифровки", "Decryption passphrase")}</span>
                <input type="password" value={importPassphrase}
                  onChange={e => setImportPassphrase(e.target.value)}
                  placeholder={l("Введите пароль от резервной копии", "Enter backup passphrase")} />
              </label>

              <div className="profile-bottom-actions" style={{marginTop:14}}>
                <button type="button" className="btn-pri"
                  disabled={backupLoading || !importPassphrase}
                  onClick={async () => {
                    setBackupError("");
                    setBackupStatus("");
                    setBackupLoading(true);
                    try {
                      const exported = await api.exportBackup(importPassphrase);
                      const decrypted = await decryptBackup(exported.encryptedPayload, exported.salt, exported.iv, importPassphrase);
                      await restoreKeysFromBackup(decrypted);
                      setBackupStatus(l("Ключи восстановлены. Перезайдите, чтобы завершить восстановление.", "Keys restored. Re-login to complete recovery."));
                      setImportPassphrase("");
                    } catch (e) {
                      setBackupError(e.message || l("Неверный пароль или повреждённые данные", "Wrong passphrase or corrupted data"));
                    } finally {
                      setBackupLoading(false);
                    }
                  }}
                >
                  {backupLoading ? l("Восстановление...", "Restoring...") : l("Восстановить ключи", "Restore keys")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}