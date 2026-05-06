import { useState, useCallback, useMemo } from "react";
import { api } from "../api";
import { mapChat, getTime } from "../helpers";
import { getHiddenChatIds, hideChatId, unhideChatId } from "../chatVisibility";

/**
 * Manages the chat list: loading, selecting, unread counters.
 */
export function useChats(myId, lang) {
  const [chats, setChats]             = useState([]);
  const [requests, setRequests]       = useState([]);
  const [activeId, setActiveId]       = useState(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const mapChatLabels = useMemo(() => {
    const en = String(lang || "ru").toLowerCase().startsWith("en");
    return en
      ? { contact: "Contact", saved: "Saved", group: "Group", newMessage: "New message" }
      : { contact: "Контакт", saved: "Избранное", group: "Группа", newMessage: "Новое сообщение" };
  }, [lang]);

  const loadChats = useCallback(async (id) => {
    const resolvedId = id ?? myId;
    setLoadingChats(true);
    try {
      const data = await api.getChats();
      if (Array.isArray(data)) {
        const hidden = getHiddenChatIds(resolvedId);
        const mapped = data
          .map(c => mapChat(c, resolvedId, mapChatLabels))
          // If chat has unread/new activity, reveal it again automatically.
          .filter(c => !hidden.has(String(c.id)) || Number(c.unread || 0) > 0);
        setChats(prev => reconcileChats(prev, mapped));
      }
    } catch (e) {
      console.error("loadChats:", e);
    } finally {
      setLoadingChats(false);
    }
  }, [myId, mapChatLabels]);

  const loadRequests = useCallback(async (id) => {
    const resolvedId = id ?? myId;
    if (!resolvedId) return;
    setLoadingRequests(true);
    try {
      const data = await api.getRequests();
      if (Array.isArray(data)) {
        const mapped = data.map(c => mapChat(c, resolvedId, mapChatLabels));
        setRequests(mapped);
      }
    } catch (e) {
      console.error("loadRequests:", e);
    } finally {
      setLoadingRequests(false);
    }
  }, [myId, mapChatLabels]);

  const selectChat = useCallback((id) => {
    unhideChatId(myId, id);
    setActiveId(id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
  }, [myId]);

  const updateChatPreview = useCallback((chatId, preview, isOut = false, createdAt = null, incrementUnread = false) => {
    const activityAt = normalizeChatActivityAt(createdAt);

    setChats(prev => sortChatsByActivity(
      prev.map(chat => {
        if (String(chat.id) !== String(chatId)) {
          return chat;
        }

        const currentUnread = Number(chat.unread || 0);
        const nextUnread = incrementUnread ? currentUnread + 1 : currentUnread;

        return {
          ...chat,
          preview: preview || chat.preview || "",
          lastOut: Boolean(isOut),
          time: formatChatActivityTime(activityAt),
          lastMessageAt: activityAt,
          lastActivityAt: activityAt,
          unread: nextUnread,
        };
      })
    ));
  }, []);

  const markChatOnlineStatus = useCallback((username, isOnline) => {
    const normalized = String(username || "").trim().toLowerCase();
    if (!normalized) return;
    setChats(prev => prev.map(c =>
      String(c.username || "").trim().toLowerCase() === normalized
        ? { ...c, online: isOnline }
        : c
    ));
  }, []);

  const deleteChatForMe = useCallback((chatId) => {
    if (!chatId) return;
    hideChatId(myId, chatId);
    setChats(prev => prev.filter(c => String(c.id) !== String(chatId)));
    setActiveId(prev => (String(prev) === String(chatId) ? null : prev));
  }, [myId]);

  const revealChat = useCallback((chatId) => {
    if (!chatId) return;
    unhideChatId(myId, chatId);
  }, [myId]);

  return {
    chats, setChats,
    requests, setRequests,
    activeId, setActiveId,
    loadingChats,
    loadingRequests,
    loadChats,
    loadRequests,
    selectChat,
    updateChatPreview,
    markChatOnlineStatus,
    deleteChatForMe,
    revealChat,
  };
}
function normalizeChatActivityAt(value) {
  if (!value) return new Date().toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function formatChatActivityTime(value) {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const now = new Date();
  const diff = now - d;

  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  if (diff < 604800000) {
    return d.toLocaleDateString("ru-RU", { weekday: "short" });
  }

  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function getChatActivityMs(chat) {
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

function sortChatsByActivity(chats) {
  return [...(chats || [])].sort((a, b) => {
    const byActivity = getChatActivityMs(b) - getChatActivityMs(a);
    if (byActivity !== 0) return byActivity;

    return Number(b.id || 0) - Number(a.id || 0);
  });
}

function reconcileChats(prevChats, nextChats) {
  const prevById = new Map((prevChats || []).map(chat => [String(chat.id), chat]));
  const merged = (nextChats || []).map(next => {
    const prev = prevById.get(String(next.id));
    if (!prev) return next;

    return {
      ...prev,
      ...next,
      // Preserve optimistic preview until server side catches up.
      preview: next.preview || prev.preview || "",
      time: next.time || prev.time || "",
      lastActivityAt: next.lastActivityAt || prev.lastActivityAt || next.lastMessageAt || prev.lastMessageAt || null,
    };
  });
  return sortChatsByActivity(merged);
}