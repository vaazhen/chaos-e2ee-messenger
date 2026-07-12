import { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback } from "react";
import { CSS } from "./styles";

import { useAuth }     from "./hooks/useAuth";
import { useChats }    from "./hooks/useChats";
import { useMessages } from "./hooks/useMessages";
import { useI18n }     from "./hooks/useI18n";
import useWebSocket    from "./hooks/useWebSocket";
import useNowTicker    from "./hooks/useNowTicker";
import { getActiveGroupMuteUntilMs, formatMuteCountdown } from "./groupMute";

import AuthScreen   from "./components/AuthScreen";
import SetupProfile from "./components/SetupProfile";
import ChatList     from "./components/ChatList";
import MessageList  from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import ProfileModal from "./components/ProfileModal";
import NewChatModal from "./components/NewChatModal";
import Ava          from "./components/Ava";
import UserProfileModal from "./components/UserProfileModal";
import GroupAdminModal from "./components/GroupAdminModal";
import SafetyNumberModal from "./components/SafetyNumberModal";
import EditMessageModal from "./components/EditMessageModal";
import DeleteMessageModal from "./components/DeleteMessageModal";
import ContextMenu from "./components/ContextMenu";
import ChatInfoPanel from "./components/ChatInfoPanel";
import ChatSearchBar from "./components/ChatSearchBar";
import useWebRTC from "./hooks/useWebRTC";
import CallOverlay from "./components/CallOverlay";
import SettingsPage from "./components/SettingsPage";
import BottomNav from "./components/BottomNav";
import { api } from "./api";
import { computeSafetyNumber, formatSafetyNumber } from "./safety-number";
import { ShieldIcon, BackIcon } from "./components/Icons";

import { getTime, messageMatchesQuery } from "./helpers";
import { clearPreviewCacheForUser } from "./previewCache";
import { useUiTranslator } from "./i18n/useUiTranslator";
import { displayNameForChat } from "./contactAliases";
import { getChatUiPrefs, toggleArchived, toggleMuted } from "./chatUiPrefs";
import { canOpenGroupAdmin } from "./utils/groupRbac";

const THEME_STORAGE_KEY = "cm_theme";
const SIDEBAR_WIDTH_KEY = "cm_sidebar_width";
const SIDEBAR_LEGACY_COLLAPSED_KEY = "cm_sidebar_collapsed";
const SIDEBAR_MIN = 68;
const SIDEBAR_MAX = 520;
const SIDEBAR_DEFAULT = 400;

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

/** Гистерезис: меньше дёрганья у границы «широкий / только аватарки». */
const SIDEBAR_COMPACT_ENTER = 112;
const SIDEBAR_COMPACT_EXIT = 128;

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

function clampSidebarWidth(n) {
  return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, Math.round(Number(n))));
}

function readInitialSidebarWidth() {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (raw != null) {
      const n = Number(raw);
      if (Number.isFinite(n)) return clampSidebarWidth(n);
    }
    if (localStorage.getItem(SIDEBAR_LEGACY_COLLAPSED_KEY) === "1") {
      return 76;
    }
  } catch {
    /* ignore */
  }
  return SIDEBAR_DEFAULT;
}

