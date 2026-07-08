import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Ava from "./Ava";
import ChatInfoPanel from "./ChatInfoPanel";
import useSwipeDown from "../hooks/useSwipeDown";

export default function UserProfileModal({
  me,
  chat,
  chatBg,
  onChangeBg,
  onClose,
  onCall,
  onVideoCall,
  onOpenSearch,
  muted,
  onToggleMute,
  l = (ru) => ru,
}) {
  const modalRef = useRef(null);
  const [animMute, setAnimMute] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  useSwipeDown(modalRef, onClose);

  const handleMute = () => {
    setAnimMute(true);
    setTimeout(() => setAnimMute(false), 350);
    onToggleMute?.();
  };

  if (!chat) return null;

  const isGroup = chat.type === "group";
  const title = chat.name || l("Профиль", "Profile");
  const statusText = isGroup
    ? `${chat.members || 0} ${l("участников", "members")}`
    : (chat.online ? l("в сети", "online") : l("был недавно", "last seen recently"));

  return (
    <div className="modal-bg" onClick={onClose}>
      <div ref={modalRef} className="modal profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          {isGroup ? l("Информация", "Info") : l("Профиль", "Profile")}
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="up-hero">
          <Ava name={title} colorIdx={chat.colorIdx} size="xl" online={chat.online} avatarUrl={chat.avatarUrl} />
          <b className="up-name">{title}</b>
          {chat.username && <small className="up-username">@{chat.username}</small>}
          <small className={`up-status ${chat.online ? "" : "off"}`}>{statusText}</small>
        </div>

        <div className="up-actions">
          <button type="button" className="up-action-btn" onClick={() => onCall?.()}>
            <span className="up-action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22l-4-9-9-4z" />
              </svg>
            </span>
            <span className="up-action-label">{l("Звонок", "Call")}</span>
          </button>
          <button type="button" className="up-action-btn" onClick={() => onVideoCall?.()}>
            <span className="up-action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </span>
            <span className="up-action-label">{l("Видео", "Video")}</span>
          </button>
          <button type="button" className={`up-action-btn${muted || animMute ? " muted" : ""}`} onClick={handleMute}>
            <span className="up-action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M9 9v.1" />
                <path d="M16 9A5 5 0 0 1 21 14M2 17.6A9 9 0 0 1 9 4" />
              </svg>
            </span>
            <span className="up-action-label">{muted ? l("Вкл. звук", "Unmute") : l("Без звука", "Mute")}</span>
          </button>
        </div>

        <button type="button" className="up-row" onClick={() => { onOpenSearch?.(); onClose?.(); }}>
          <span className="up-row-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16.2 16.2L21 21" />
            </svg>
          </span>
          <b>{l("Поиск сообщений", "Search messages")}</b>
          <i>›</i>
        </button>

        <button type="button" className="up-row" onClick={() => setShowSettings(true)}>
          <span className="up-row-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="8" r="1.2" fill="currentColor" stroke="none" />
              <path d="M12 11v5" />
            </svg>
          </span>
          <b>{l("Ещё", "More")}</b>
          <i>›</i>
        </button>

        <div className="profile-media-section">
          <div className="profile-media-tabs">
            {[
              { key: "media", label: l("Медиа", "Media") },
              { key: "files", label: l("Файлы", "Files") },
              { key: "voice", label: l("Голосовые", "Voice") },
              { key: "links", label: l("Ссылки", "Links") },
            ].map(t => (
              <button key={t.key} type="button" className="profile-media-tab disabled" disabled>
                <span className="pmt-icon">
                  {t.key === "media" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  )}
                  {t.key === "files" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  )}
                  {t.key === "voice" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  )}
                  {t.key === "links" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                </span>
                <span className="pmt-label">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="profile-media-empty">
            {l("Медиа и файлы пока не доступны", "Media and files not available yet")}
          </div>
        </div>

        {showSettings && createPortal((
          <div className="ps-submodal-bg" onClick={() => setShowSettings(false)}>
            <div className="ps-submodal" onClick={e => e.stopPropagation()}>
              <div className="ps-submodal-header">
                <b>{l("Настройки чата", "Chat settings")}</b>
                <button type="button" className="modal-close" onClick={() => setShowSettings(false)}>×</button>
              </div>
              <div className="ps-submodal-scroll">
                <ChatInfoPanel
                  chat={chat}
                  chatBg={chatBg}
                  onChangeBg={onChangeBg}
                  onClose={() => setShowSettings(false)}
                  noWrapper
                />
              </div>
            </div>
          </div>
        ), document.body)}
      </div>
    </div>
  );
}
