import { useEffect, useMemo, useState, useRef, useCallback } from "react";

import { useAuth }     from "./hooks/useAuth";
import { useChats }    from "./hooks/useChats";
import { useMessages } from "./hooks/useMessages";
import { useI18n }     from "./hooks/useI18n";
import useWebSocket    from "./hooks/useWebSocket";
import useNowTicker    from "./hooks/useNowTicker";
import useTheme from "./hooks/useTheme";
import useSidebarResize from "./hooks/useSidebarResize";
import { getActiveGroupMuteUntilMs, formatMuteCountdown } from "./groupMute";

import AuthScreen   from "./components/AuthScreen";
import SetupProfile from "./components/SetupProfile";
import ChatList     from "./components/ChatList";
import ProfileModal from "./components/ProfileModal";
import NewChatModal from "./components/NewChatModal";
import SafetyNumberModal from "./components/SafetyNumberModal";
import EditMessageModal from "./components/EditMessageModal";
import DeleteMessageModal from "./components/DeleteMessageModal";
import ContextMenu from "./components/ContextMenu";
import SettingsPage from "./components/SettingsPage";
import ChatView from "./components/ChatView";
import { api } from "./api";
import { computeSafetyNumber, formatSafetyNumber } from "./safety-number";

import { getTime, messageMatchesQuery } from "./helpers";
import { clearPreviewCacheForUser } from "./previewCache";
import { useUiTranslator } from "./i18n/useUiTranslator";
import { displayNameForChat } from "./contactAliases";
import { getChatUiPrefs, toggleArchived, toggleMuted } from "./chatUiPrefs";

/** Backend publishes these on `/topic/users/.../chats` when group metadata or participants change. */
const GROUP_CHAT_LIST_WS_REASONS = new Set([
  "group_settings_updated",
  "group_permissions_updated",
  "group_role_updated",
  "group_participants_invited",
  "group_participant_removed",
  "group_participant_muted",
  "group_participant_unmuted",
  "group_participant_banned",
  "group_participant_unbanned",
  "group_archived",
]);

async function registerPushSubscription() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const reg = await navigator.serviceWorker.register("/sw.js");
    const vapidKey = await api.getVapidKey();
    if (!vapidKey) return;
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    await api.subscribePush(subscription.toJSON());
  } catch (e) {
    console.warn("[Push] registration failed:", e.message);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function ChaosMessenger() {
  const auth      = useAuth();
  const { lang, t, loadTranslations, switchLang } = useI18n();
  useUiTranslator(lang);
  const l = useMemo(() => {
    const effectiveLang = String(lang || "ru").toLowerCase().startsWith("en") ? "en" : "ru";
    return (ru, en) => (effectiveLang === "ru" ? ru : en);
  }, [lang]);
  const chatStore = useChats(auth.me?.id, lang);
  const msgStore  = useMessages(auth.me?.id);

  const loadChatsForI18n = chatStore.loadChats;
  const loadRequestsForI18n = chatStore.loadRequests;
  const langReloadSkipRef = useRef(false);
  useEffect(() => {
    if (!langReloadSkipRef.current) {
      langReloadSkipRef.current = true;
      return;
    }
    if (auth.screen !== "app" || auth.me?.id == null) return;
    void loadChatsForI18n(auth.me.id);
    void loadRequestsForI18n(auth.me.id);
  }, [lang, auth.screen, auth.me?.id, loadChatsForI18n, loadRequestsForI18n]);

  const [replyTo,        setReplyTo]        = useState(null);
  const [ctx,            setCtx]            = useState(null);
  
  const [ctxClosing,     setCtxClosing]     = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showNewChat,    setShowNewChat]    = useState(false);
  const [newChatInitialTab, setNewChatInitialTab] = useState("direct");
  const [typingUsers,    setTypingUsers]    = useState({});
  const [chatSearch,     setChatSearch]     = useState("");
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [messageSearch,  setMessageSearch]  = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [scrollToMessageId, setScrollToMessageId] = useState(null);
  const [groupAdminOpen, setGroupAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aliasTick, setAliasTick] = useState(0);
  const [chatPrefsTick, setChatPrefsTick] = useState(0);
  const [chatBgs, setChatBgs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cm_chat_bgs") || "{}"); }
    catch { return {}; }
  });
  const [chatFilter,     setChatFilter]     = useState("all");
  const [activeTab,      setActiveTab]      = useState("chats");
  
  const ctxMenuRef = useRef(null);
  const chatSearchRef = useRef(null);
  const chatSearchBtnRef = useRef(null);
  const atBottomRef = useRef(true);
