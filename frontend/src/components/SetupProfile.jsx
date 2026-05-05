import { useState, useEffect, useRef } from "react";
import { api, setToken } from "../api";
import { initials } from "../helpers";

function resizeAvatarFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("\u0424\u0430\u0439\u043b \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0431\u043e\u043b\u044c\u0448\u043e\u0439. \u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435 \u0434\u043e 7 \u041c\u0411.")); return;
    }
    if (file.size > 7 * 1024 * 1024) {
      reject(new Error("Файл слишком большой. Выберите изображение до 7 МБ.")); return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d");
        const minSide = Math.min(img.width, img.height);
        const sx = Math.floor((img.width  - minSide) / 2);
        const sy = Math.floor((img.height - minSide) / 2);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u0442\u044c \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435")); };
    img.src = url;
  });
}

const LS_PREFIXES = ["cm_device_id", "cm_device_bundle_v2", "cm_e2ee_sessions_v4"];

function migrateLocalStorageKeys(oldUsername, newUsername) {
  if (!oldUsername || !newUsername || oldUsername === newUsername) return;
  LS_PREFIXES.forEach(prefix => {
    const oldKey = `${prefix}:${oldUsername}`;
    const newKey = `${prefix}:${newUsername}`;
    const value  = localStorage.getItem(oldKey);
    if (value !== null) {
      localStorage.setItem(newKey, value);
      localStorage.removeItem(oldKey);
    }
  });
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

// setupToken  — present for new phone users before JWT exists
// onFinishSetup(data) — completes phone setup and creates the first JWT session
// onDone(updatedMe)   — called after profile update for users that already have JWT
export default function SetupProfile({ me, setupToken, onFinishSetup, onDone }) {
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState(null);
  const [firstName,         setFirstName]         = useState("");
  const [lastName,          setLastName]          = useState("");
  const [username,          setUsername]          = useState("");
  const [bio,               setBio]               = useState("");
  const [usernameStatus,    setUsernameStatus]    = useState(null);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState(null);
  const bioRef = useRef(null);
  const MAX_BIO_LEN = 200;

  const rawLang =
    (typeof localStorage !== "undefined" && localStorage.getItem("cm_lang")) ||
    (typeof navigator !== "undefined" && navigator.language) ||
    "en";

  const lang = String(rawLang).toLowerCase().startsWith("ru") ? "ru" : "en";
  const t = (ru, en) => (lang === "ru" ? ru : en);

  useEffect(() => {
    const el = bioRef.current;
    if (!el) return;

    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [bio]);

  useEffect(() => {
    if (me?.firstName) setFirstName(v => v || me.firstName);
    if (me?.lastName)  setLastName(v => v || me.lastName);
    if (me?.avatarUrl) setUploadedAvatarUrl(v => v || me.avatarUrl);
    if (me?.username && !me.username.match(/^user_[a-z0-9]{6,8}$/)) {
      setUsername(v => v || me.username);
    }
  }, [me]);

  useEffect(() => {
    const normalized = normalizeUsername(username);

    if (!normalized) { setUsernameStatus(null); return; }
    if (normalized.length < 3 || normalized.length > 32) { setUsernameStatus("invalid"); return; }
    if (!/^[a-z0-9_]+$/.test(normalized)) { setUsernameStatus("invalid"); return; }
    if (me?.username && normalized === normalizeUsername(me.username)) { setUsernameStatus("ok"); return; }

    let alive = true;
    setUsernameStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const res = await api.usernameAvailable(normalized);
        if (!alive) return;
        setUsernameStatus(res?.available ? "ok" : "taken");
      } catch {
        if (alive) setUsernameStatus("unknown");
      }
    }, 350);

    return () => { alive = false; clearTimeout(timer); };
  }, [username, me?.username]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setError(null);
      const dataUrl = await resizeAvatarFile(file);
      setUploadedAvatarUrl(dataUrl);
    } catch (err) {
      setError(err.message);
    }
  };

  const normalizedUsername = normalizeUsername(username);
  const canSubmit = Boolean(
    firstName.trim() &&
    normalizedUsername &&
    usernameStatus === "ok" &&
    !loading
  );

  const handleSave = async () => {
    if (!firstName.trim()) { setError(t("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043c\u044f", "Enter your first name")); return; }
    if (usernameStatus !== "ok") { setError(t("\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 username", "Choose a valid username")); return; }

    setLoading(true);
    setError(null);

    try {
      const data = {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        username:  normalizedUsername,
        avatarUrl: uploadedAvatarUrl || null,
      };

      if (setupToken && onFinishSetup) {
        await onFinishSetup(data);
        return;
      }

      const res = await api.updateProfile(data);
      if (res?.token) {
        migrateLocalStorageKeys(me?.username, res.username || data.username);
        setToken(res.token);
      }
      onDone({
        ...me,
        firstName: data.firstName,
        lastName:  data.lastName,
        username:  res?.username || data.username,
        avatarUrl: data.avatarUrl,
      });
    } catch (e) {
      setError(e.message || t("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c", "Failed to save"));
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-glow" />
      <div className="auth-card setup-card">
        {error && <div className="err-bar">{error}</div>}

        <div className="setup-avatar-wrap">
          <label className="setup-avatar-upload" title={t("\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0444\u043e\u0442\u043e", "Upload photo")}>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
            {uploadedAvatarUrl ? (
              <img src={uploadedAvatarUrl} alt="avatar" />
            ) : (
              <span>{initials(firstName || username || "?")}</span>
            )}
            <em
              style={{
                display: "grid",
                placeItems: "center",
                fontSize: 17,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              +
            </em>
          </label>
          <div className="setup-avatar-caption">{t("\u041d\u0430\u0436\u043c\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0444\u043e\u0442\u043e", "Click to upload photo")}</div>
        </div>

        <h1 className="auth-title" style={{ marginBottom: 20 }}>{t("\u0420\u0430\u0441\u0441\u043a\u0430\u0436\u0438\u0442\u0435 \u043e \u0441\u0435\u0431\u0435", "Tell us about yourself")}</h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="auth-label">{t("\u0418\u043c\u044f *", "First name *")}</div>
            <input className="inp" placeholder="John" value={firstName}
              onChange={e => setFirstName(e.target.value)} autoFocus />
          </div>
          <div style={{ flex: 1 }}>
            <div className="auth-label">{t("\u0424\u0430\u043c\u0438\u043b\u0438\u044f", "Last name")}</div>
            <input className="inp" placeholder="Smith" value={lastName}
              onChange={e => setLastName(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 6 }}>
          <div className="auth-label">Username *</div>
          <input className="inp" placeholder="ivan_petrov" value={username}
            onChange={e => setUsername(e.target.value.toLowerCase())} maxLength={32} />
          <div
            className="username-check"
            style={{ minHeight: 14, marginTop: 6, marginBottom: 0, lineHeight: 1.2 }}
          >
            {usernameStatus === "checking" && (
              <span>{t("\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c...", "Checking...")}</span>
            )}

            {usernameStatus === "ok" && (
              <span className="username-ok">
                ✓ {t("\u0421\u0432\u043e\u0431\u043e\u0434\u0435\u043d", "Available")}
              </span>
            )}

            {usernameStatus === "taken" && (
              <span className="username-err">
                ✗ {t("\u0423\u0436\u0435 \u0437\u0430\u043d\u044f\u0442", "Already taken")}
              </span>
            )}

            {usernameStatus === "invalid" && (
              <span className="username-err">
                ✗ {t("\u0422\u043e\u043b\u044c\u043a\u043e \u043b\u0430\u0442\u0438\u043d\u0438\u0446\u0430, \u0446\u0438\u0444\u0440\u044b \u0438 _", "Only lowercase letters, digits and _")}
              </span>
            )}

            {usernameStatus === "unknown" && (
              <span className="username-err">
                ✗ {t("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c username", "Could not check username")}
              </span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="auth-label" style={{ marginTop: 4, marginBottom: 8 }}>{t("\u041e \u0441\u0435\u0431\u0435", "Bio")}</div>
          <div style={{ position: "relative" }}>
            <textarea
              ref={bioRef}
              className="inp"
              placeholder={t("\u041d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0441\u043b\u043e\u0432 \u043e \u0441\u0435\u0431\u0435...", "A few words about yourself...")}
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, MAX_BIO_LEN))}
              onInput={() => {
                const el = bioRef.current;
                if (!el) return;
                el.style.height = "0px";
                el.style.height = Math.min(el.scrollHeight, 220) + "px";
              }}
              maxLength={MAX_BIO_LEN}
              rows={1}
              style={{
                resize: "none",
                overflow: "hidden",
                minHeight: 60,
                maxHeight: 220,
                paddingBottom: 28,
                boxSizing: "border-box",
                lineHeight: 1.45,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 16,
                bottom: 10,
                fontSize: 12,
                fontWeight: 800,
                color: "var(--t2)",
                opacity: 0.72,
                pointerEvents: "none",
              }}
            >
              {bio.length}/{MAX_BIO_LEN}
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!canSubmit}
        >
          {loading ? t("\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c...", "Saving...") : t("\u0412\u043e\u0439\u0442\u0438 \u0432 \u043c\u0435\u0441\u0441\u0435\u043d\u0434\u0436\u0435\u0440", "Enter messenger")}
        </button>
      </div>
    </div>
  );
}
