import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import DirectTab from "./DirectTab";
import GroupTab, { UserSearchResults } from "./GroupTab";
import RequestsTab from "./RequestsTab";
import useSwipeDown from "../hooks/useSwipeDown";

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
  const [selectReqMode, setSelectReqMode] = useState(false);
  const [selectedReqIds, setSelectedReqIds] = useState([]);
  const modalRef = useRef(null);
  useSwipeDown(modalRef, onClose);

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
        setResults(list.filter(u =>
          String(u.id) !== String(me?.id) &&
          String(u.username || "").toLowerCase().includes(q.toLowerCase())
        ));
      } catch (e) {
        if (!cancelled) {
          setHint(e.message || l("Не удалось выполнить поиск.", "Search failed."));
          setResults([]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, me?.id]);

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
    <div className="modal-bg new-chat-bg" onClick={onClose}>
      <div ref={modalRef} className="modal new-chat-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <b>{l("Новый чат", "New chat")}</b>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="new-chat-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={l("Поиск по username", "Search by username")}
            autoFocus
          />
        </div>

        <div className="new-chat-tabs">
          <button type="button" className={mode === "direct" ? "active" : ""} onClick={() => setMode("direct")}>
            {l("Личные", "Direct")}
          </button>
          <button type="button" className={mode === "group" ? "active" : ""} onClick={() => setMode("group")}>
            {l("Группа", "Group")}
          </button>
          <button type="button" className={mode === "requests" ? "active" : ""} onClick={() => setMode("requests")}>
            {l("Запросы", "Requests")}
          </button>
        </div>

        {hint && <div className="err-bar new-chat-error">{hint}</div>}

        <div className="new-chat-content scroll">
          {mode === "direct" && <DirectTab l={l} openSaved={openSaved} loading={loading} setMode={setMode} />}

          {mode === "group" && (
            <GroupTab
              l={l} groupName={groupName} setGroupName={setGroupName}
              selected={selected} toggleSelect={toggleSelect}
            />
          )}

          {mode === "requests" && (
            <RequestsTab
              l={l} requestItems={requestItems}
              selectReqMode={selectReqMode} setSelectReqMode={setSelectReqMode}
              selectedReqIds={selectedReqIds} setSelectedReqIds={setSelectedReqIds}
              loadingRequests={loadingRequests}
              onAcceptRequest={onAcceptRequest} onDeclineRequest={onDeclineRequest}
            />
          )}

          <UserSearchResults
            l={l} searching={searching} mode={mode} query={query}
            results={results} suggestedUsers={suggestedUsers}
            selected={selected} startDirect={startDirect} toggleSelect={toggleSelect}
          />
        </div>

        {mode === "group" && (
          <div className="new-chat-bottom">
            <button type="button" className="btn-sec" onClick={onClose}>
              {l("Отмена", "Cancel")}
            </button>
            <button type="button" className="btn-pri" onClick={createGroup} disabled={loading || !groupName.trim() || selected.length === 0}>
              {loading ? l("Создаём...", "Creating...") : l(`Создать (${selected.length})`, `Create (${selected.length})`)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