export default function ChaosMessenger() {
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  const auth      = useAuth();
  const { lang, t, loadTranslations, switchLang } = useI18n();
  useUiTranslator(lang);
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
  const [chatInfoOpen,   setChatInfoOpen]   = useState(false);
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
  const chatInfoRef = useRef(null);
  const chatInfoBtnRef = useRef(null);
  const groupAdminBtnRef = useRef(null);
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

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  });

  const [sidebarWidth, setSidebarWidth] = useState(() =>
    typeof window !== "undefined" ? readInitialSidebarWidth() : SIDEBAR_DEFAULT
  );
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    const desktop = window.matchMedia("(min-width: 861px)").matches;
    return desktop && readInitialSidebarWidth() <= SIDEBAR_COMPACT_ENTER;
  });
  const [sidebarDragging, setSidebarDragging] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  const sidebarDesktopRef = useRef(true);
  const dragSidebarRef = useRef({
    active: false,
    startX: 0,
    startW: SIDEBAR_DEFAULT,
    pointerId: null,
  });
  const pendingSidebarWidthRef = useRef(null);
  const rafSidebarRef = useRef(null);

  const [sidebarDesktop, setSidebarDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 861px)").matches : true
  );

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    sidebarDesktopRef.current = sidebarDesktop;
  }, [sidebarDesktop]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 861px)");
    const onMq = () => setSidebarDesktop(mq.matches);
    mq.addEventListener("change", onMq);
    onMq();
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useLayoutEffect(() => {
    if (!sidebarDesktop) {
      setSidebarCompact(prev => (prev ? false : prev));
      return;
    }
    setSidebarCompact(prev => {
      if (prev) {
        return sidebarWidth > SIDEBAR_COMPACT_EXIT ? false : true;
      }
      return sidebarWidth <= SIDEBAR_COMPACT_ENTER ? true : false;
    });
  }, [sidebarWidth, sidebarDesktop]);

  const applyPendingSidebarWidth = useCallback(() => {
    const v = pendingSidebarWidthRef.current;
    if (v == null) return;
    pendingSidebarWidthRef.current = null;
    setSidebarWidth(v);
    sidebarWidthRef.current = v;
  }, []);

  const onSidebarResizePointerDown = useCallback((e) => {
    if (!sidebarDesktopRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    dragSidebarRef.current = {
      active: true,
      startX: e.clientX,
      startW: sidebarWidthRef.current,
      pointerId: e.pointerId,
    };
    setSidebarDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onSidebarResizePointerMove = useCallback((e) => {
    if (!dragSidebarRef.current.active) return;
    e.preventDefault();
    const { startX, startW } = dragSidebarRef.current;
    const next = clampSidebarWidth(startW + (e.clientX - startX));
    pendingSidebarWidthRef.current = next;
    if (rafSidebarRef.current != null) return;
    rafSidebarRef.current = requestAnimationFrame(() => {
      rafSidebarRef.current = null;
      applyPendingSidebarWidth();
    });
  }, [applyPendingSidebarWidth]);

  const flushSidebarResizePending = useCallback(() => {
    if (rafSidebarRef.current != null) {
      cancelAnimationFrame(rafSidebarRef.current);
      rafSidebarRef.current = null;
    }
    if (pendingSidebarWidthRef.current != null) {
      const v = pendingSidebarWidthRef.current;
      pendingSidebarWidthRef.current = null;
      setSidebarWidth(v);
      sidebarWidthRef.current = v;
    }
  }, []);

  const endSidebarResizeDrag = useCallback((releaseTarget, pointerId) => {
    if (!dragSidebarRef.current.active) return;
    dragSidebarRef.current.active = false;
    dragSidebarRef.current.pointerId = null;
    setSidebarDragging(false);
    flushSidebarResizePending();
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidthRef.current));
      localStorage.removeItem(SIDEBAR_LEGACY_COLLAPSED_KEY);
    } catch {
      /* ignore */
    }
    if (releaseTarget?.releasePointerCapture && pointerId != null) {
      try {
        releaseTarget.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }
  }, [flushSidebarResizePending]);

  const onSidebarResizePointerUp = useCallback((e) => {
    const pid = dragSidebarRef.current.pointerId;
    endSidebarResizeDrag(e.currentTarget, pid);
  }, [endSidebarResizeDrag]);

  const onSidebarResizeLostCapture = useCallback((e) => {
    if (!dragSidebarRef.current.active) return;
    if (e.pointerId !== dragSidebarRef.current.pointerId) return;
    endSidebarResizeDrag(null, null);
  }, [endSidebarResizeDrag]);

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

  const l = useMemo(() => {
    const effectiveLang = String(lang || "ru").toLowerCase().startsWith("en") ? "en" : "ru";
    return (ru, en) => (effectiveLang === "ru" ? ru : en);
  }, [lang]);

  const showGroupAdminBtn = useMemo(() => {
    if (!activeChat || activeChat.type !== "group") return false;
    return canOpenGroupAdmin(activeChat.myRole);
  }, [activeChat]);

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
    if (!showGroupAdminBtn && groupAdminOpen) setGroupAdminOpen(false);
  }, [showGroupAdminBtn, groupAdminOpen]);

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

      const insideInfo =
        isInside(groupAdminBtnRef, target);

      if (chatInfoOpen && !insideInfo) {
        if (target.closest(".modal-bg > .modal")) return;
        setChatInfoOpen(false);
      }
    };

    document.addEventListener("mousedown", closeExternalPopovers, true);
    document.addEventListener("touchstart", closeExternalPopovers, true);

    return () => {
      document.removeEventListener("mousedown", closeExternalPopovers, true);
      document.removeEventListener("touchstart", closeExternalPopovers, true);
    };
  }, [ctx, chatSearchOpen, chatInfoOpen, resetMessageSearch]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

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
    if (chatStore.activeId) {
      msgStore.loadMessages(chatStore.activeId);
    }
  }, [chatStore.activeId]); // eslint-disable-line

  const wsCallSignalRef = useRef(null);

  const call = useWebRTC({
    publish: (dest, body) => ws?.publish(dest, body),
    onCallEnded: () => {},
  });

  wsCallSignalRef.current = call.handleSignalingMessage;

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
        if (result.type !== "MESSAGE_EDITED" && result.type !== "MESSAGE_REACTION") {
          chatStore.updateChatPreview(chatId, result.text, result.isOut, event.createdAt, !result.isOut && !isActive);
        }
        if (!result.isOut && isActive) {
          api.markRead(chatId).catch(() => {});
          api.markDelivered(chatId).catch(() => {});
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
    onCallSignal: (msg) => wsCallSignalRef.current?.(msg),
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
    setChatInfoOpen(false);
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
          l={l}
          onToggleTheme={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
          onLogout={logout}
          onEditProfile={() => setShowSettings(true)}
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

        <section className={`chat-view chat-bg-${chatBg}`}>
          {!activeChat ? (
            <div className="product-empty">
              <div className="product-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="product-empty-title">{l("Нет сообщений", "No messages")}</div>
              <div className="product-empty-sub">
                {l("Создайте новую переписку.", "Start a new conversation.")}
              </div>
            </div>
          ) : (
            <>
              <div className="product-chat-head">
                <button className="round-action desktop-hidden" onClick={goBackToList} title={l("Назад", "Back")}><BackIcon /></button>

                <button
                  type="button"
                  className="chat-head-name-pill"
                  onClick={() => {
                    if (activeChat.type === "direct") setProfileOpen(true);
                    else setChatInfoOpen(true);
                    setChatSearchOpen(false);
                  }}
                  title={l("Профиль", "Profile")}
                >
                  <b>{activeChatName || activeChat.name}</b>
                  <small className={`${activeChat.online ? "" : "off"}`}>
                    {activeChat.type === "group"
                      ? `${activeChat.members} ${t.participants || "members"}`
                      : activeChat.online ? (t.online || "online") : (t.offline || "last seen recently")}
                  </small>
                </button>

                <div className="chat-head-right">
                  {showGroupAdminBtn && (
                    <button
                      ref={groupAdminBtnRef}
                      type="button"
                      className={`chat-head-mini-btn${groupAdminOpen ? " active" : ""}`}
                      title={l("Администрирование группы", "Group administration")}
                      aria-label={l("Администрирование группы", "Group administration")}
                      onClick={() => {
                        setGroupAdminOpen(true);
                        setChatInfoOpen(false);
                        setChatSearchOpen(false);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3 19 6v6c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
                      </svg>
                    </button>
                  )}
                  {activeChat.type === "direct" && (
                    <button
                      type="button"
                      className="chat-head-mini-btn"
                      title={l("Проверить шифрование", "Verify encryption")}
                      aria-label={l("Проверить шифрование", "Verify encryption")}
                      onClick={() => {
                        void openSafetyNumber();
                        setProfileOpen(false);
                        setChatSearchOpen(false);
                      }}
                    >
                      <ShieldIcon />
                    </button>
                  )}
                  <button
                    type="button"
                    className="chat-head-avatar"
                    onClick={() => {
                      if (activeChat.type === "direct") setProfileOpen(true);
                      else setChatInfoOpen(true);
                      setChatSearchOpen(false);
                    }}
                    title={l("Фото профиля", "Profile photo")}
                    aria-label={l("Фото профиля", "Profile photo")}
                  >
                    <Ava name={activeChatName || activeChat.name} colorIdx={activeChat.colorIdx} size="md" avatarUrl={activeChat.avatarUrl} />
                  </button>
                </div>
              </div>

              {chatSearchOpen && (
                <ChatSearchBar
                  chatSearchRef={chatSearchRef}
                  messageSearch={messageSearch}
                  setMessageSearch={setMessageSearch}
                  matchIds={matchIds}
                  matchIndex={matchIndex}
                  goToMatch={goToMatch}
                  resetMessageSearch={resetMessageSearch}
                  l={l}
                />
              )}

              {chatInfoOpen && activeChat?.type === "group" && (
                <ChatInfoPanel
                  chat={activeChat}
                  chatBg={chatBg}
                  onChangeBg={(val) => setChatBgs(prev => ({...prev, [String(activeChat.id)]: val}))}
                  onClose={() => setChatInfoOpen(false)}
                />
              )}

              {groupAdminOpen && showGroupAdminBtn && activeChat?.type === "group" && (
                <GroupAdminModal
                  me={auth.me}
                  chat={activeChat}
                  l={l}
                  onRefreshGroup={async (chatId) => {
                    await chatStore.loadChats(auth.me?.id);
                    chatStore.setActiveId(chatId);
                  }}
                  onClose={() => setGroupAdminOpen(false)}
                />
              )}

              {profileOpen && activeChat?.type === "direct" && (
                <UserProfileModal
                  me={auth.me}
                  l={l}
                  chat={{ ...activeChat, name: activeChatName || activeChat.name }}
                  onClose={() => setProfileOpen(false)}
                  onCall={() => {
                    const otherUser = activeChat?.username;
                    if (otherUser) call.startCall(chatStore.activeId, otherUser, false);
                    setProfileOpen(false);
                  }}
                  onVideoCall={() => {
                    const otherUser = activeChat?.username;
                    if (otherUser) call.startCall(chatStore.activeId, otherUser, true);
                    setProfileOpen(false);
                  }}
                  onOpenSearch={() => { setProfileOpen(false); setChatSearchOpen(true); }}
                  chatBg={chatBg}
                  onChangeBg={(val) => setChatBgs(prev => ({...prev, [String(chatStore.activeId)]: val}))}
                  muted={chatMuted}
                  onToggleMute={() => toggleMuted(auth.me?.id, chatStore.activeId)}
                />
              )}

              <MessageList
                msgs={activeMsgs}
                me={auth.me}
                activeChat={activeChat}
                loadingMsgs={msgStore.loadingMsgs}
                onContextMenu={openCtx}
                onReact={reactToMsg}
                searchQuery={messageSearch}
                typingUsername={typingUsers[chatStore.activeId] || null}
                activeMatchId={activeMatchId}
                scrollToMessageId={scrollToMessageId}
              />

              {isRequesterInPendingChat && requesterFirstMsgSent && (
                <div className="request-wait-banner">
                  {l(
                    "Подождите, пока пользователь примет ваш запрос.",
                    "Please wait until the user accepts your request."
                  )}
                </div>
              )}

              <MessageInput
                onSend={sendMsg}
                replyTo={replyTo}
                onОтменаОтветить={() => setReplyTo(null)}
                onTyping={() => ws.sendTyping(chatStore.activeId)}
                disabled={
                  (isPendingRequestChat && !isRequesterInPendingChat) ||
                  (isRequesterInPendingChat && requesterFirstMsgSent) ||
                  Boolean(myGroupMuteUntilMs)
                }
                pendingFirstMessageOnly={isRequesterInPendingChat && !requesterFirstMsgSent}
                muteInlineNotice={
                  myGroupMuteUntilMs
                    ? l(
                        `Вы в муте в этой группе. Осталось: ${myGroupMuteCountdown || "…"}`,
                        `You are muted in this group. Time left: ${myGroupMuteCountdown || "…"}`
                      )
                    : null
                }
                messagePlaceholder={t.message_placeholder}
                replyPreviewTitle={l("Ответить", "Reply")}
              />
            </>
          )}
        </section>
      </div>
      )}
      {!(activeTab === "chats" && activeChat) && (
      <BottomNav
        me={auth.me}
        myName={[auth.me?.firstName, auth.me?.lastName].filter(Boolean).join(" ") || auth.me?.username || l("Я", "Me")}
        activeTab={activeTab}
        onNavChange={setActiveTab}
        unreadTotal={aliasedChats.filter(c => c.unread > 0).length}
        l={l}
      />
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
          theme={theme}
          onClose={() => setShowSettings(false)}
          onSaved={(u) => { auth.setMe(u); setShowSettings(false); chatStore.loadChats(u?.id || auth.me?.id); }}
          onToggleTheme={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
          onSwitchLang={() => switchLang(lang === "ru" ? "en" : "ru")}
          onLogout={logout}
          onOpenChat={onChatCreated}
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

      <CallOverlay
        callState={call.callState}
        remoteUsername={call.remoteUsername}
        isVideo={call.isVideo}
        isMuted={call.isMuted}
        isScreenSharing={call.isScreenSharing}
        callDuration={call.callDuration}
        localVideoRef={call.localVideoRef}
        remoteVideoRef={call.remoteVideoRef}
        onAnswer={call.answerCall}
        onDecline={call.endCall}
        onEnd={call.endCall}
        onToggleMute={call.toggleMute}
        onToggleVideo={call.toggleVideo}
        onToggleScreenShare={call.toggleScreenShare}
        lang={lang}
      />
    </div>
  );
}


