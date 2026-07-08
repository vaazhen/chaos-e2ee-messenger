import { useMemo, useState, useEffect } from "react";
import Ava from "./Ava";
import { truncateChatPreview } from "../helpers";
import { SearchIcon, DeleteIcon, MuteIcon, UnmuteIcon, ArchiveIcon, CloseIcon, PlusIcon, CheckIcon } from "./Icons";
import BottomNav from "./BottomNav";

function chatActivityMs(chat) {
  const raw = chat?.lastActivityAt || chat?.lastMessageAt || chat?.updatedAt || chat?.createdAt || null;
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

export default function ChatList({
  me, chats = [], requests = [], activeId, search = "", loadingChats,
  filter = "all", onFilterChange = () => {}, onSelectChat, onПоиск = () => {},
  onNewChat, onOpenНастройки, onMarkAllRead, onDeleteChat, onDeleteChatEveryone,
  onToggleMuteChat, onToggleArchiveChat, sidebarCompact = false,
  sidebarResizeEnabled = false, onSidebarResizePointerDown,
  onSidebarResizePointerMove, onSidebarResizePointerUp,
  onSidebarResizePointerCancel, onSidebarResizeLostCapture,
  l = (ru) => ru, activeTab = "chats", onNavChange = () => {},
}) {
  const [chatMenu, setChatMenu] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const filters = useMemo(() => [
    { key: "all", label: l("Все", "All") },
    { key: "direct", label: l("Личные", "Direct") },
    { key: "group", label: l("Группы", "Groups") },
    { key: "saved", label: l("Избранное", "Saved Messages") },
    { key: "unread", label: l("Непрочитанные", "Unread") },
    { key: "archived", label: l("Архив", "Archive") },
  ], [l]);

  const myName = [me?.firstName, me?.lastName].filter(Boolean).join(" ") || me?.username || l("Я", "Me");
  const unreadTotal = useMemo(() => chats.filter(c => c.unread > 0).length, [chats]);
  const requestsCount = useMemo(() => (requests || []).filter(r => r?.isRequest).length, [requests]);

  const chatDisplayName = (chat) => {
    if (chat?.type === "saved") return l("Избранное", "Saved Messages");
    if (chat?.type === "group" && (!chat.name || chat.name === "Группа" || chat.name === "Group")) return l("Группа", "Group");
    return chat?.name || "";
  };

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    const source = chats;
    return source.filter(chat => {
      if (!chat?.id) return false;
      if (filter === "archived" && !chat.archived) return false;
      if (filter !== "archived" && chat.archived) return false;
      if (filter === "direct" && chat.type !== "direct") return false;
      if (filter === "group"  && chat.type !== "group")  return false;
      if (filter === "saved"  && chat.type !== "saved")  return false;
      if (filter === "unread" && !(chat.unread > 0))     return false;
      if (!q) return true;
      return [chat.name, chat.username, chat.preview].some(v => String(v || "").toLowerCase().includes(q));
    }).sort((a, b) => {
      const byActivity = chatActivityMs(b) - chatActivityMs(a);
      if (byActivity !== 0) return byActivity;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [chats, search, filter]);

  const selectChat = (chatId) => { if (!chatId) return; onSelectChat?.(chatId); };

  useEffect(() => { if (sidebarCompact) setChatMenu(null); }, [sidebarCompact]);

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(filtered.map(c => c.id)));
  const exitSelect = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const renderConvList = () => {
    if (loadingChats) return <div className="product-empty"><div className="spinner" /></div>;
    if (filtered.length === 0) return (
      <div className="product-empty">
        <div className="product-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="product-empty-title">{l("Нет чатов", "No chats")}</div>
        <div className="product-empty-sub">{l("Создайте переписку.", "Create a conversation.")}</div>
      </div>
    );
    return (
      <div className={`conversation-list${sidebarCompact ? " conversation-list--compact" : ""}`}>
        {filtered.map(chat => {
          const isEncrypted = !chat.preview && chat.lastMessageId;
          const basePreview = chat.preview || (isEncrypted ? l("Зашифрованное сообщение", "Encrypted message") : l("Сообщений пока нет", "No messages yet"));
          const prefix = chat.lastOut && chat.preview ? l("Вы: ", "You: ") : "";
          const fullPreview = truncateChatPreview(prefix + basePreview);
          const hasUnread = chat.unread > 0;
          return (
            <button key={chat.id} type="button"
              className={`conversation-item${Number(activeId) === Number(chat.id) && !selectMode ? " active" : ""}${hasUnread ? " unread" : ""}`}
              title={sidebarCompact ? chatDisplayName(chat) : undefined}
              onClick={(e) => { e.stopPropagation(); if (selectMode) toggleSelect(chat.id); else selectChat(chat.id); }}
              onContextMenu={(e) => {
                if (selectMode) return;
                e.preventDefault(); e.stopPropagation();
                setChatMenu({ id: chat.id, muted: Boolean(chat.muted), archived: Boolean(chat.archived), x: Math.min(e.clientX, window.innerWidth - 220), y: Math.min(e.clientY, window.innerHeight - 220) });
              }}
            >
              {selectMode && (
                <span className={`conv-check${selectedIds.has(chat.id) ? " checked" : ""}`}>
                  {selectedIds.has(chat.id) && <CheckIcon />}
                </span>
              )}
              <span className="conversation-ava-wrap">
                <Ava name={chatDisplayName(chat)} colorIdx={chat.colorIdx} size="md" online={selectMode ? false : chat.online} avatarUrl={chat.avatarUrl} />
                {hasUnread && !selectMode && <span className="conversation-unread-floating">{chat.unread > 99 ? "99+" : chat.unread}</span>}
              </span>
              <div className="conversation-main">
                <div className="conversation-line">
                  <span className="conversation-name">
                    {chatDisplayName(chat)}
                    {chat.muted && <span className="mute-dot" />}
                  </span>
                </div>
                <div className="conversation-line">
                  <span className="conversation-preview">{fullPreview}</span>
                  {chat.type === "group" && !hasUnread && <span className="soft-chip">{chat.members}</span>}
                </div>
              </div>
              <div className="conversation-meta">
                <span className="conversation-time">{chat.time}</span>
                {hasUnread && !selectMode && <span className="unread-badge">{chat.unread > 99 ? "99+" : chat.unread}</span>}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <aside className={`home-screen${sidebarCompact ? " home-screen--compact" : ""}`} onClick={() => setChatMenu(null)}>
      {sidebarCompact ? (
        <header className="home-topbar home-topbar--compact">
          <button className="avatar-button" onClick={() => onNavChange("settings")} title={l("Настройки", "Settings")}>
            <Ava user={me} name={myName} className="avatar-face" />
          </button>
        </header>
      ) : (
        <>
          <header className="sidebar-header">
            <button className="sidebar-action-btn" onClick={() => { if (selectMode) exitSelect(); else setSelectMode(true); }} title={l("Изменить", "Edit")}>
              <span className="select-mode-done">{selectMode ? l("Готово", "Done") : l("Изм.", "Edit")}</span>
            </button>
            <h1 className="sidebar-title sidebar-title--center">{l("Чаты", "Chats")}</h1>
            <div className="sidebar-actions">
              <button className="sidebar-action-btn" onClick={onNewChat} title={l("Новый чат", "New chat")}><PlusIcon /></button>
            </div>
          </header>

          {selectMode && (
            <div className="select-mode-bar">
              <button className="select-mode-action" onClick={toggleAll}>{allSelected ? l("Снять все", "Deselect") : l("Все", "All")}</button>
              <button className="select-mode-action danger" disabled={selectedIds.size === 0}
                onClick={() => { selectedIds.forEach(id => onDeleteChat?.(id)); exitSelect(); }}>
                {l("Удалить", "Delete")} {selectedIds.size > 0 && selectedIds.size}
              </button>
              <button className="select-mode-action" disabled={selectedIds.size === 0}
                onClick={() => { onMarkAllRead?.(); exitSelect(); }}>
                {l("Прочитано", "Read")}
              </button>
            </div>
          )}

          {!selectMode && (
            <>
              <div className="search-shell">
                <span className="shell-icon"><SearchIcon /></span>
                <input value={search} onChange={e => onПоиск(e.target.value)} placeholder={l("Поиск чатов", "Search chats")} />
                {search && <button className="shell-clear" onClick={() => onПоиск("")}><CloseIcon /></button>}
              </div>

              <div className="chat-filters">
                {filters.map(item => (
                  <button key={item.key} className={`filter-pill${filter === item.key ? " active" : ""}`} onClick={() => onFilterChange(item.key)}>
                    {item.label}
                {item.key === "unread" && unreadTotal > 0 && <span className="filter-badge">{unreadTotal}</span>}
              </button>
            ))}
              </div>
            </>
          )}
        </>
      )}

      {sidebarCompact && (
        <footer className="floating-searchbar restored floating-searchbar--compact" onClick={e => e.stopPropagation()}>
          <button className="bottom-round new-chat-action-btn" onClick={onNewChat} title={l("Новый чат", "New chat")}>
            <span className="new-chat-plus-icon" aria-hidden="true" />
            {requestsCount > 0 && <span className="badge plus-req-badge">{requestsCount}</span>}
          </button>
        </footer>
      )}

      <main className={`home-content scroll${sidebarCompact ? " home-content--compact" : ""}`}>
        {renderConvList()}
      </main>

      {chatMenu && (
        <div className="chat-item-menu" style={{ left: chatMenu.x, top: chatMenu.y }} onClick={e => e.stopPropagation()}>
          <button className="ctx-item" onClick={() => { onDeleteChat?.(chatMenu.id); setChatMenu(null); }}><span className="ci"><DeleteIcon /></span>{l("Удалить у себя", "Delete for me")}</button>
          <button className="ctx-item" onClick={() => { onDeleteChatEveryone?.(chatMenu.id); setChatMenu(null); }}><span className="ci"><CloseIcon /></span>{l("Удалить у всех", "Delete for everyone")}</button>
          <button className="ctx-item" onClick={() => { onToggleMuteChat?.(chatMenu.id); setChatMenu(null); }}><span className="ci">{chatMenu.muted ? <UnmuteIcon /> : <MuteIcon />}</span>{chatMenu.muted ? l("Включить звук", "Unmute") : l("Выключить звук", "Mute")}</button>
          <button className="ctx-item" onClick={() => { onToggleArchiveChat?.(chatMenu.id); setChatMenu(null); }}><span className="ci"><ArchiveIcon /></span>{chatMenu.archived ? l("Убрать из архива", "Remove from archive") : l("В архив", "Archive")}</button>
        </div>
      )}
      <BottomNav me={me} myName={myName} activeTab={activeTab} onNavChange={onNavChange} unreadTotal={unreadTotal} l={l} />
      {sidebarResizeEnabled && onSidebarResizePointerDown && (
        <div className="sidebar-resize-handle" onPointerDown={onSidebarResizePointerDown} onPointerMove={onSidebarResizePointerMove} onPointerUp={onSidebarResizePointerUp} onPointerCancel={onSidebarResizePointerCancel} onLostPointerCapture={onSidebarResizeLostCapture} role="separator" aria-orientation="vertical" aria-label={l("Изменить ширину списка чатов", "Resize chat list width")} />
      )}
    </aside>
  );
}
