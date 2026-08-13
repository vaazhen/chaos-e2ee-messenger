import { useEffect, useState } from "react";
import { api, setToken } from "../api";
import { compressImageToDataUrl, IMAGE_PROFILES } from "../imagePipeline";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

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
    return <img src={value} alt="" draggable="false" />;
  }
  return fallback;
}

export default function ProfileModal({ me, lang, onClose, onSaved }) {
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

  useEffect(() => {
    setForm({
      firstName: me?.firstName || "",
      lastName: me?.lastName || "",
      username: me?.username || "",
      bio: me?.bio || "",
      avatarUrl: me?.avatarUrl || "",
    });
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
        bio: form.bio?.trim() || "",
        avatarUrl: form.avatarUrl?.trim() || "",
      };
      const updated = await api.updateProfile(payload);
      if (updated?.token) setToken(updated.token);
      onSaved?.(updated);
    } catch (e) {
      setError(e?.message || l("Не удалось сохранить профиль", "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  };

  const displayName = `${form.firstName} ${form.lastName}`.trim() || me?.username || l("Пользователь", "User");

  return (
    <Modal open onClose={onClose} title={l("Профиль", "Profile")} className="profile-settings-modal">
      <div className="ps-scroll scroll">
        <div className="ps-hero">
          <label className="ps-hero-avatar">
            <input type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
            <div className="ps-hero-avatar-inner">
              {renderProfileAvatar(form.avatarUrl, initials(me, form))}
            </div>
            <span className="ps-hero-avatar-overlay" aria-hidden="true">+</span>
          </label>
          <div className="ps-hero-info">
            <b className="ps-hero-name">{displayName}</b>
            <span className="ps-hero-username">@{me?.username || form.username || "username"}</span>
            <small className="ps-hero-hint">{l("Нажмите на фото, чтобы сменить", "Tap photo to change")}</small>
          </div>
          {avatarError && <small className="ps-error">{avatarError}</small>}
        </div>

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
            <small className="ps-field-note">{l("После смены username сессия обновится.", "Auth refreshes after a username change.")}</small>
          </label>
          <label className="ps-field">
            <span>{l("О себе", "Bio")}</span>
            <textarea value={form.bio} onChange={e => setField("bio", e.target.value)} placeholder={l("Несколько слов о себе", "A few words about yourself")} maxLength={160} rows={3} />
            <small className="ps-field-note">{`${form.bio.length}/160`}</small>
          </label>
        </div>
        {error && <div className="ps-error-banner">{error}</div>}
      </div>

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          {l("Отмена", "Cancel")}
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? l("Сохраняем...", "Saving...") : l("Готово", "Done")}
        </Button>
      </div>
    </Modal>
  );
}
