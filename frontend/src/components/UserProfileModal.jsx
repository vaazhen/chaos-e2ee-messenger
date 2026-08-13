import { useEffect, useRef, useState } from "react";
import Ava from "./Ava";
import Modal from "./ui/Modal";
import { getAlias, setAlias } from "../contactAliases";
import {
  BellIcon,
  BellOffIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  SearchIcon,
  ShieldIcon,
} from "./Icons";

const BACKGROUNDS = [
  { key: "clean", label: ["Чистый", "Clean"] },
  { key: "grid", label: ["Сетка", "Grid"] },
  { key: "noise", label: ["Шум", "Noise"] },
  { key: "gradient", label: ["Градиент", "Gradient"] },
  { key: "dots", label: ["Точки", "Dots"] },
  { key: "waves", label: ["Волны", "Waves"] },
];

function bgLabel(key, l) {
  const item = BACKGROUNDS.find((bg) => bg.key === key) || BACKGROUNDS[0];
  return l(item.label[0], item.label[1]);
}

function InfoRow({ label, value, onClick }) {
  return (
    <button type="button" className="up-info-row" onClick={onClick}>
      <span className="up-info-label">{label}</span>
      <span className="up-info-value">{value}</span>
      <ChevronRightIcon />
    </button>
  );
}

export default function UserProfileModal({
  me,
  chat,
  chatBg,
  onChangeBg,
  onClose,
  onOpenSearch,
  onVerifyEncryption,
  onAliasChange,
  muted,
  onToggleMute,
  l = (ru) => ru,
}) {
  const [aliasDraft, setAliasDraft] = useState("");
  const [view, setView] = useState("main");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  useEffect(() => {
    setAliasDraft(getAlias(me?.id, chat?.otherUserId) || "");
    setView("main");
    setCopied(false);
  }, [me?.id, chat?.otherUserId, chat?.id]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  if (!chat) return null;

  const isGroup = chat.type === "group";
  const title = chat.name || l("Профиль", "Profile");
  const statusText = isGroup
    ? `${chat.members || 0} ${l("участников", "members")}`
    : (chat.online ? l("в сети", "online") : l("был недавно", "last seen recently"));
  const canAlias = !isGroup && Boolean(chat.otherUserId);
  const savedAlias = canAlias ? (getAlias(me?.id, chat.otherUserId) || "") : "";
  const aliasLabel = savedAlias || title;

  const saveAlias = () => {
    if (!canAlias) return;
    setAlias(me?.id, chat.otherUserId, aliasDraft);
    onAliasChange?.();
  };

  const goMain = () => {
    if (view === "alias") saveAlias();
    setView("main");
  };

  const copyUsername = async () => {
    if (!chat.username) return;
    try {
      await navigator.clipboard.writeText(`@${chat.username}`);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      /* jsdom / denied clipboard */
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      hideHeader
      title={isGroup ? l("Информация", "Info") : l("Профиль", "Profile")}
      className="profile-modal"
    >
      <button type="button" className="modal-close up-close" onClick={onClose} aria-label="Close" title="Закрыть">
        <CloseIcon />
      </button>

      {view !== "main" && (
        <div className="up-subhead">
          <button type="button" className="up-back" onClick={goMain} aria-label={l("Назад", "Back")}>
            <ChevronLeftIcon />
          </button>
          <b>{view === "alias" ? l("Имя в чатах", "Name in chats") : l("Фон переписки", "Chat background")}</b>
        </div>
      )}

      <div className="up-body">
        {view === "main" && (
          <>
            <div className="up-hero">
              <Ava name={title} colorIdx={chat.colorIdx} size="xl" online={chat.online} avatarUrl={chat.avatarUrl} />
              <b className="up-name">{title}</b>
              {chat.username && (
                <button type="button" className="up-username" onClick={copyUsername} title={l("Скопировать", "Copy")}>
                  {copied ? l("Скопировано", "Copied") : `@${chat.username}`}
                </button>
              )}
              <span className={`up-status${chat.online ? "" : " off"}`}>{statusText}</span>
              {chat.bio ? <p className="up-bio">{chat.bio}</p> : null}
            </div>

            <div className={`up-actions${isGroup ? " is-two" : ""}`}>
              <button
                type="button"
                className={`up-action${muted ? " is-on" : ""}`}
                onClick={() => onToggleMute?.()}
                aria-pressed={Boolean(muted)}
                aria-label={l("Без звука", "Mute")}
              >
                {muted ? <BellOffIcon /> : <BellIcon />}
                <span>{l("Без звука", "Mute")}</span>
              </button>
              <button
                type="button"
                className="up-action"
                onClick={() => { onOpenSearch?.(); onClose?.(); }}
                aria-label={l("Поиск сообщений", "Search messages")}
              >
                <SearchIcon />
                <span>{l("Поиск", "Search")}</span>
              </button>
              {!isGroup && (
                <button
                  type="button"
                  className="up-action"
                  onClick={() => { onVerifyEncryption?.(); onClose?.(); }}
                  aria-label={l("Проверка шифрования", "Verify encryption")}
                >
                  <ShieldIcon />
                  <span>{l("Проверка", "Verify")}</span>
                </button>
              )}
            </div>

            <div className="settings-list up-info">
              {canAlias && (
                <InfoRow
                  label={l("Имя в чатах", "Name in chats")}
                  value={aliasLabel}
                  onClick={() => setView("alias")}
                />
              )}
              <InfoRow
                label={l("Фон переписки", "Chat background")}
                value={bgLabel(chatBg, l)}
                onClick={() => setView("bg")}
              />
            </div>
          </>
        )}

        {view === "alias" && (
          <div className="up-pane">
            <input
              className="settings-sheet-input"
              value={aliasDraft}
              onChange={(e) => setAliasDraft(e.target.value)}
              placeholder={chat.name || l("Имя", "Name")}
              maxLength={64}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveAlias();
                  setView("main");
                }
              }}
            />
            <p className="up-hint">
              {l(
                "Это имя видишь только ты. У собеседника оно не изменится.",
                "Only you see this name. It doesn't change how others see them."
              )}
            </p>
          </div>
        )}

        {view === "bg" && (
          <div className="up-pane">
            <div className="up-bg-picker bg-picker">
              {BACKGROUNDS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`bg-option bg-${item.key}${chatBg === item.key ? " active" : ""}`}
                  onClick={() => onChangeBg?.(item.key)}
                >
                  <span />
                  <b>{l(item.label[0], item.label[1])}</b>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
