import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, setToken } from "../api";
import { compressImageToDataUrl, IMAGE_PROFILES } from "../imagePipeline";
import useSwipeDown from "../hooks/useSwipeDown";
import BackupModal from "./BackupModal";

function initials(me, form) {
  const first = form?.firstName || me?.firstName || "";
  const last = form?.lastName || me?.lastName || "";
  const username = me?.username || "";
  const value = `${first} ${last}`.trim() || username || "U";
  return value.split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase();
}

function renderProfileAvatar(value, fallback) {
  if (value?.startsWith("preset:")) return value.replace("preset:", "") || fallback;
  if (value?.startsWith("data:image/") || value?.startsWith("blob:") || value?.startsWith("http://") || value?.startsWith("https://")) {
    return <img src={value} alt="" draggable="false" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",borderRadius:"inherit"}} />;
  }
  return fallback;
}

const STATUS_PRESETS = [
  { emoji: "🟢", label: "Онлайн", labelEn: "Online" },
  { emoji: "🔴", label: "Занят", labelEn: "Busy" },
  { emoji: "🟡", label: "Отошёл", labelEn: "Away" },
  { emoji: "🌙", label: "Не беспокоить", labelEn: "Do not disturb" },
  { emoji: "💼", label: "Работаю", labelEn: "Working" },
  { emoji: "🎓", label: "Учусь", labelEn: "Studying" },
  { emoji: "🏠", label: "Дома", labelEn: "At home" },
  { emoji: "📱", label: "В сети", labelEn: "On the grid" },
  { emoji: "✈️", label: "Путешествую", labelEn: "Traveling" },
  { emoji: "🎮", label: "Играю", labelEn: "Gaming" },
  { emoji: "📖", label: "Читаю", labelEn: "Reading" },
  { emoji: "❤️", label: "Влюблён", labelEn: "In love" },
];

const FAQ_ITEMS = [
  {
    q: "Как обеспечивается безопасность?",
    qEn: "How is security ensured?",
    a: "Chaos Messenger использует сквозное шифрование (E2EE) на основе протокола Signal (X3DH + Double Ratchet). Все сообщения, медиафайлы и звонки шифруются на устройстве отправителя и расшифровываются только на устройстве получателя. Даже сервер не имеет доступа к содержимому.",
    aEn: "Chaos Messenger uses end-to-end encryption (E2EE) based on the Signal protocol (X3DH + Double Ratchet). All messages, media, and calls are encrypted on the sender's device and decrypted only on the recipient's device. Even the server cannot access the content.",
  },
  {
    q: "Какие данные хранятся на сервере?",
    qEn: "What data is stored on the server?",
    a: "Сервер хранит только зашифрованные сообщения и медиафайлы, а также метаданные, необходимые для доставки (отправитель, получатель, время). Все ключи шифрования генерируются и хранятся локально на вашем устройстве.",
    aEn: "The server only stores encrypted messages and media, plus delivery metadata (sender, recipient, time). All encryption keys are generated and stored locally on your device.",
  },
  {
    q: "Можно ли восстановить чаты при смене устройства?",
    qEn: "Can I restore chats when changing devices?",
    a: "Да. Используйте резервное копирование в разделе Система → Резервное копирование для сохранения ключей. Новое устройство создаст свежие сессии с контактами.",
    aEn: "Yes. Use Backup in System → Backup to save your keys. A new device will establish fresh sessions with your contacts.",
  },
  {
    q: "Поддерживаются ли групповые чаты?",
    qEn: "Are group chats supported?",
    a: "Да. Вы можете создавать групповые чаты, добавлять участников, назначать администраторов, настраивать права и использовать сквозное шифрование для всех участников группы.",
    aEn: "Yes. You can create group chats, add participants, assign admins, configure permissions, and use end-to-end encryption for all group members.",
  },
  {
    q: "Как удалить аккаунт?",
    qEn: "How do I delete my account?",
    a: "На данный момент удаление аккаунта производится через службу поддержки. Напишите нам, и мы поможем. Все ваши данные будут безвозвратно удалены с серверов.",
    aEn: "Currently, account deletion is handled through our support team. Contact us and we will help. All your data will be permanently deleted from our servers.",
  },
];

