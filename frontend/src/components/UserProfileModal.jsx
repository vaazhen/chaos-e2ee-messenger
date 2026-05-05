import { useEffect, useMemo, useState } from "react";
import Ava from "./Ava";
import { getAlias, setAlias } from "../contactAliases";

export default function UserProfileModal({ me, chat, onClose, onAliasChanged }) {
  const otherUserId = chat?.otherUserId;
  const username = chat?.username || "";
  const initialAlias = useMemo(
    () => (otherUserId ? getAlias(me?.id, otherUserId) : ""),
    [me?.id, otherUserId]
  );

  const [alias, setAliasValue] = useState(initialAlias);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAliasValue(initialAlias);
  }, [initialAlias]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const save = () => {
    if (!otherUserId) return;
    setSaving(true);
    try {
      setAlias(me?.id, otherUserId, alias);
      onAliasChanged?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  if (!chat) return null;

  const isGroup = chat.type === "group";
  const title = chat.name || "Профиль";
  const statusText = isGroup
    ? `${chat.members || 0} участников`
    : (chat.online ? "в сети" : "был недавно");
  const bioText = String(chat.bio || "").trim();
  const accentText = isGroup ? "Групповой чат" : "Личный чат";
  const hasLocalAlias = !isGroup && alias.trim().length > 0;

  return (
    <div className="modal-bg user-profile-modal-bg" onClick={onClose}>
      <div className="user-profile-screen" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="sheet-title">{isGroup ? "Информация" : "Профиль"}</div>
          <button className="round-action" onClick={onClose} title="Close">×</button>
        </div>

        <div className="user-profile-content scroll">
          <div className="user-profile-hero">
            <div className="user-profile-hero-top">
              <Ava
                name={title}
                colorIdx={chat.colorIdx}
                size="lg"
                online={chat.online}
                avatarUrl={chat.avatarUrl}
              />
              <div className="user-profile-hero-main">
                <b className="user-profile-name trim">{title}</b>
                {username && <small className="user-profile-sub trim">@{username}</small>}
                <small className={`user-profile-sub user-profile-status ${chat.online ? "" : "off"}`}>
                  {statusText}
                </small>
              </div>
            </div>
            <div className="user-profile-meta-row">
              <span className="user-profile-pill">{accentText}</span>
              {hasLocalAlias && (
                <span className="user-profile-pill user-profile-pill--muted">
                  Имя для вас: {alias.trim()}
                </span>
              )}
            </div>
            {bioText && (
              <div className="user-profile-bio trim">{bioText}</div>
            )}
          </div>

          {!isGroup && (
            <>
              <div className="settings-section">
                <div className="section-title">Имя для вас</div>
                <div className="settings-card user-alias-card">
                  <div className="user-alias-row">
                    <input
                      value={alias}
                      onChange={(e) => setAliasValue(e.target.value)}
                      placeholder="Например: Мой коллега"
                      maxLength={64}
                    />
                    <button
                      type="button"
                      className="soft-btn"
                      onClick={save}
                      disabled={saving}
                    >
                      Сохранить
                    </button>
                  </div>
                  <div className="user-alias-hint">
                    Это имя видно только вам (локально на этом устройстве).
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

