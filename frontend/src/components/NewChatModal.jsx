import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import DirectTab from "./DirectTab";
import GroupTab, { UserSearchResults } from "./GroupTab";
import RequestsTab from "./RequestsTab";

export default function NewChatModal({
  me,
  onClose,
  onCreated,
  suggestedContacts = [],
  initialTab = "direct",
  requests = [],
  loadingRequests = false,
  onAcceptRequest,
  onDeclineRequest,
  l = (ru) => ru,
}) {
  const [mode, setMode] = useState(initialTab === "requests" ? "requests" : "direct");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [closing, setClosing] = useState(false);
  const [selectReqMode, setSelectReqMode] = useState(false);
  const [selectedReqIds, setSelectedReqIds] = useState([]);

  const dragStartY = useRef(null);

  const closeModal = () => {
    setClosing(true);
    window.setTimeout(() => onClose?.(), 150);
  };

  const requestItems = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    return (requests || [])
      .filter(r => r?.isRequest)
      .filter(r => {
        if (!q) return true;
        return [r.name, r.username, r.preview].some(v => String(v || "").toLowerCase().includes(q));
      });
  }, [requests, query]);

  const suggestedUsers = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    const uniq = new Map();
    (suggestedContacts || []).forEach((u) => {
      if (!u?.id || String(u.id) === String(me?.id)) return;
      if (q && !String(u.username || "").toLowerCase().includes(q)) return;
      uniq.set(String(u.id), u);
    });
    return Array.from(uniq.values());
  }, [suggestedContacts, me?.id, query]);

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearching(true);
      setHint("");

      try {
        const data = await api.searchUsers(q);

        if (cancelled) return;

        const list = Array.isArray(data) ? data : [];

        setResults(
          list.filter(u =>
            String(u.id) !== String(me?.id) &&
            String(u.username || "").toLowerCase().includes(q.toLowerCase())
          )
        );
      } catch (e) {
        if (!cancelled) {
          setHint(e.message || l("Не удалось выполнить поиск.", "Search failed."));
          setResults([]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, me?.id]);

  const onHandlePointerDown = (e) => {
    dragStartY.current = e.clientY ?? e.touches?.[0]?.clientY ?? null;
  };

  const onHandlePointerUp = (e) => {
    const endY = e.clientY ?? e.changedTouches?.[0]?.clientY ?? null;

    if (dragStartY.current !== null && endY !== null && endY - dragStartY.current > 70) {
      closeModal();
    }

    dragStartY.current = null;
  };

  const openSaved = async () => {
    setLoading(true);
    setHint("");

    try {
      const res = await api.createSaved();
      if (!res?.chatId) throw new Error(l("Сервер не вернул chatId.", "Backend did not return chatId."));
      onCreated?.(res.chatId);
    } catch (e) {
      setHint(e.message || l("Не удалось открыть Избранное.", "Could not open Saved Messages."));
    } finally {
      setLoading(false);
    }
  };

  const startDirect = async (username) => {
    if (!username) return;

    setLoading(true);
    setHint("");

    try {
      const res = await api.createDirect(username);
      if (!res?.chatId) throw new Error(l("Сервер не вернул chatId.", "Backend did not return chatId."));
      onCreated?.(res.chatId);
    } catch (e) {
      setHint(e.message || l("Не удалось создать чат.", "Could not create chat."));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (user) => {
    setSelected(prev =>
      prev.some(u => String(u.id) === String(user.id))
        ? prev.filter(u => String(u.id) !== String(user.id))
        : [...prev, user]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim() || selected.length === 0) return;

    setLoading(true);
    setHint("");

    try {
      const res = await api.createGroup(groupName.trim(), selected.map(u => u.id));
      if (!res?.chatId) throw new Error(l("Сервер не вернул chatId.", "Backend did not return chatId."));
      onCreated?.(res.chatId);
    } catch (e) {
      setHint(e.message || l("Не удалось создать группу.", "Could not create group."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`new-chat-drawer-root${closing ? " closing" : ""}`}>
      <style>{NEW_CHAT_DRAWER_CSS}</style>

      <div className="new-chat-drawer-backdrop" onClick={closeModal} />

      <section className="new-chat-drawer-panel" onClick={e => e.stopPropagation()}>
        <div
          className="new-chat-drawer-grab-zone"
          onPointerDown={onHandlePointerDown}
          onPointerUp={onHandlePointerUp}
          onTouchStart={onHandlePointerDown}
          onTouchEnd={onHandlePointerUp}
        >
          <div className="new-chat-drawer-handle" />
        </div>

        <header className="new-chat-drawer-head">
          <button type="button" className="new-chat-round-close" onClick={closeModal}>×</button>
          <div className="new-chat-drawer-title">{l("Новый чат", "New chat")}</div>
          <div className="new-chat-head-spacer" />
        </header>

        <div className="new-chat-drawer-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={l("Поиск по username", "Search by username")}
            autoFocus
          />
        </div>

        <div className="new-chat-drawer-tabs">
          <button
            type="button"
            className={mode === "direct" ? "active" : ""}
            onClick={() => setMode("direct")}
          >
            {l("Личные", "Direct")}
          </button>

          <button
            type="button"
            className={mode === "group" ? "active" : ""}
            onClick={() => setMode("group")}
          >
            {l("Группа", "Group")}
          </button>
          <button
            type="button"
            className={mode === "requests" ? "active" : ""}
            onClick={() => setMode("requests")}
          >
            {l("Запросы", "Requests")}
          </button>
        </div>

        {hint && <div className="err-bar new-chat-drawer-error">{hint}</div>}

        <div className="new-chat-drawer-content scroll">
          {mode === "direct" && <DirectTab l={l} openSaved={openSaved} loading={loading} setMode={setMode} />}

          {mode === "group" && <GroupTab l={l} groupName={groupName} setGroupName={setGroupName} selected={selected} toggleSelect={toggleSelect} />}

          {mode === "requests" && <RequestsTab l={l} requestItems={requestItems} selectReqMode={selectReqMode} setSelectReqMode={setSelectReqMode} selectedReqIds={selectedReqIds} setSelectedReqIds={setSelectedReqIds} loadingRequests={loadingRequests} onAcceptRequest={onAcceptRequest} onDeclineRequest={onDeclineRequest} />}

          <UserSearchResults l={l} searching={searching} mode={mode} query={query} results={results} suggestedUsers={suggestedUsers} selected={selected} startDirect={startDirect} toggleSelect={toggleSelect} />
        </div>

        {mode === "group" && (
          <div className="new-chat-drawer-bottom">
            <button type="button" className="btn-sec" onClick={closeModal}>
              {l("Отмена", "Cancel")}
            </button>
            <button
              type="button"
              className="btn-pri"
              onClick={createGroup}
              disabled={loading || !groupName.trim() || selected.length === 0}
            >
              {loading
                ? l("Создаём...", "Creating...")
                : l(`Создать (${selected.length})`, `Create (${selected.length})`)}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

const NEW_CHAT_DRAWER_CSS = `
.new-chat-drawer-root{
  position:fixed;
  inset:0;
  z-index:260;
  display:flex;
  align-items:flex-start;
  justify-content:center;
  pointer-events:auto;
  padding-top:70px;
}

.new-chat-drawer-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.28);
  backdrop-filter:blur(1px);
  animation:newChatDrawerFade .16s ease;
}

.new-chat-drawer-panel{
  position:relative;
  width:min(94%,560px);
  height:min(82dvh,760px);
  background:var(--bg0);
  border-radius:32px;
  box-shadow:0 24px 80px rgba(0,0,0,.22);
  display:flex;
  flex-direction:column;
  overflow:hidden;
  animation:newChatDrawerIn .18s cubic-bezier(.2,.8,.2,1);
}
.new-chat-drawer-root.closing .new-chat-drawer-backdrop{
  animation:newChatDrawerFadeOut .14s ease forwards;
}
.new-chat-drawer-root.closing .new-chat-drawer-panel{
  animation:newChatDrawerOut .14s ease forwards;
}

.new-chat-drawer-grab-zone{
  height:16px;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:grab;
  touch-action:none;
  flex-shrink:0;
}

.new-chat-drawer-grab-zone:active{
  cursor:grabbing;
}

.new-chat-drawer-handle{
  width:46px;
  height:5px;
  border-radius:999px;
  background:rgba(0,0,0,.18);
}

[data-theme='dark'] .new-chat-drawer-handle{
  background:rgba(255,255,255,.22);
}

.new-chat-drawer-head{
  min-height:58px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 20px 12px;
  flex-shrink:0;
}

.new-chat-drawer-title{
  font-size:22px;
  font-weight:900;
  letter-spacing:-.035em;
}

.new-chat-round-close{
  width:48px;
  height:48px;
  border:none;
  border-radius:50%;
  background:var(--bg1);
  color:var(--t1);
  box-shadow:var(--soft-shadow);
  font-size:28px;
  line-height:1;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
}

.new-chat-head-spacer{
  width:48px;
  height:48px;
}

.new-chat-drawer-search{
  height:58px;
  margin:0 22px 14px;
  border-radius:999px;
  background:var(--bg1);
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 18px;
  color:var(--t2);
  box-shadow:var(--soft-shadow);
  flex-shrink:0;
}

.new-chat-drawer-search input{
  flex:1;
  min-width:0;
  border:none;
  outline:none;
  background:transparent;
  color:var(--t1);
  font-size:18px;
}

.new-chat-drawer-tabs{
  margin:0 22px 18px;
  height:42px;
  border-radius:999px;
  padding:3px;
  background:var(--bg3);
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  flex-shrink:0;
}

.new-chat-drawer-tabs button{
  border:none;
  border-radius:999px;
  background:transparent;
  cursor:pointer;
  font-weight:850;
  font-size:15px;
}

.new-chat-drawer-tabs button.active{
  background:var(--bg1);
  box-shadow:0 1px 6px rgba(0,0,0,.06);
}

.new-chat-drawer-error{
  margin-left:22px;
  margin-right:22px;
  flex-shrink:0;
}

.new-chat-drawer-content{
  flex:1;
  padding:12px 22px 30px;
  overflow-y:auto;
}

.new-chat-drawer-action,
.new-chat-drawer-user{
  width:100%;
  border:none;
  background:var(--bg1);
  border-radius:28px;
  padding:18px;
  display:flex;
  align-items:center;
  gap:16px;
  text-align:left;
  cursor:pointer;
  margin-bottom:10px;
}

.new-chat-drawer-action:active,
.new-chat-drawer-user:active{
  transform:scale(.99);
}

.new-chat-drawer-action i,
.new-chat-drawer-user i{
  margin-left:auto;
  color:var(--t3);
  font-style:normal;
  font-size:28px;
}

.new-chat-drawer-action-icon{
  width:56px;
  height:56px;
  border-radius:50%;
  background:var(--bg3);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
  flex-shrink:0;
}

.new-chat-drawer-action-text,
.new-chat-drawer-user-main{
  display:flex;
  flex-direction:column;
  flex:1;
  min-width:0;
}

.new-chat-drawer-action-text b,
.new-chat-drawer-user-main b{
  font-size:20px;
  letter-spacing:-.03em;
}

.new-chat-drawer-action-text small,
.new-chat-drawer-user-main small{
  color:var(--t2);
  font-size:15px;
  margin-top:3px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.new-chat-drawer-group-card{
  background:var(--bg1);
  border-radius:28px;
  padding:18px;
  margin-bottom:12px;
}

.new-chat-drawer-user{
  background:transparent;
  box-shadow:none;
}

.new-chat-drawer-user:hover,
.new-chat-drawer-user.selected{
  background:var(--bg1);
}

.new-chat-drawer-loading{
  display:flex;
  align-items:center;
  justify-content:center;
  padding:28px;
}

.new-chat-drawer-bottom{
  padding:12px 22px 24px;
  display:flex;
  gap:10px;
  flex-shrink:0;
}

@keyframes newChatDrawerIn{
  from{
    transform:translateY(8px) scale(.99);
    opacity:0;
  }
  to{
    transform:translateY(0) scale(1);
    opacity:1;
  }
}
@keyframes newChatDrawerOut{
  from{transform:translateY(0) scale(1);opacity:1}
  to{transform:translateY(8px) scale(.99);opacity:0}
}

@keyframes newChatDrawerFade{
  from{opacity:0}
  to{opacity:1}
}
@keyframes newChatDrawerFadeOut{
  from{opacity:1}
  to{opacity:0}
}

@media (min-width: 900px){
  .new-chat-drawer-panel{
    height:min(84dvh,780px);
    border-radius:34px;
  }
}

@media (max-width: 520px){
  .new-chat-drawer-panel{
    width:calc(100% - 24px);
    height:min(84dvh,760px);
    border-radius:28px;
  }

  .new-chat-drawer-head,
  .new-chat-drawer-content,
  .new-chat-drawer-bottom{
    padding-left:18px;
    padding-right:18px;
  }

  .new-chat-drawer-search,
  .new-chat-drawer-tabs,
  .new-chat-drawer-error{
    margin-left:18px;
    margin-right:18px;
  }
}
`;