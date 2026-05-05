import { useMemo, useState, useEffect } from "react";
import Ava from "./Ava";
import { truncateChatPreview } from "../helpers";

const FILTERS = [
  { key: "all",    label: "Все" },
  { key: "direct", label: "Личные" },
  { key: "group",  label: "Группы" },
  { key: "saved",  label: "Избранное" },
  { key: "unread", label: "Непрочитанные" },
];

function chatActivityMs(chat) {
  const raw =
    chat?.lastActivityAt ||
    chat?.lastMessageAt ||
    chat?.updatedAt ||
    chat?.createdAt ||
    null;

  if (!raw) return 0;

  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

export default function ChatList({
  me,
  chats = [],
  requests = [],
  activeId,
  search = "",
  loadingChats,
  filter = "all",
  onFilterChange = () => {},
  onSelectChat,
  onПоиск = () => {},
  onNewChat,
  onOpenНастройки,
  onMarkAllRead,
  onDeleteChat,
  onDeleteChatEveryone,
  onToggleMuteChat,
  onToggleArchiveChat,
  sidebarCompact = false,
  sidebarResizeEnabled = false,
  onSidebarResizePointerDown,
  onSidebarResizePointerMove,
  onSidebarResizePointerUp,
  onSidebarResizePointerCancel,
  onSidebarResizeLostCapture,
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchFocused, setПоискFocused] = useState(false);
  const [chatMenu, setChatMenu] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const myName = [me?.firstName, me?.lastName].filter(Boolean).join(" ") || me?.username || "Я";

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();

    const source = chats.filter(c => showArchived ? c.archived : !c.archived);

    return source.filter(chat => {
      if (!chat?.id) return false;

      if (filter === "direct" && chat.type !== "direct") return false;
      if (filter === "group"  && chat.type !== "group")  return false;
      if (filter === "saved"  && chat.type !== "saved")  return false;
      if (filter === "unread" && !(chat.unread > 0))     return false;

      if (!q) return true;

      return [
        chat.name,
        chat.username,
        chat.preview,
      ].some(v => String(v || "").toLowerCase().includes(q));
    }).sort((a, b) => {
      const byActivity = chatActivityMs(b) - chatActivityMs(a);
      if (byActivity !== 0) return byActivity;

      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [chats, search, filter, showArchived]);

  const archivedCount = useMemo(
    () => chats.filter(c => c.archived).length,
    [chats]
  );
  const requestsCount = useMemo(
    () => (requests || []).filter(r => r?.isRequest).length,
    [requests]
  );
  const currentFilter = showArchived ? "Архив" : (FILTERS.find(f => f.key === filter)?.label || "Все");

  const selectChat = (chatId) => {
    if (!chatId) return;
    setFilterOpen(false);
    onSelectChat?.(chatId);
  };

  useEffect(() => {
    if (sidebarCompact) {
      setFilterOpen(false);
      setChatMenu(null);
    }
  }, [sidebarCompact]);

  return (
    <aside
      className={`home-screen${sidebarCompact ? " home-screen--compact" : ""}`}
      onClick={() => { setFilterOpen(false); setChatMenu(null); }}
    >
      <style>{PLUS_BUTTON_CSS}</style>
      <div className="ios-status-spacer" />

      <header className={`home-topbar${sidebarCompact ? " home-topbar--compact" : ""}`}>
        <button
          type="button"
          className="avatar-button"
          onClick={(e) => {
            e.stopPropagation();
            setFilterOpen(false);
            onOpenНастройки?.();
          }}
          title="Настройки"
        >
          <Ava user={me} name={myName} className="avatar-face" />
        </button>

        {!sidebarCompact && <div className="screen-title">Чаты</div>}

        <div className="home-topbar-end">
          {!sidebarCompact && (
            <button
              type="button"
              className={`round-action filter-top-btn${filterOpen ? " active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setFilterOpen(v => !v);
              }}
              title="Фильтры"
            >
              ≡
            </button>
          )}
        </div>

        {!sidebarCompact && filterOpen && (
          <div className="filter-popover" onClick={e => e.stopPropagation()}>
            <div className="filter-title">Показать</div>

            {FILTERS.map(item => (
              <button
                key={item.key}
                type="button"
                className="filter-item"
                onClick={() => {
                  onFilterChange(item.key);
                  setFilterOpen(false);
                }}
              >
                <span className="filter-check">{filter === item.key ? "✓" : ""}</span>
                <span>{item.label}</span>
              </button>
            ))}

            <div className="filter-sep" />

            <button
              type="button"
              className="filter-item"
              onClick={() => {
                onMarkAllRead?.();
                setFilterOpen(false);
              }}
            >
              <span className="filter-check">✓</span>
              <span>Прочитать все</span>
            </button>
          </div>
        )}
      </header>

      <main className={`home-content scroll${sidebarCompact ? " home-content--compact" : ""}`}>
        {!sidebarCompact && (
        <div className="list-hint">
          <span>{currentFilter}</span>
          <button
            type="button"
            className={`archive-toggle-btn${showArchived ? " active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowArchived(v => !v);
              setChatMenu(null);
            }}
            title={showArchived ? "Показать обычные чаты" : "Открыть архив"}
          >
            Архив{archivedCount > 0 ? ` (${archivedCount})` : ""}
          </button>
          {search.trim() && <b>поиск: {search.trim()}</b>}
        </div>
        )}

        {loadingChats ? (
          <div className="product-empty">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="product-empty">
            <div className="product-empty-icon">◯</div>
            <div className="product-empty-title">Нет чатов</div>
            <div className="product-empty-sub">Создайте переписку или выберите другой фильтр.</div>
          </div>
        ) : (
          <div className={`conversation-list${sidebarCompact ? " conversation-list--compact" : ""}`}>
            {filtered.map(chat => {
              const hasPreview = Boolean(chat.preview || chat.lastMessageId);
              const isEncrypted = !chat.preview && chat.lastMessageId;
              const basePreview = chat.preview
                || (isEncrypted ? "Зашифрованное сообщение" : "Сообщений пока нет");
              const prefix = chat.lastOut && chat.preview ? "Вы: " : "";
              const fullPreview = truncateChatPreview(prefix + basePreview);

              return (
              <button
                key={chat.id}
                type="button"
                className={`conversation-item${Number(activeId) === Number(chat.id) ? " active" : ""}`}
                title={sidebarCompact ? chat.name : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  selectChat(chat.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setChatMenu({
                    id: chat.id,
                    muted: Boolean(chat.muted),
                    archived: Boolean(chat.archived),
                    x: Math.min(e.clientX, window.innerWidth - 220),
                    y: Math.min(e.clientY, window.innerHeight - 220),
                  });
                }}
              >
                <span className="conversation-ava-wrap">
                  <Ava name={chat.name} colorIdx={chat.colorIdx} size="md" online={chat.online} avatarUrl={chat.avatarUrl} />
                  {chat.unread > 0 && (
                    <span className="conversation-unread-floating">
                      {chat.unread > 99 ? "99+" : chat.unread}
                    </span>
                  )}
                </span>

                <div className="conversation-main">
                  <div className="conversation-line">
                    <span className="conversation-name trim">
                      {chat.name}
                      {chat.muted && (
                        <span className="mute-icon-inline" aria-label="Muted" title="Muted">
                          <svg viewBox="0 0 24 24">
                            <path d="M5 10v4h4l5 4V6l-5 4H5z" />
                            <path d="M4 4l16 16" />
                          </svg>
                        </span>
                      )}
                    </span>
                    <div className="conversation-tools">
                      <span className="conversation-time">{chat.time}</span>
                    </div>
                  </div>

                  <div className="conversation-line">
                    <span className="conversation-preview trim">
                      {fullPreview}
                    </span>

                    {chat.type === "group" && <span className="soft-chip">{chat.members}</span>}
                    {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                  </div>

                </div>
              </button>
            );})}
          </div>
        )}
      </main>

      {chatMenu && (
        <div
          className="chat-item-menu"
          style={{ left: chatMenu.x, top: chatMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="ctx-item" onClick={() => { onDeleteChat?.(chatMenu.id); setChatMenu(null); }}>
            <span className="ci">⌫</span>Удалить у себя
          </button>
          <button type="button" className="ctx-item" onClick={() => { onDeleteChatEveryone?.(chatMenu.id); setChatMenu(null); }}>
            <span className="ci">⨯</span>Удалить у всех
          </button>
          <button type="button" className="ctx-item" onClick={() => { onToggleMuteChat?.(chatMenu.id); setChatMenu(null); }}>
            <span className="ci">◔</span>{chatMenu.muted ? "Включить звук" : "Выключить звук"}
          </button>
          <button type="button" className="ctx-item" onClick={() => { onToggleArchiveChat?.(chatMenu.id); setChatMenu(null); }}>
            <span className="ci">▤</span>{chatMenu.archived ? "Убрать из архива" : "В архив"}
          </button>
        </div>
      )}

      <footer
        className={`floating-searchbar restored${searchFocused ? " focused" : ""}${sidebarCompact ? " floating-searchbar--compact" : ""}`}
        onClick={e => e.stopPropagation()}
      >
        <label className="bottom-search restored-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={e => onПоиск(e.target.value)}
            onFocus={() => setПоискFocused(true)}
            onBlur={() => setПоискFocused(false)}
            placeholder="Поиск"
          />
        </label>

        <button
          type="button"
          className="bottom-round new-chat-action-btn"
          onClick={onNewChat}
          title="Новый чат"
        >
          <span className="new-chat-plus-icon" aria-hidden="true" />
          {requestsCount > 0 && <span className="badge plus-req-badge">{requestsCount}</span>}
        </button>
      </footer>

      {sidebarResizeEnabled && onSidebarResizePointerDown && (
        <div
          className="sidebar-resize-handle"
          onPointerDown={onSidebarResizePointerDown}
          onPointerMove={onSidebarResizePointerMove}
          onPointerUp={onSidebarResizePointerUp}
          onPointerCancel={onSidebarResizePointerCancel}
          onLostPointerCapture={onSidebarResizeLostCapture}
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину списка чатов"
        />
      )}
    </aside>
  );
}
const PLUS_BUTTON_CSS = `
.floating-searchbar.restored{
  grid-template-columns:1fr 60px;
  gap:10px;
  align-items:center;
}

.floating-searchbar.restored.floating-searchbar--compact{
  grid-template-columns:1fr!important;
  justify-items:center;
  left:10px;
  right:16px;
}
.floating-searchbar.restored.floating-searchbar--compact .restored-search{
  display:none!important;
}
.floating-searchbar.restored.floating-searchbar--compact .bottom-round.new-chat-action-btn{
  width:52px;
  height:52px;
  min-width:52px;
}

.floating-searchbar.restored.floating-searchbar--compact .bottom-round.new-chat-action-btn .plus-req-badge{
  right:0;
}

.bottom-round.new-chat-action-btn{
  position:relative;
  width:56px;
  height:56px;
  min-width:56px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:0;
  line-height:1;
}
.plus-req-badge{
  position:absolute;
  top:-5px;
  right:-5px;
  min-width:16px;
  height:16px;
  padding:0 4px;
  font-size:10px;
}

.new-chat-plus-icon{
  position:relative;
  display:block;
  width:18px;
  height:18px;
}

.new-chat-plus-icon::before,
.new-chat-plus-icon::after{
  content:"";
  position:absolute;
  left:50%;
  top:50%;
  width:18px;
  height:2px;
  border-radius:999px;
  background:var(--t1);
  transform:translate(-50%,-50%);
}

.new-chat-plus-icon::after{
  transform:translate(-50%,-50%) rotate(90deg);
}
`;