const [deleteTarget, setDeleteTarget] = useState(null);
const [editTarget, setEditTarget] = useState(null);
const [editText, setEditText] = useState("");
const [editLoading, setEditLoading] = useState(false);
const [safetyModal, setSafetyModal] = useState({ open: false, devices: [], selectedDeviceId: null, error: null });
  const resetMessageSearch = useCallback(() => {
    setMessageSearch("");
    setMatchIndex(0);
    setScrollToMessageId(null);
    setChatSearchOpen(false);
  }, []);

  const { theme, toggleTheme } = useTheme();
  const {
    sidebarWidth,
    sidebarCompact,
    sidebarDragging,
    sidebarDesktop,
    onSidebarResizePointerDown,
    onSidebarResizePointerMove,
    onSidebarResizePointerUp,
    onSidebarResizeLostCapture,
  } = useSidebarResize();

  const activeChat = chatStore.chats.find(c => c.id === chatStore.activeId);
  const activeMsgs = msgStore.msgs[chatStore.activeId] || [];
  const chatMuted = activeChat ? getChatUiPrefs(auth.me?.id).muted.has(String(activeChat.id)) : false;
  const refreshTimeoutRef = useRef(null);
  const requestsRefreshTimeoutRef = useRef(null);
  const requestsRefreshAttemptsRef = useRef(0);

  const aliasedChats = useMemo(() => {
    // aliasTick forces re-evaluation after saving alias
    void aliasTick;
    const prefs = getChatUiPrefs(auth.me?.id);
    void chatPrefsTick;
    return chatStore.chats.map(c => ({
      ...c,
      name: displayNameForChat(c, auth.me?.id),
      muted: prefs.muted.has(String(c.id)),
      archived: prefs.archived.has(String(c.id)),
    }));
  }, [chatStore.chats, auth.me?.id, aliasTick, chatPrefsTick]);

  const activeChatName = useMemo(() => {
    if (!activeChat) return "";
    // keep in sync with aliased list
    void aliasTick;
    return displayNameForChat(activeChat, auth.me?.id);
  }, [activeChat, auth.me?.id, aliasTick]);

  const openSafetyNumber = useCallback(async () => {
    if (!activeChat || activeChat.type !== "direct") return;
    setSafetyModal({ open: true, devices: [], selectedDeviceId: null, error: null });
    try {
      const ownBundle = window.e2ee?.getLocalDeviceBundle?.();
      const ownIdentityKey = ownBundle?.identity?.publicKey;
      if (!ownIdentityKey) throw new Error(l("Локальный ключ устройства не найден", "Local device identity key is missing"));

      const resolved = await api.resolveDevicesForSafetyNumber(activeChat.id);
      const remoteDevices = (resolved?.targetDevices || []).filter(device =>
        String(device.userId) !== String(auth.me?.id) &&
        device.identityPublicKey &&
        device.deviceId
      );
      if (remoteDevices.length === 0) {
        throw new Error(l("У собеседника нет активных E2EE-устройств", "The contact has no active E2EE devices"));
      }

      const devices = await Promise.all(remoteDevices.map(async device => {
        const fingerprint = await computeSafetyNumber(ownIdentityKey, device.identityPublicKey);
        const trust = window.e2ee?.getRemoteIdentityTrust?.(device.deviceId, device.identityPublicKey) || {
          trustState: "UNVERIFIED"
        };
        return {
          deviceId: device.deviceId,
          deviceName: device.deviceName || device.deviceId,
          identityPublicKey: device.identityPublicKey,
          fingerprint,
          display: formatSafetyNumber(fingerprint),
          trustState: trust.trustState || "UNVERIFIED"
        };
      }));

      setSafetyModal({
        open: true,
        devices,
        selectedDeviceId: devices[0].deviceId,
        error: null
      });
    } catch (error) {
      setSafetyModal({
        open: true,
        devices: [],
        selectedDeviceId: null,
        error: error?.message || l("Не удалось вычислить Safety Number", "Could not compute Safety Number")
      });
    }
  }, [activeChat, auth.me?.id, l]);

  const verifySafetyDevice = useCallback(async (deviceId) => {
    const target = safetyModal.devices.find(device => device.deviceId === deviceId);
    if (!target) return;
    await window.e2ee.verifyRemoteIdentity(target.deviceId, target.identityPublicKey, "SAFETY_NUMBER");
    setSafetyModal(current => ({
      ...current,
      devices: current.devices.map(device =>
        device.deviceId === deviceId ? { ...device, trustState: "VERIFIED" } : device
      )
    }));
  }, [safetyModal.devices]);

  const myMutedUntilIso = useMemo(() => {
    if (activeChat?.type !== "group" || !auth.me?.id) return null;
    const me = activeChat.groupParticipants?.find((p) => String(p.userId) === String(auth.me.id));
    return me?.mutedUntil || null;
  }, [activeChat, auth.me?.id]);

  const groupMuteTickerNow = useNowTicker(Boolean(myMutedUntilIso));
  const myGroupMuteUntilMs = useMemo(
    () =>
      activeChat?.type === "group" && auth.me?.id
        ? getActiveGroupMuteUntilMs(activeChat.groupParticipants, auth.me.id)
        : null,
    [activeChat, auth.me?.id, groupMuteTickerNow]
  );
  const myGroupMuteCountdown = useMemo(
    () => formatMuteCountdown(myGroupMuteUntilMs, groupMuteTickerNow),
    [myGroupMuteUntilMs, groupMuteTickerNow]
  );

  const loadChats = chatStore.loadChats;
  useEffect(() => {
    if (!myMutedUntilIso || myGroupMuteUntilMs != null) return;
    const t = Date.parse(myMutedUntilIso);
    if (!Number.isFinite(t) || t > Date.now()) return;
    const uid = auth.me?.id;
    if (uid == null) return;
    loadChats(uid);
  }, [myMutedUntilIso, myGroupMuteUntilMs, auth.me?.id, loadChats]);

  const isPendingRequestChat = useMemo(() => {
    if (!activeChat || activeChat.type !== "direct") return false;
    return String(activeChat.directStatus || "").toUpperCase() === "PENDING";
  }, [activeChat]);
  const isRequesterInPendingChat = useMemo(() => {
    if (!isPendingRequestChat) return false;
    return String(activeChat?.directRequestedBy || "") === String(auth.me?.id || "");
  }, [isPendingRequestChat, activeChat?.directRequestedBy, auth.me?.id]);
  const requesterFirstMsgSent = useMemo(() => {
    if (!isRequesterInPendingChat) return false;
    return activeMsgs.some(m => m?._out && !m?._temp);
  }, [isRequesterInPendingChat, activeMsgs]);
  const requestChatIds = useMemo(
    () => new Set((chatStore.requests || []).map(c => String(c.id))),
    [chatStore.requests]
  );
  const wsChatIds = useMemo(
    () => Array.from(new Set([...(chatStore.chats || []), ...(chatStore.requests || [])].map(c => c.id))),
    [chatStore.chats, chatStore.requests]
  );

  const scheduleChatsRefresh = () => {
    if (refreshTimeoutRef.current) return;
    refreshTimeoutRef.current = window.setTimeout(() => {
      refreshTimeoutRef.current = null;
      chatStore.loadChats(auth.me?.id);
    }, 220);
  };
  const scheduleRequestsRefresh = () => {
    if (requestsRefreshTimeoutRef.current) return;
    requestsRefreshTimeoutRef.current = window.setTimeout(() => {
      requestsRefreshTimeoutRef.current = null;
      const myId = auth.me?.id;
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

  const matchIds = useMemo(() => {
    const q = String(messageSearch || "").trim();
    if (!q) return [];
    return activeMsgs
      .filter(m => messageMatchesQuery(m, q))
      .map(m => (m.id ?? m.messageId))
      .filter(Boolean);
  }, [activeMsgs, messageSearch]);

  useEffect(() => {
    // Reset selection when query changes
    setMatchIndex(0);
    setScrollToMessageId(null);
  }, [messageSearch]);

  useEffect(() => {
    resetMessageSearch();
  }, [chatStore.activeId, resetMessageSearch]);

  useEffect(() => {
    setGroupAdminOpen(false);
  }, [chatStore.activeId]);

  useEffect(() => {
    if (!groupAdminOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setGroupAdminOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groupAdminOpen]);

  const activeMatchId = matchIds.length ? matchIds[Math.max(0, Math.min(matchIndex, matchIds.length - 1))] : null;

  const goToMatch = (delta) => {
    if (!matchIds.length) return;
    const next = (matchIndex + delta + matchIds.length) % matchIds.length;
    setMatchIndex(next);
    setScrollToMessageId(matchIds[next]);
  };
  useEffect(() => {
    const isInside = (ref, target) => Boolean(ref.current && ref.current.contains(target));

    const closeExternalPopovers = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (ctxMenuRef.current && !ctxMenuRef.current.contains(target)) {
        setCtx(null);
      }

      const insideSearch =
        isInside(chatSearchRef, target) ||
        isInside(chatSearchBtnRef, target);

      if (chatSearchOpen && !insideSearch) {
        resetMessageSearch();
      }
    };

    document.addEventListener("mousedown", closeExternalPopovers, true);
    document.addEventListener("touchstart", closeExternalPopovers, true);

    return () => {
      document.removeEventListener("mousedown", closeExternalPopovers, true);
      document.removeEventListener("touchstart", closeExternalPopovers, true);
    };
  }, [ctx, chatSearchOpen, resetMessageSearch]);

  useEffect(() => {
    localStorage.setItem("cm_chat_bgs", JSON.stringify(chatBgs));
  }, [chatBgs]);

  useEffect(() => {
    loadTranslations(lang);
    auth.restoreSession(async (meData) => {
      await chatStore.loadChats(meData.id);
      await chatStore.loadRequests(meData.id);
      auth.setScreen("app");
      registerPushSubscription();
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    atBottomRef.current = false;
  }, [chatStore.activeId]);

  useEffect(() => {
    if (chatStore.activeId) {
      msgStore.loadMessages(chatStore.activeId);
    }
  }, [chatStore.activeId]); // eslint-disable-line

  const markActiveChatRead = useCallback((chatId) => {
    const id = chatId ?? chatStore.activeId;
    if (!id) return;
    atBottomRef.current = true;
    chatStore.resetUnread(id);
    api.markRead(id).catch(() => {});
    api.markDelivered(id).catch(() => {});
  }, [chatStore]);

  const ws = useWebSocket({
    me:       auth.me,
    activeId: chatStore.activeId,
    chatIds:  wsChatIds,
    enabled:  auth.screen === "app",

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

      // Incoming message requests: refresh only the requests list (badge + modal tab), not the whole chat list.
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
      if (!data.username || data.username === auth.me?.username) return;
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
    onConnectionState: ({ connected, isReconnect }) => {
      if (!connected || !isReconnect) return;
      scheduleChatsRefresh();
      scheduleRequestsRefresh();
      if (chatStore.activeId) {
        msgStore.loadMessages(chatStore.activeId);
      }
    },
  });

  const onVerifyOtpSuccess = async (meData, isNew) => {
    auth.setMe(meData);
    if (isNew) {
      auth.setScreen("setup");
    } else {
      await chatStore.loadChats(meData.id);
      auth.setScreen("app");
      registerPushSubscription();
    }
  };

  const onSetupDone = async (updatedMe) => {
    auth.setMe(updatedMe);
    await chatStore.loadChats(updatedMe.id);
    auth.setScreen("app");
  };

  const logout = async () => {
    clearPreviewCacheForUser(auth.me?.id);
    await auth.logout();
    chatStore.setChats([]);
    chatStore.setActiveId(null);
    msgStore.setMsgs({});
    setShowSettings(false);
  };

  const sendMsg = async ({ text, imgFile, voiceFile, generalFile, ttl }) => {
    if ((!String(text || "").trim() && !imgFile && !voiceFile && !generalFile) || !chatStore.activeId) return;
    const preview = generalFile
      ? (String(text || "").trim() ? `📎 ${String(text).trim()}` : `📎 ${generalFile.name}`)
      : imgFile
        ? (String(text || "").trim() ? `📷 ${String(text).trim()}` : "📷 Фото")
        : voiceFile
          ? (String(text || "").trim() ? `Voice: ${String(text).trim()}` : "Voice message")
        : String(text).trim();
    chatStore.updateChatPreview(chatStore.activeId, preview, true, getTime());
    setReplyTo(null);
    const result = await msgStore.sendMessage(chatStore.activeId, { text, imgFile, voiceFile, generalFile, ttl });
    if (!result) {
      // Re-sync chat preview/status in case optimistic update was rejected
      // (e.g. request is pending and second message is blocked).
      chatStore.loadChats(auth.me?.id);
    }
  };

  const closeCtx = () => {
    if (!ctx || ctxClosing) return;

    setCtxClosing(true);

    window.setTimeout(() => {
      setCtx(null);
      setCtxClosing(false);
    }, 140);
  };

  useEffect(() => {
    const onWindowClick = () => closeCtx();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeCtx();
      }
    };

    window.addEventListener("click", onWindowClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("click", onWindowClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ctx, ctxClosing]);

  const openCtx = (e, msg) => {
    e.preventDefault(); e.stopPropagation();
    setCtxClosing(false);
    setCtx({
      x: Math.min(e.clientX, window.innerWidth  - 208),
      y: Math.min(e.clientY, window.innerHeight - 280),
      msg,
    });
  };

  const reactToMsg = (msg, emoji) => {
    setCtx(null);
    if (!chatStore.activeId || !msg?.id || msg._temp) return;
    if (typeof msgStore.toggleReaction === "function") {
      msgStore.toggleReaction(chatStore.activeId, msg, emoji);
    }
  };

  const beginEdit = (msg) => {
    setCtx(null);
    setEditTarget(msg);
    setEditText(msg?._text || "");
  };

  const submitEdit = async () => {
    const text = editText.trim();
    if (!text || !editTarget || !chatStore.activeId) return;
    setEditLoading(true);
    try {
      const result = await msgStore.editMessage(chatStore.activeId, editTarget, text);
      if (result) {
        const last = activeMsgs[activeMsgs.length - 1];
        if (String(last?.id) === String(editTarget.id)) {
          chatStore.updateChatPreview(chatStore.activeId, result.preview || text, true, getTime());
        }
        setEditTarget(null);
        setEditText("");
      }
    } finally {
      setEditLoading(false);
    }
  };

  const beginDelete = (msg) => { setCtx(null); setDeleteTarget(msg); };

  const confirmDelete = (scope) => {
    if (!deleteTarget || !chatStore.activeId) return;
    msgStore.deleteMessage(chatStore.activeId, deleteTarget, scope);
    setDeleteTarget(null);
    if (scope === "everyone") {
      setTimeout(() => chatStore.loadChats(auth.me?.id), 250);
    }
  };

  const onChatCreated = async (chatId) => {
    setShowNewChat(false);
    msgStore.setMsgs(p => ({ ...p, [chatId]: undefined }));
    chatStore.revealChat(chatId);
    await chatStore.loadChats(auth.me?.id);
    chatStore.setActiveId(chatId);
  };

  const goBackToList = () => {
    chatStore.setActiveId(null);
    setReplyTo(null);
    setCtx(null);
    resetMessageSearch();
    setChatSearchOpen(false);
    setGroupAdminOpen(false);
  };

  if (auth.screen === "loading") {
    return (
      <div className="boot-screen">
        <div className="boot-mark">C</div>
        <div className="spinner" />
      </div>
    );
  }

  if (auth.screen === "auth" || auth.screen === "otp") {
    return (
      <AuthScreen
        screen={auth.screen}
        phone={auth.phone}       setPhone={auth.setPhone}
        dialCode={auth.dialCode} setDialCode={auth.setDialCode}
        otp={auth.otp}           setOtp={auth.setOtp}
        otpRefs={auth.otpRefs}
        email={auth.email}       setEmail={auth.setEmail}
        password={auth.password} setPassword={auth.setPassword}
        onSubmitPhone={() => auth.submitPhone(auth.dialCode, auth.phone)}
        onVerifyOtp={(digits) => auth.verifyOtp(digits, onVerifyOtpSuccess, auth.dialCode, auth.phone)}
        onSubmitEmail={(mode) => auth.submitEmail(mode, onVerifyOtpSuccess, auth.email, auth.password)}
        loading={auth.authLoading}
        error={auth.authError}
        onBack={() => { auth.setScreen("auth"); auth.setOtp(["","","","","",""]); }}
      />
    );
  }

  if (auth.screen === "setup") {
    return (
      <SetupProfile
        me={auth.me}
        setupToken={auth.setupToken}
        onFinishSetup={(data) => auth.finishSetup(data, onVerifyOtpSuccess)}
        onDone={onSetupDone}
      />
    );
  }

  const chatBg = chatBgs[String(chatStore.activeId)] || "clean";

  return (
    <div className={`app mobile-product-shell${activeChat ? " has-active-chat" : ""}`} onClick={closeCtx}>
      {activeTab === "settings" ? (
        <SettingsPage
          me={auth.me}
          theme={theme}
          lang={lang}
          l={l}
          onToggleTheme={toggleTheme}
          onSwitchLang={() => switchLang(lang === "ru" ? "en" : "ru")}
          onLogout={logout}
          onEditProfile={() => setShowSettings(true)}
          onOpenChat={onChatCreated}
          onNavChange={setActiveTab}
          unreadTotal={aliasedChats.filter(c => c.unread > 0).length}
        />
      ) : (
      <div
        className={`app-frame${sidebarDragging ? " app-frame--sidebar-dragging" : ""}`}
        style={
          sidebarDesktop
            ? { gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr)` }
            : undefined
        }
      >
        <ChatList
          me={auth.me}
          chats={aliasedChats}
          requests={chatStore.requests.map(c => ({ ...c, name: displayNameForChat(c, auth.me?.id) }))}
          activeId={chatStore.activeId}
          loadingChats={chatStore.loadingChats}
          search={chatSearch}
          onПоиск={setChatSearch}
          filter={chatFilter}
          onFilterChange={setChatFilter}
          onSelectChat={chatStore.selectChat}
          onNewChat={() => {
            if (auth.me?.id) chatStore.loadRequests(auth.me.id);
            setNewChatInitialTab("direct");
            setShowNewChat(true);
          }}
          onOpenНастройки={() => setActiveTab("settings")}
          onMarkAllRead={() => {
            chatStore.chats.forEach(c => {
              api.markRead(c.id).catch(() => {});
            });
            chatStore.setChats(prev => prev.map(c => ({ ...c, unread: 0 })));
          }}
          onDeleteChat={async (chatId) => {
            const ok = window.confirm(
              l("Удалить переписку только у себя?", "Delete this chat only for you?")
            );
            if (!ok) return;
            chatStore.deleteChatForMe(chatId);
            if (String(chatStore.activeId) === String(chatId)) {
              chatStore.setActiveId(null);
            }
          }}
          onDeleteChatEveryone={async (chatId) => {
            const ok = window.confirm(
              l("Удалить переписку у всех участников?", "Delete this chat for everyone?")
            );
            if (!ok) return;
            try {
              await api.deleteChatForEveryone(chatId);
              chatStore.deleteChatForMe(chatId);
              if (String(chatStore.activeId) === String(chatId)) {
                chatStore.setActiveId(null);
              }
            } catch (e) {
              window.alert(e.message || l("Ошибка", "Error"));
            }
          }}
          onToggleMuteChat={(chatId) => {
            toggleMuted(auth.me?.id, chatId);
            setChatPrefsTick(v => v + 1);
          }}
          onToggleArchiveChat={(chatId) => {
            const archived = toggleArchived(auth.me?.id, chatId);
            setChatPrefsTick(v => v + 1);
            if (archived && String(chatStore.activeId) === String(chatId)) {
              chatStore.setActiveId(null);
            }
          }}
          sidebarCompact={sidebarCompact}
          activeTab={activeTab}
          onNavChange={setActiveTab}
          sidebarResizeEnabled={sidebarDesktop}
          onSidebarResizePointerDown={onSidebarResizePointerDown}
          onSidebarResizePointerMove={onSidebarResizePointerMove}
          onSidebarResizePointerUp={onSidebarResizePointerUp}
          onSidebarResizePointerCancel={onSidebarResizePointerUp}
          onSidebarResizeLostCapture={onSidebarResizeLostCapture}
          l={l}
        />

        <ChatView
          chatBg={chatBg}
          activeChat={activeChat}
          activeChatName={activeChatName}
          l={l}
          t={t}
          goBackToList={goBackToList}
          setProfileOpen={setProfileOpen}
          setChatSearchOpen={setChatSearchOpen}
          groupAdminOpen={groupAdminOpen}
          setGroupAdminOpen={setGroupAdminOpen}
          openSafetyNumber={openSafetyNumber}
          chatSearchOpen={chatSearchOpen}
          chatSearchRef={chatSearchRef}
          messageSearch={messageSearch}
          setMessageSearch={setMessageSearch}
          matchIds={matchIds}
          matchIndex={matchIndex}
          goToMatch={goToMatch}
          resetMessageSearch={resetMessageSearch}
          setChatBgs={setChatBgs}
          me={auth.me}
          chatStore={chatStore}
          profileOpen={profileOpen}
          chatMuted={chatMuted}
          toggleMuted={(userId, chatId) => {
            toggleMuted(userId, chatId);
            setChatPrefsTick(v => v + 1);
          }}
          onAliasChange={() => setAliasTick(v => v + 1)}
          activeMsgs={activeMsgs}
          loadingMsgs={msgStore.loadingMsgs}
          openCtx={openCtx}
          reactToMsg={reactToMsg}
          typingUsername={typingUsers[chatStore.activeId] || null}
          activeMatchId={activeMatchId}
          scrollToMessageId={scrollToMessageId}
          unreadCount={Number(activeChat?.unread || 0)}
          onPinChange={(pinned) => { atBottomRef.current = pinned; }}
          onReachedBottom={() => markActiveChatRead(chatStore.activeId)}
          isRequesterInPendingChat={isRequesterInPendingChat}
          requesterFirstMsgSent={requesterFirstMsgSent}
          sendMsg={sendMsg}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          sendTyping={() => ws.sendTyping(chatStore.activeId)}
          isPendingRequestChat={isPendingRequestChat}
          myGroupMuteUntilMs={myGroupMuteUntilMs}
          myGroupMuteCountdown={myGroupMuteCountdown}
          messagePlaceholder={t.message_placeholder}
        />
      </div>
      )}

      <ContextMenu
        ctx={ctx}
        ctxClosing={ctxClosing}
        ctxMenuRef={ctxMenuRef}
        onReact={reactToMsg}
        onReply={(msg) => { setReplyTo(msg); setCtx(null); }}
        onEdit={beginEdit}
        onCopy={(msg) => { navigator.clipboard?.writeText(msg._text || ""); setCtx(null); }}
        onDelete={beginDelete}
        l={l}
      />

      <EditMessageModal
        editTarget={editTarget}
        editText={editText}
        editLoading={editLoading}
        setEditText={setEditText}
        setEditTarget={setEditTarget}
        submitEdit={submitEdit}
        l={l}
      />

      <DeleteMessageModal
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        confirmDelete={confirmDelete}
        l={l}
      />

      {showSettings && (
        <ProfileModal
          me={auth.me}
          lang={lang}
          onClose={() => setShowSettings(false)}
          onSaved={(u) => { auth.setMe(u); setShowSettings(false); chatStore.loadChats(u?.id || auth.me?.id); }}
        />
      )}

      {showNewChat && (
        <NewChatModal
          me={auth.me}
          l={l}
          onClose={() => setShowNewChat(false)}
          onCreated={onChatCreated}
          initialTab={newChatInitialTab}
          suggestedContacts={chatStore.chats.filter(c => c.type === "direct" && c.otherUserId).map(c => ({
            id: c.otherUserId,
            username: c.username,
            firstName: c.name,
            lastName: "",
            avatarUrl: c.avatarUrl,
          }))}
          requests={chatStore.requests.map(c => ({ ...c, name: displayNameForChat(c, auth.me?.id) }))}
          loadingRequests={chatStore.loadingRequests}
          onAcceptRequest={async (chatId) => {
            try { await api.acceptRequest(chatId); } catch (_) { /* ignore stale request state */ }
            await chatStore.loadRequests(auth.me?.id);
            await chatStore.loadChats(auth.me?.id);
            setShowNewChat(false);
            chatStore.selectChat(chatId);
          }}
          onDeclineRequest={async (chatId) => {
            try { await api.declineRequest(chatId); } catch (_) { /* ignore stale request state */ }
            chatStore.loadRequests(auth.me?.id);
            chatStore.loadChats(auth.me?.id);
          }}
        />
      )}

      <SafetyNumberModal
        safetyModal={safetyModal}
        onSelectDevice={(selectedDeviceId) => setSafetyModal(current => ({ ...current, selectedDeviceId }))}
        onVerify={verifySafetyDevice}
        onClose={() => setSafetyModal({ open: false, devices: [], selectedDeviceId: null, error: null })}
        l={l}
      />

    </div>
  );
}