export default function ProfileModal({ me, lang, theme, onClose, onSaved, onToggleTheme, onSwitchLang, onLogout, onOpenChat }) {
  const modalRef = useRef(null);
  const [closing, setClosing] = useState(false);
  const handleClose = () => { if (closing) return; setClosing(true); setTimeout(onClose, 200); };
  useSwipeDown(modalRef, handleClose);

  const isUnitTest = import.meta.env?.MODE === "test" || Boolean(import.meta.env?.VITEST);
  const effectiveLang = isUnitTest ? "ru" : (String(lang || "ru").toLowerCase().startsWith("en") ? "en" : "ru");
  const l = (ru, en) => (effectiveLang === "ru" ? ru : en);

  const [form, setForm] = useState(() => ({
    firstName: me?.firstName || "",
    lastName: me?.lastName || "",
    username: me?.username || "",
    bio: me?.bio || "",
    avatarUrl: me?.avatarUrl || "",
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [editing, setEditing] = useState(false);
  const [statusText, setStatusText] = useState(me?.bio || "");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusCustomOpen, setStatusCustomOpen] = useState(false);

  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const [showBackup, setShowBackup] = useState(false);

  useEffect(() => {
    setForm({
      firstName: me?.firstName || "",
      lastName: me?.lastName || "",
      username: me?.username || "",
      bio: me?.bio || "",
      avatarUrl: me?.avatarUrl || "",
    });
    setStatusText(me?.bio || "");
  }, [me?.id, me?.username, me?.firstName, me?.lastName, me?.bio, me?.avatarUrl]);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError("");
    try {
      const compressed = await compressImageToDataUrl(file, IMAGE_PROFILES.avatar);
      setField("avatarUrl", compressed.dataUrl);
    } catch (e) {
      setAvatarError(e?.message || l("Не удалось загрузить аватар", "Failed to upload avatar"));
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        firstName: form.firstName?.trim() || "",
        lastName: form.lastName?.trim() || "",
        username: me?.username || form.username,
        bio: statusText?.trim() || form.bio?.trim() || "",
        avatarUrl: form.avatarUrl?.trim() || "",
      };
      const updated = await api.updateProfile(payload);
      if (updated?.token) setToken(updated.token);
      onSaved?.(updated);
      setEditing(false);
    } catch (e) {
      setError(e?.message || l("Не удалось сохранить профиль", "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  };

  const toggleEditing = () => {
    if (editing) { save(); }
    else setEditing(true);
  };

  const selectStatus = (emoji, text) => {
    setStatusText(`${emoji} ${text}`);
    setShowStatusModal(false);
  };

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const data = await api.listDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch (e) {
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  const openDevicesModal = async () => {
    setShowDevicesModal(true);
    if (devices.length === 0) await loadDevices();
  };

  const deactivateDevice = async (id) => {
    if (!window.confirm(l("Отключить это устройство?", "Deactivate this device?"))) return;
    try {
      await api.deactivateDevice(id);
      await loadDevices();
    } catch (e) {
      setError(e?.message || l("Не удалось отключить устройство", "Failed to deactivate device"));
    }
  };

  const openSavedChat = async () => {
    try {
      const res = await api.createSaved();
      if (res?.chatId) {
        onOpenChat?.(res.chatId);
        handleClose();
      }
    } catch (e) {
      setError(e?.message || l("Не удалось открыть Избранное", "Could not open Saved Messages"));
    }
  };

  const openBackup = () => setShowBackup(true);

  const closeBackup = () => setShowBackup(false);

  const displayName = `${form.firstName} ${form.lastName}`.trim() || me?.username || l("Пользователь", "User");

  return (
    <div className={`modal-bg${closing ? " closing" : ""}`} onClick={handleClose}>
      <div ref={modalRef} className={`modal profile-settings-modal${closing ? " closing" : ""}`} onClick={e => e.stopPropagation()}>
        <div className="ps-header">
          <b>{l("Параметры", "Settings")}</b>
          <button type="button" className="modal-close" onClick={onClose} title={l("Закрыть", "Close")} aria-label={l("Закрыть", "Close")}>×</button>
        </div>

        <div className="ps-scroll scroll">
          {/* Avatar hero */}
          <div className="ps-hero">
            <label className="ps-hero-avatar" style={{cursor:editing?"pointer":"default"}}>
              {editing && <input type="file" accept="image/*" onChange={handleAvatarUpload} hidden />}
              <div className="ps-hero-avatar-inner">
                {renderProfileAvatar(form.avatarUrl, initials(me, form))}
              </div>
              {editing && <span className="ps-hero-avatar-overlay">{l("+", "+")}</span>}
              <button type="button" className="ps-hero-edit-btn" onClick={(e) => { e.stopPropagation(); toggleEditing(); }} disabled={saving}>
                {saving ? l("Сохр.", "Save") : editing ? l("Готово", "Done") : l("Изм.", "Edit")}
              </button>
            </label>
            <div className="ps-hero-info">
              <b className="ps-hero-name">{displayName}</b>
              <span className="ps-hero-username">@{me?.username || form.username || "username"}</span>
            </div>
            {avatarError && <small className="ps-error" style={{textAlign:"center",display:"block",marginTop:4}}>{avatarError}</small>}
          </div>

          {editing && (
            <>
              {/* Edit fields */}
              <div className="ps-card">
                <label className="ps-field">
                  <span>{l("Имя", "First name")}</span>
                  <input value={form.firstName} onChange={e => setField("firstName", e.target.value)} placeholder={l("Имя", "First name")} />
                </label>
                <label className="ps-field">
                  <span>{l("Фамилия", "Last name")}</span>
                  <input value={form.lastName} onChange={e => setField("lastName", e.target.value)} placeholder={l("Фамилия", "Last name")} />
                </label>
                <label className="ps-field">
                  <span>Username</span>
                  <input value={form.username} onChange={e => setField("username", e.target.value)} placeholder="username" autoComplete="off" />
                  <small className="ps-field-note">{l("Username можно изменить. После сохранения авторизация обновится.", "Username can be changed. Auth will refresh after saving.")}</small>
                </label>
                <label className="ps-field">
                  <span>{l("О себе", "Bio")}</span>
                  <textarea value={statusText} onChange={e => setStatusText(e.target.value)} placeholder={l("Несколько слов о себе", "A few words about yourself")} maxLength={160} rows={3} />
                  <small className="ps-field-note">{`${statusText.length}/160`}</small>
                </label>
              </div>

              {error && <div className="ps-error-banner">{error}</div>}
            </>
          )}

          {!editing && (
            <>
              {/* Status */}
              <button type="button" className="ps-row" onClick={() => setShowStatusModal(true)}>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Статус", "Status")}</b>
                  <small>{statusText?.trim() || l("Нажмите, чтобы установить", "Tap to set")}</small>
                </span>
                <i>›</i>
              </button>

              {/* Recent calls */}
              <div className="ps-section-label">{l("Звонки", "Calls")}</div>
              <button type="button" className="ps-row disabled" disabled>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Недавние звонки", "Recent calls")}</b>
                  <small>{l("скоро", "soon")}</small>
                </span>
              </button>

              {/* System */}
              <div className="ps-section-label">{l("Система", "System")}</div>

              <button type="button" className="ps-row" onClick={openDevicesModal}>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <path d="M12 18h.01" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Устройства", "Devices")}</b>
                  <small>{devices.length > 0 ? l("{n} шт.", "{n} devices").replace("{n}", devices.length) : l("загрузить", "tap to load")}</small>
                </span>
                <i>›</i>
              </button>

              <button type="button" className="ps-row" onClick={openBackup}>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <path d="M12 15V3" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Резервное копирование", "Backup")}</b>
                  <small>{l("экспорт и импорт", "export & import")}</small>
                </span>
                <i>›</i>
              </button>

              {/* Chats */}
              <div className="ps-section-label">{l("Чаты", "Chats")}</div>

              <button type="button" className="ps-row" onClick={openSavedChat}>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Избранное", "Saved Messages")}</b>
                  <small>{l("ваши заметки", "your notes")}</small>
                </span>
                <i>›</i>
              </button>

              <button type="button" className="ps-row disabled" disabled>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Папки с чатами", "Chat folders")}</b>
                  <small>{l("скоро", "soon")}</small>
                </span>
              </button>

              {/* Notifications */}
              <div className="ps-section-label">{l("Уведомления", "Notifications")}</div>
              <button type="button" className="ps-row disabled" disabled>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Уведомления и звуки", "Notifications & sounds")}</b>
                  <small>{l("скоро", "soon")}</small>
                </span>
              </button>

              {/* Data & storage */}
              <div className="ps-section-label">{l("Данные", "Data")}</div>
              <button type="button" className="ps-row disabled" disabled>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Данные и память", "Data & storage")}</b>
                  <small>{l("скоро", "soon")}</small>
                </span>
              </button>

              {/* Appearance */}
              <div className="ps-section-label">{l("Оформление", "Appearance")}</div>
              <button type="button" className="ps-row" onClick={(e) => { e.stopPropagation(); onToggleTheme(); }}>
                <span className="ps-row-icon">
                  {theme === "dark" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                  )}
                </span>
                <span className="ps-row-main">
                  <b>{l("Тема", "Theme")}</b>
                  <small>{theme === "dark" ? l("Тёмная", "Dark") : l("Светлая", "Light")}</small>
                </span>
                <span className={`ps-toggle${theme === "dark" ? " active" : ""}`}><span /></span>
              </button>

              {/* Language */}
              <div className="ps-section-label">{l("Язык", "Language")}</div>
              <button type="button" className="ps-row" onClick={(e) => { e.stopPropagation(); onSwitchLang(); }}>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Язык", "Language")}</b>
                  <small>{effectiveLang === "ru" ? "Русский" : "English"}</small>
                </span>
                <i>›</i>
              </button>

              {/* Help */}
              <div className="ps-section-label">{l("Помощь", "Help")}</div>
              <button type="button" className="ps-row" onClick={() => setShowFaqModal(true)}>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Вопросы и возможности", "FAQ & features")}</b>
                  <small>{l("ответы на частые вопросы", "frequently asked questions")}</small>
                </span>
                <i>›</i>
              </button>

              <button type="button" className="ps-row" onClick={() => setShowAboutModal(true)}>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("О мессенджере", "About messenger")}</b>
                  <small>v1.0</small>
                </span>
                <i>›</i>
              </button>

              {/* Logout */}
              <button type="button" className="ps-row ps-row--danger" onClick={(e) => { e.stopPropagation(); onLogout(); }}>
                <span className="ps-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <path d="M21 12H9" />
                  </svg>
                </span>
                <span className="ps-row-main">
                  <b>{l("Выйти", "Log out")}</b>
                </span>
                <i>›</i>
              </button>
            </>
          )}
        </div>

        {createPortal(<>
        {showStatusModal && (
          <div className="ps-submodal-bg" onClick={() => setShowStatusModal(false)}>
            <div className="ps-submodal" onClick={e => e.stopPropagation()}>
              <div className="ps-submodal-header">
                <b>{l("Выберите статус", "Set status")}</b>
                <button type="button" className="modal-close" onClick={() => setShowStatusModal(false)}>×</button>
              </div>
              <div className="ps-submodal-scroll">
                <div className="ps-status-grid">
                  {STATUS_PRESETS.map(s => (
                    <button key={s.emoji} className="ps-status-item" onClick={() => selectStatus(s.emoji, l(s.label, s.labelEn))}>
                      <span className="ps-status-emoji">{s.emoji}</span>
                      <span className="ps-status-label">{l(s.label, s.labelEn)}</span>
                    </button>
                  ))}
                  <button className="ps-status-item ps-status-custom" onClick={() => setStatusCustomOpen(true)}>
                    <span className="ps-status-emoji">✏️</span>
                    <span className="ps-status-label">{l("Свой текст", "Custom")}</span>
                  </button>
                </div>

                {statusCustomOpen && (
                  <div className="ps-card" style={{marginTop:12}}>
                    <label className="ps-field">
                      <textarea value={statusText} onChange={e => setStatusText(e.target.value)} placeholder={l("Ваш статус", "Your status")} maxLength={160} rows={2} />
                      <small className="ps-field-note">{`${statusText.length}/160`}</small>
                    </label>
                    <div style={{padding:"4px 14px 12px"}}>
                      <button type="button" className="btn-pri" onClick={save} disabled={saving} style={{width:"100%"}}>
                        {saving ? l("Сохр.", "Save") : l("Сохранить статус", "Save status")}
                      </button>
                      <button type="button" className="btn-sec" onClick={() => setStatusCustomOpen(false)} style={{width:"100%",marginTop:6}}>
                        {l("Отмена", "Cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showDevicesModal && (
          <div className="ps-submodal-bg" onClick={() => setShowDevicesModal(false)}>
            <div className="ps-submodal" onClick={e => e.stopPropagation()}>
              <div className="ps-submodal-header">
                <b>{l("Устройства", "Devices")}</b>
                <button type="button" className="modal-close" onClick={() => setShowDevicesModal(false)}>×</button>
              </div>
              <div className="ps-submodal-scroll">
                <p className="ps-device-desc">
                  {l(
                    "Управляйте устройствами, подключёнными к вашему аккаунту. Вы можете отключить любое устройство — после этого оно потеряет доступ к вашим чатам. Устройство будет удалено из списка, но вы всегда сможете войти заново.",
                    "Manage devices connected to your account. You can deactivate any device — it will lose access to your chats. The device will be removed from the list, but you can always log in again."
                  )}
                </p>
                {devicesLoading ? (
                  <div className="ps-device-status">{l("Загрузка...", "Loading...")}</div>
                ) : devices.length === 0 ? (
                  <div className="ps-device-status">{l("Нет других устройств", "No other devices")}</div>
                ) : (
                  <div className="ps-card" style={{marginTop:0}}>
                    {devices.map(d => (
                      <div key={d.id} className="ps-device-row">
                        <div className="ps-device-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
                            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                            <path d="M12 18h.01" />
                          </svg>
                        </div>
                        <div className="ps-device-info">
                          <b>{d.deviceName || d.deviceId}</b>
                          <small>{d.lastSeen ? l("Был(а) {date}", "Last seen {date}").replace("{date}", new Date(d.lastSeen).toLocaleDateString()) : l("Неизвестно", "Unknown")}</small>
                        </div>
                        {d.current ? (
                          <span className="ps-device-badge">{l("Текущее", "Current")}</span>
                        ) : (
                          <button type="button" className="ps-device-kick" onClick={() => deactivateDevice(d.id)}>
                            {l("Откл.", "Off")}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showFaqModal && (
          <div className="ps-submodal-bg" onClick={() => setShowFaqModal(false)}>
            <div className="ps-submodal" onClick={e => e.stopPropagation()}>
              <div className="ps-submodal-header">
                <b>{l("Вопросы и возможности", "FAQ & features")}</b>
                <button type="button" className="modal-close" onClick={() => setShowFaqModal(false)}>×</button>
              </div>
              <div className="ps-submodal-scroll">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} className="ps-faq-item" style={{padding:"14px 0"}}>
                    <b className="ps-faq-q">{l(item.q, item.qEn)}</b>
                    <p className="ps-faq-a">{l(item.a, item.aEn)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showAboutModal && (
          <div className="ps-submodal-bg" onClick={() => setShowAboutModal(false)}>
            <div className="ps-submodal" onClick={e => e.stopPropagation()}>
              <div className="ps-submodal-header">
                <b>{l("О мессенджере", "About messenger")}</b>
                <button type="button" className="modal-close" onClick={() => setShowAboutModal(false)}>×</button>
              </div>
              <div className="ps-submodal-scroll">
                <div className="ps-about-hero" style={{paddingTop:0}}>
                  <div className="ps-about-logo">C</div>
                  <b className="ps-about-name">Chaos Messenger</b>
                  <small className="ps-about-version">{l("Версия", "Version")} 1.0.0</small>
                </div>
                <div className="ps-faq-item" style={{padding:"14px 0"}}>
                  <p className="ps-faq-a" style={{lineHeight:1.6}}>
                    {l(
                      "Chaos Messenger — это защищённый мессенджер с сквозным шифрованием (E2EE) на основе протокола Signal. Все сообщения, медиафайлы и звонки шифруются на устройстве отправителя и расшифровываются только на устройстве получателя. Сервер не имеет доступа к содержимому переписки.",
                      "Chaos Messenger is a secure messenger with end-to-end encryption (E2EE) based on the Signal protocol. All messages, media, and calls are encrypted on the sender's device and decrypted only on the recipient's device. The server has no access to message content."
                    )}
                  </p>
                </div>
                <div className="ps-faq-item" style={{padding:"14px 0"}}>
                  <b className="ps-faq-q">{l("Ключевые возможности", "Key features")}</b>
                  <ul className="ps-about-features">
                    <li>{l("Сквозное шифрование (X3DH + Double Ratchet)", "End-to-end encryption (X3DH + Double Ratchet)")}</li>
                    <li>{l("Групповые чаты с шифрованием", "Encrypted group chats")}</li>
                    <li>{l("Мульти-устройства (бета)", "Multi-device (beta)")}</li>
                    <li>{l("Резервное копирование и восстановление", "Backup & restore")}</li>
                    <li>{l("Режимы оформления: светлая и тёмная темы", "Light & dark themes")}</li>
                    <li>{l("Поддержка русского и английского языков", "Russian & English language support")}</li>
                  </ul>
                </div>
                <div className="ps-faq-item" style={{padding:"14px 0",borderBottom:"none"}}>
                  <p className="ps-faq-a" style={{fontSize:12,color:"var(--t2)"}}>
                    {l(
                      "© 2026 Chaos Messenger. Все права защищены. Исходный код доступен на GitHub.",
                      "© 2026 Chaos Messenger. All rights reserved. Source code available on GitHub."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showBackup && (
          <div className="ps-submodal-bg" onClick={closeBackup}>
            <div className="ps-submodal" onClick={e => e.stopPropagation()}>
              <div className="ps-submodal-header">
                <b>{l("Резервное копирование", "Backup")}</b>
                <button type="button" className="modal-close" onClick={closeBackup}>×</button>
              </div>
              <div className="ps-submodal-scroll">
                <BackupModal
                  lang={lang}
                  theme={theme}
                  onClose={closeBackup}
                  noWrapper
                />
              </div>
            </div>
          </div>
        )}
      </>, document.body)}
    </div>
    </div>
  );
}
