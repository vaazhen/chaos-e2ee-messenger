import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_URL } from "../config";
import { getToken, getCurrentDeviceId } from "../api";
import { getOrCreateDeviceId } from "../deviceId";

export default function useWebSocket({
  me,
  activeId,
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
  const clientRef   = useRef(null);
  const subsRef     = useRef({});
  const chatIdsRef  = useRef([]);
  const heartbeatRef = useRef(null);
  const hadConnectedRef = useRef(false);
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
    unsub("userStatus");
    unsub("myStatus");
    unsub("chats");
    unsub("requests");

    const did = getOrCreateDeviceId();
    console.log("[WS] presence subs deviceId=", did, "username=", username);

    subsRef.current["userStatus"] = client.subscribe("/topic/user/status", (msg) => {
      try { handlersRef.current.onStatusUpdate?.({ type: "user_status", ...JSON.parse(msg.body || "{}") }); }
      catch (_) { /* ignore malformed websocket payload */ }
    });

    if (did) {
      subsRef.current["myStatus"] = client.subscribe(`/topic/devices/${did}/status`, (msg) => {
        try { handlersRef.current.onStatusUpdate?.({ type: "delivery", ...JSON.parse(msg.body || "{}") }); }
        catch (_) { /* ignore malformed websocket payload */ }
      });
    }

    const userCallTopic = `/topic/users/${username}/calls`;
    subsRef.current["calls"] = client.subscribe(userCallTopic, (msg) => {
      try {
        const data = JSON.parse(msg.body || "{}");
        handlersRef.current.onCallSignal?.(data);
      } catch (_) { /* ignore optional failure */ }
    });

    subsRef.current["chats"] = client.subscribe(
      `/topic/users/${username}/chats`,
      (msg) => {
        try {
          const data = JSON.parse(msg?.body || "{}");
          handlersRef.current.onChatListUpdate?.(data);
        } catch (_) {
          handlersRef.current.onChatListUpdate?.();
        }
      }
    );

    subsRef.current["requests"] = client.subscribe(
      `/topic/users/${username}/requests`,
      (msg) => {
        try {
          const data = JSON.parse(msg?.body || "{}");
          handlersRef.current.onRequestsUpdate?.(data);
        } catch (_) {
          handlersRef.current.onRequestsUpdate?.();
        }
      }
    );

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

    const chatTopic   = `/topic/devices/${did}/chats/${cid}`;
    const typingTopic = `/topic/chats/${cid}/typing`;

    console.log("[WS] subscribe chat:", chatTopic);

    subsRef.current[chatSubName] = client.subscribe(chatTopic, (msg) => {
      try {
        const event = JSON.parse(msg.body || "{}");
        const resolvedChatId = Number(event.chatId || cid);
        console.log("[WS] msg event:", event.type, "chatId:", resolvedChatId);
        handlersRef.current.onMessage?.(event, resolvedChatId);
      } catch (e) { console.error("[WS] parse error:", e); }
    });

    subsRef.current[typingSubName] = client.subscribe(typingTopic, (msg) => {
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
        if (str.includes("ERROR") || str.includes("DISCONNECT")) console.warn("[STOMP]", str);
      },
    });

    client.onConnect = () => {
      console.log("[WS] Connected deviceId=", did);
      clientRef.current = client;
      setupPresence(client, username);
      setupChatSubscriptions(client, chatIdsRef.current);
      handlersRef.current.onConnectionState?.({
        connected: true,
        isReconnect: hadConnectedRef.current,
      });
      hadConnectedRef.current = true;
    };

    client.onWebSocketClose = () => {
      handlersRef.current.onConnectionState?.({
        connected: false,
        isReconnect: hadConnectedRef.current,
      });
      console.warn("[WS] Disconnected, reconnecting...");
    };
    client.onStompError = (frame) => console.error("[WS] STOMP error:", frame);

    client.activate();
    clientRef.current = client;

    return () => {
      stopPresenceHeartbeat();
      unsubAll();
      try { client.deactivate(); } catch (_) { /* ignore optional failure */ }
      clientRef.current = null;
    };
  }, [enabled, me?.username]); // keep the socket stable across normal re-renders

  useEffect(() => {
    if (clientRef.current?.connected) {
      setupChatSubscriptions(clientRef.current, chatIds);
    }
  }, [JSON.stringify(chatIds)]); // subscribe/unsubscribe only when chat ids actually change

  return {
    isConnected: () => clientRef.current?.connected ?? false,
    sendTyping: (chatId) => {
      clientRef.current?.publish({
        destination: "/app/typing",
        body: JSON.stringify({ chatId }),
      });
    },
    publish: (dest, body) => {
      clientRef.current?.publish({ destination: dest, body: typeof body === "string" ? body : JSON.stringify(body) });
    },
  };
}
