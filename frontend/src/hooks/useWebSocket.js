import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_URL } from "../config";
import { api, getToken } from "../api";
import { getOrCreateDeviceId } from "../deviceId";

const MAX_RECOVERY_EVENTS = 100000;
const MAX_BUFFERED_LIVE_EVENTS = 5000;
const MAX_FULL_RESYNC_ATTEMPTS = 3;
const FULL_RESYNC_RETRY_DELAY_MS = import.meta.env.MODE === "test" ? 10 : 2000;

function debugLog(...args) {
  if (import.meta.env.DEV) console.warn(...args);
}

function cursorStorageKey(deviceId) {
  return `cm_realtime_cursor:${deviceId}`;
}

function readCursor(deviceId) {
  try {
    const value = Number(localStorage.getItem(cursorStorageKey(deviceId)) || 0);
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeCursor(deviceId, sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 0) return;
  try {
    localStorage.setItem(cursorStorageKey(deviceId), String(sequence));
  } catch (_) { /* cursor is an optimization; timeline sync remains the fallback */ }
}

export default function useWebSocket({
  me,
  _activeId,
  chatIds = [],
  onMessage,
  onChatListUpdate,
  onRequestsUpdate,
  onStatusUpdate,
  onTyping,
  onConnectionState,
  onCallSignal,
  enabled,
}) {
  const clientRef = useRef(null);
  const subsRef = useRef({});
  const chatIdsRef = useRef([]);
  const heartbeatRef = useRef(null);
  const hadConnectedRef = useRef(false);
  const seenEventIdsRef = useRef(new Set());
  const inFlightRef = useRef(new Set());
  const recoveringRef = useRef(false);
  const recoveryStateRef = useRef("LIVE");
  const liveBufferRef = useRef([]);
  const cursorRef = useRef(0);
  const eventQueueRef = useRef(Promise.resolve());
  const fullResyncTimerRef = useRef(null);
  const fullResyncAttemptsRef = useRef(0);
  const handlersRef = useRef({ onMessage, onChatListUpdate, onRequestsUpdate, onStatusUpdate, onTyping, onConnectionState, onCallSignal });

  useEffect(() => {
    handlersRef.current = { onMessage, onChatListUpdate, onRequestsUpdate, onStatusUpdate, onTyping, onConnectionState, onCallSignal };
  }, [onMessage, onChatListUpdate, onRequestsUpdate, onStatusUpdate, onTyping, onConnectionState, onCallSignal]);

  useEffect(() => { chatIdsRef.current = chatIds; }, [chatIds]);

  const unsub = (name) => {
    if (subsRef.current[name]) {
      try { subsRef.current[name].unsubscribe(); } catch (_) { /* ignore optional failure */ }
      delete subsRef.current[name];
    }
  };

  const unsubAll = () => {
    Object.keys(subsRef.current).forEach(unsub);
  };

  const claimEvent = (event) => {
    const eventId = event?.eventId;
    if (!eventId) return "NEW";
    if (seenEventIdsRef.current.has(eventId)) return "APPLIED";
    if (inFlightRef.current.has(eventId)) return "IN_FLIGHT";

    inFlightRef.current.add(eventId);
    if (inFlightRef.current.size > 50000) {
      const oldest = inFlightRef.current.values().next().value;
      if (oldest) inFlightRef.current.delete(oldest);
    }
    return "NEW";
  };

  const markEventApplied = (eventId) => {
    if (!eventId) return;
    inFlightRef.current.delete(eventId);
    const seen = seenEventIdsRef.current;
    seen.add(eventId);
    if (seen.size > 50000) {
      const oldest = seen.values().next().value;
      if (oldest) seen.delete(oldest);
    }
  };

  const markEventFailed = (eventId) => {
    if (eventId) inFlightRef.current.delete(eventId);
  };

  const advanceCursor = (deviceId, event) => {
    const sequence = Number(event?.sequence || 0);
    if (!Number.isSafeInteger(sequence) || sequence <= cursorRef.current) return;
    cursorRef.current = sequence;
    writeCursor(deviceId, sequence);
  };

  const dispatchDurableEvent = async (deviceId, destination, event) => {
    if (!event) return;

    const eventId = event.eventId;
    const claim = claimEvent(event);
    // A duplicate must never advance the cursor by itself. The original event
    // either already advanced it after durable apply or is still in-flight.
    if (claim !== "NEW") return;

    try {
      if (/^\/chats\/\d+$/.test(destination || "")) {
        const chatId = Number(event.chatId || String(destination).split("/").pop());
        await handlersRef.current.onMessage?.(event, chatId);
      } else if (destination === "/status") {
        await handlersRef.current.onStatusUpdate?.({ type: "delivery", ...event });
      } else if (destination === "/chats") {
        await handlersRef.current.onChatListUpdate?.(event);
      } else if (destination === "/requests") {
        await handlersRef.current.onRequestsUpdate?.(event);
      }
      markEventApplied(eventId);
      advanceCursor(deviceId, event);
    } catch (error) {
      markEventFailed(eventId);
      debugLog("[WS] durable event handler failed:", error?.message || error);
      throw error;
    }
  };

  const enqueueDurableEvent = (deviceId, destination, event) => {
    const task = eventQueueRef.current.then(() => dispatchDurableEvent(deviceId, destination, event));
    // Keep the chain usable after a rejected task. The returned task still
    // rejects so the caller can trigger recovery.
    eventQueueRef.current = task.catch(() => undefined);
    return task;
  };

  const clearFullResyncTimer = () => {
    if (fullResyncTimerRef.current) {
      clearTimeout(fullResyncTimerRef.current);
      fullResyncTimerRef.current = null;
    }
  };

  const requestFullResync = (deviceId, reason) => {
    recoveryStateRef.current = "FULL_RESYNC_REQUIRED";
    recoveringRef.current = true;
    debugLog("[WS] full resync required:", reason?.message || reason || "unknown reason");

    if (fullResyncTimerRef.current) return;
    if (fullResyncAttemptsRef.current >= MAX_FULL_RESYNC_ATTEMPTS) {
      recoveringRef.current = false;
      recoveryStateRef.current = "FAILED";
      handlersRef.current.onConnectionState?.({
        connected: clientRef.current?.connected ?? false,
        recoveryFailed: true,
      });
      return;
    }

    fullResyncTimerRef.current = setTimeout(() => {
      fullResyncTimerRef.current = null;
      fullResyncAttemptsRef.current += 1;
      void recoverMissedEvents(deviceId, { fullResync: true });
    }, FULL_RESYNC_RETRY_DELAY_MS);
  };

  const handleDurableLive = (deviceId, destination, event) => {
    if (recoveringRef.current || recoveryStateRef.current !== "LIVE") {
      if (liveBufferRef.current.length >= MAX_BUFFERED_LIVE_EVENTS) {
        liveBufferRef.current = [];
        requestFullResync(deviceId, new Error("LIVE_BUFFER_OVERFLOW"));
        return;
      }
      liveBufferRef.current.push({ destination, event });
      return;
    }

    void enqueueDurableEvent(deviceId, destination, event)
      .catch((error) => requestFullResync(deviceId, error));
  };

  const flushLiveBuffer = async (deviceId) => {
    const buffered = liveBufferRef.current.splice(0);
    buffered.sort((left, right) => Number(left.event?.sequence || Number.MAX_SAFE_INTEGER)
      - Number(right.event?.sequence || Number.MAX_SAFE_INTEGER));

    for (const { destination, event } of buffered) {
      await enqueueDurableEvent(deviceId, destination, event);
    }
  };

  async function recoverMissedEvents(deviceId, { fullResync = false } = {}) {
    clearFullResyncTimer();
    recoveringRef.current = true;
    recoveryStateRef.current = "RECOVERING";

    if (fullResync) {
      cursorRef.current = 0;
      writeCursor(deviceId, 0);
      seenEventIdsRef.current.clear();
      inFlightRef.current.clear();
    } else {
      cursorRef.current = readCursor(deviceId);
      fullResyncAttemptsRef.current = 0;
    }

    let failed = false;
    try {
      let cursor = cursorRef.current;
      let totalRecovered = 0;

      while (totalRecovered < MAX_RECOVERY_EVENTS) {
        const response = await api.syncRealtime(cursor, 200);
        const events = Array.isArray(response?.events) ? response.events : [];
        if (events.length === 0) break;

        for (const item of events) {
          const payload = { ...(item?.payload || {}) };
          if (item?.eventId && !payload.eventId) payload.eventId = item.eventId;
          if (item?.sequence != null) payload.sequence = Number(item.sequence);
          await enqueueDurableEvent(deviceId, item?.destination, payload);
          totalRecovered += 1;
        }

        // nextCursor is trusted only after the whole page was durably applied.
        cursor = Number(response?.nextCursor ?? cursorRef.current);
        if (!response?.hasMore) break;
      }

      if (totalRecovered >= MAX_RECOVERY_EVENTS) {
        throw new Error("RECOVERY_SAFETY_CAP_REACHED");
      }

      await flushLiveBuffer(deviceId);
      recoveryStateRef.current = "LIVE";
      fullResyncAttemptsRef.current = 0;
    } catch (error) {
      failed = true;
      debugLog("[WS] realtime recovery failed:", error?.message || error);
      requestFullResync(deviceId, error);
    } finally {
      if (!failed && recoveryStateRef.current === "LIVE") {
        recoveringRef.current = false;
      }
    }
  }

  const stopPresenceHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const startPresenceHeartbeat = (client) => {
    stopPresenceHeartbeat();
    heartbeatRef.current = setInterval(() => {
      if (!client?.connected) return;
      try {
        client.publish({ destination: "/app/user.online", body: "{}" });
      } catch (_) { /* ignore optional failure */ }
    }, 25000);
  };

  const setupPresence = (client, username) => {
    if (!client?.connected || !username) return;
    ["userStatus", "myStatus", "chats", "deviceChats", "requests", "deviceRequests", "calls"]
      .forEach(unsub);

    const did = getOrCreateDeviceId();
    debugLog("[WS] presence subscriptions ready");

    subsRef.current.userStatus = client.subscribe("/topic/user/status", (msg) => {
      try {
        const event = { type: "user_status", ...JSON.parse(msg.body || "{}") };
        const claim = claimEvent(event);
        if (claim === "NEW") {
          handlersRef.current.onStatusUpdate?.(event);
          markEventApplied(event.eventId);
        }
      } catch (_) { /* ignore malformed websocket payload */ }
    });

    if (did) {
      subsRef.current.myStatus = client.subscribe(`/topic/devices/${did}/status`, (msg) => {
        try { handleDurableLive(did, "/status", JSON.parse(msg.body || "{}")); }
        catch (_) { /* ignore malformed websocket payload */ }
      });
      subsRef.current.deviceChats = client.subscribe(`/topic/devices/${did}/chats`, (msg) => {
        try { handleDurableLive(did, "/chats", JSON.parse(msg.body || "{}")); }
        catch (_) { /* ignore malformed websocket payload */ }
      });
      subsRef.current.deviceRequests = client.subscribe(`/topic/devices/${did}/requests`, (msg) => {
        try { handleDurableLive(did, "/requests", JSON.parse(msg.body || "{}")); }
        catch (_) { /* ignore malformed websocket payload */ }
      });
    }

    subsRef.current.calls = client.subscribe(`/topic/users/${username}/calls`, (msg) => {
      try { handlersRef.current.onCallSignal?.(JSON.parse(msg.body || "{}")); }
      catch (_) { /* ignore optional failure */ }
    });

    // Legacy user topics remain subscribed during rolling upgrades. Event IDs
    // deduplicate them against the new device-scoped durable topics.
    subsRef.current.chats = client.subscribe(`/topic/users/${username}/chats`, (msg) => {
      try {
        const data = JSON.parse(msg?.body || "{}");
        const claim = claimEvent(data);
        if (claim === "NEW") {
          handlersRef.current.onChatListUpdate?.(data);
          markEventApplied(data.eventId);
        }
      } catch (_) { handlersRef.current.onChatListUpdate?.(); }
    });
    subsRef.current.requests = client.subscribe(`/topic/users/${username}/requests`, (msg) => {
      try {
        const data = JSON.parse(msg?.body || "{}");
        const claim = claimEvent(data);
        if (claim === "NEW") {
          handlersRef.current.onRequestsUpdate?.(data);
          markEventApplied(data.eventId);
        }
      } catch (_) { handlersRef.current.onRequestsUpdate?.(); }
    });

    client.publish({ destination: "/app/user.online", body: "{}" });
    startPresenceHeartbeat(client);
  };

  const subscribeToChat = (client, chatId) => {
    if (!client?.connected || !chatId) return;
    const did = getOrCreateDeviceId();
    if (!did) return;

    const cid = Number(chatId);
    const chatSubName = `chat:${cid}`;
    const typingSubName = `typing:${cid}`;
    if (subsRef.current[chatSubName] && subsRef.current[typingSubName]) return;

    subsRef.current[chatSubName] = client.subscribe(`/topic/devices/${did}/chats/${cid}`, (msg) => {
      try { handleDurableLive(did, `/chats/${cid}`, JSON.parse(msg.body || "{}")); }
      catch (error) { console.error("[WS] parse error:", error); }
    });
    subsRef.current[typingSubName] = client.subscribe(`/topic/chats/${cid}/typing`, (msg) => {
      try { handlersRef.current.onTyping?.(JSON.parse(msg.body || "{}"), cid); }
      catch (_) { /* ignore malformed websocket payload */ }
    });
  };

  const setupChatSubscriptions = (client, ids) => {
    if (!client?.connected) return;
    const normalized = [...new Set((ids || []).filter(Boolean).map(Number))];
    const wanted = new Set(normalized.flatMap(id => [`chat:${id}`, `typing:${id}`]));
    Object.keys(subsRef.current)
      .filter(name => (name.startsWith("chat:") || name.startsWith("typing:")) && !wanted.has(name))
      .forEach(unsub);
    normalized.forEach(id => subscribeToChat(client, id));
  };

  useEffect(() => {
    if (!enabled || !me?.username) return;
    const token = getToken();
    if (!token) return;

    const did = getOrCreateDeviceId();
    const username = me.username;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 2000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectHeaders: {
        Authorization: "Bearer " + token,
        "X-Device-Id": did,
      },
      debug: (str) => {
        if (import.meta.env.DEV && (str.includes("ERROR") || str.includes("DISCONNECT"))) console.warn("[STOMP]", str);
      },
    });

    client.onConnect = () => {
      clientRef.current = client;
      clearFullResyncTimer();
      fullResyncAttemptsRef.current = 0;
      recoveringRef.current = true;
      setupPresence(client, username);
      setupChatSubscriptions(client, chatIdsRef.current);
      handlersRef.current.onConnectionState?.({ connected: true, isReconnect: hadConnectedRef.current });
      hadConnectedRef.current = true;
      void recoverMissedEvents(did);
    };

    client.onWebSocketClose = () => {
      handlersRef.current.onConnectionState?.({ connected: false, isReconnect: hadConnectedRef.current });
      debugLog("[WS] disconnected, reconnecting");
    };
    client.onStompError = (frame) => console.error("[WS] STOMP error:", frame?.headers?.message || "broker error");

    client.activate();
    clientRef.current = client;

    return () => {
      stopPresenceHeartbeat();
      clearFullResyncTimer();
      unsubAll();
      liveBufferRef.current = [];
      recoveringRef.current = false;
      recoveryStateRef.current = "DISCONNECTED";
      eventQueueRef.current = Promise.resolve();
      try { client.deactivate(); } catch (_) { /* ignore optional failure */ }
      clientRef.current = null;
    };
  }, [enabled, me?.username]);

  useEffect(() => {
    if (clientRef.current?.connected) setupChatSubscriptions(clientRef.current, chatIds);
  }, [JSON.stringify(chatIds)]);

  return {
    isConnected: () => clientRef.current?.connected ?? false,
    sendTyping: (chatId) => {
      clientRef.current?.publish({ destination: "/app/typing", body: JSON.stringify({ chatId }) });
    },
    publish: (dest, body) => {
      clientRef.current?.publish({ destination: dest, body: typeof body === "string" ? body : JSON.stringify(body) });
    },
  };
}
