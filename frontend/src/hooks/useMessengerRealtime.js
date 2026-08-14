import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import useWebSocket from "./useWebSocket";
import { GROUP_CHAT_LIST_WS_REASONS } from "../constants/realtime";

export function useMessengerRealtime({
  me,
  enabled,
  chatStore,
  msgStore,
  requestChatIds,
  wsChatIds,
  atBottomRef,
  onCallSignal,
}) {
  const [typingUsers, setTypingUsers] = useState({});
  const onCallSignalRef = useRef(onCallSignal);
  const refreshTimeoutRef = useRef(null);
  const requestsRefreshTimeoutRef = useRef(null);
  const requestsRefreshAttemptsRef = useRef(0);

  useEffect(() => {
    onCallSignalRef.current = onCallSignal;
  }, [onCallSignal]);

  const scheduleChatsRefresh = () => {
    if (refreshTimeoutRef.current) return;
    refreshTimeoutRef.current = window.setTimeout(() => {
      refreshTimeoutRef.current = null;
      chatStore.loadChats(me?.id);
    }, 220);
  };

  const scheduleRequestsRefresh = () => {
    if (requestsRefreshTimeoutRef.current) return;
    requestsRefreshTimeoutRef.current = window.setTimeout(() => {
      requestsRefreshTimeoutRef.current = null;
      const myId = me?.id;
      if (!myId) {
        if (requestsRefreshAttemptsRef.current < 8) {
          requestsRefreshAttemptsRef.current += 1;
          scheduleRequestsRefresh();
        }
        return;
      }
      requestsRefreshAttemptsRef.current = 0;
      chatStore.loadRequests(myId);
    }, 220);
  };

  useEffect(() => () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    if (requestsRefreshTimeoutRef.current) {
      clearTimeout(requestsRefreshTimeoutRef.current);
      requestsRefreshTimeoutRef.current = null;
    }
  }, []);

  const ws = useWebSocket({
    me,
    activeId: chatStore.activeId,
    chatIds: wsChatIds,
    enabled,

    onMessage: async (event, chatId) => {
      const result = await msgStore.handleIncomingEvent(event, chatId);
      if (result) {
        chatStore.revealChat(chatId);
        const isActive = Number(chatId) === Number(chatStore.activeId);
        const atBottom = isActive && atBottomRef.current;
        if (result.type !== "MESSAGE_EDITED" && result.type !== "MESSAGE_REACTION") {
          chatStore.updateChatPreview(chatId, result.text, result.isOut, event.createdAt, !result.isOut && !atBottom);
        }
        if (!result.isOut && isActive) {
          api.markDelivered(chatId).catch(() => {});
          if (atBottom) {
            api.markRead(chatId).catch(() => {});
            chatStore.resetUnread(chatId);
          }
        }
      }
      if (requestChatIds.has(String(chatId))) {
        scheduleRequestsRefresh();
      }
    },

    onChatListUpdate: (evt) => {
      const reason = evt?.reason;

      if (reason === "chat_deleted_for_everyone") {
        const deletedChatId = evt?.chatId;
        if (deletedChatId) {
          chatStore.deleteChatForMe(deletedChatId);
          if (String(chatStore.activeId) === String(deletedChatId)) {
            chatStore.setActiveId(null);
          }
        } else {
          scheduleChatsRefresh();
        }
        return;
      }

      const needsHardRefresh =
        reason === "profile_updated" ||
        reason === "chat_created" ||
        reason === "chat_exists" ||
        reason === "saved_chat_created" ||
        reason === "saved_chat_exists";

      if (needsHardRefresh) scheduleChatsRefresh();

      if (reason && GROUP_CHAT_LIST_WS_REASONS.has(reason)) {
        scheduleChatsRefresh();
      }

      if (reason === "request_message") {
        scheduleRequestsRefresh();
        return;
      }

      if (reason === "request_accepted") {
        scheduleChatsRefresh();
        scheduleRequestsRefresh();
        return;
      }

      if (reason === "request_declined") {
        scheduleRequestsRefresh();
        scheduleChatsRefresh();
      }
    },

    onRequestsUpdate: () => {
      scheduleRequestsRefresh();
    },

    onStatusUpdate: (data) => {
      if (data.type === "delivery" && data.messageId) {
        msgStore.updateMessageStatus(data.messageId, data.status);
      }
      if (data.type === "delivery_bulk" && data.chatId) {
        msgStore.updateChatOutgoingStatus(data.chatId, data.status);
      }
      if (data.type === "user_status") {
        chatStore.markChatOnlineStatus(data.username, data.status === "ONLINE");
      }
    },

    onTyping: (data, chatId) => {
      if (!data.username || data.username === me?.username) return;
      setTypingUsers(p => ({ ...p, [chatId]: data.username }));
      setTimeout(() => {
        setTypingUsers(p => {
          if (p[chatId] === data.username) {
            const next = { ...p }; delete next[chatId]; return next;
          }
          return p;
        });
      }, 3000);
    },
    onCall: (event) => {
      onCallSignalRef.current?.(event);
    },
    onConnectionState: ({ connected, isReconnect }) => {
      if (!connected || !isReconnect) return;
      scheduleChatsRefresh();
      scheduleRequestsRefresh();
      if (chatStore.activeId) {
        msgStore.loadMessages(chatStore.activeId);
      }
    },
  });

  return {
    typingUsers,
    sendTyping: (chatId) => ws.sendTyping(chatId),
    sendCall: (payload) => ws.sendCall(payload),
  };
}
