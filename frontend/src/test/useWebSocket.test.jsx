import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const wsMocks = vi.hoisted(() => {
  const clients = [];

  class MockClient {
    constructor(config) {
      this.config = config;
      this.connected = false;
      this.subscriptions = {};
      this.publish = vi.fn();
      this.activate = vi.fn(() => {
        this.connected = true;
        this.onConnect?.();
      });
      this.deactivate = vi.fn(() => {
        this.connected = false;
      });
      this.subscribe = vi.fn((topic, cb) => {
        const sub = { unsubscribe: vi.fn() };
        this.subscriptions[topic] = { cb, sub };
        return sub;
      });
      clients.push(this);
    }
  }

  return {
    clients,
    MockClient,
    getToken: vi.fn(() => "jwt-token"),
    syncRealtime: vi.fn(async (after = 0) => ({ events: [], nextCursor: after, hasMore: false })),
    getOrCreateDeviceId: vi.fn(() => "device-a"),
    sockJs: vi.fn(() => ({ socket: true })),
  };
});

vi.mock("@stomp/stompjs", () => ({
  Client: wsMocks.MockClient,
}));

vi.mock("sockjs-client", () => ({
  default: wsMocks.sockJs,
}));

vi.mock("../api", () => ({
  getToken: wsMocks.getToken,
  getCurrentDeviceId: vi.fn(() => "device-a"),
  api: { syncRealtime: wsMocks.syncRealtime },
}));

vi.mock("../deviceId", () => ({
  getOrCreateDeviceId: wsMocks.getOrCreateDeviceId,
}));

vi.mock("../config", () => ({
  WS_URL: "http://localhost/ws",
}));

describe("useWebSocket", () => {
  beforeEach(() => {
    wsMocks.clients.length = 0;
    vi.clearAllMocks();
    localStorage.clear();
    wsMocks.getToken.mockReturnValue("jwt-token");
    wsMocks.syncRealtime.mockImplementation(async (after = 0) => ({ events: [], nextCursor: after, hasMore: false }));
  });

  it("does not connect when disabled, user is missing or JWT is missing", async () => {
    const { default: useWebSocket } = await import("../hooks/useWebSocket");

    renderHook(() => useWebSocket({
      me: { username: "alice" },
      enabled: false,
    }));

    expect(wsMocks.clients).toHaveLength(0);

    renderHook(() => useWebSocket({
      me: null,
      enabled: true,
    }));

    expect(wsMocks.clients).toHaveLength(0);

    wsMocks.getToken.mockReturnValueOnce("");

    renderHook(() => useWebSocket({
      me: { username: "alice" },
      enabled: true,
    }));

    expect(wsMocks.clients).toHaveLength(0);
  });

  it("connects with JWT/device headers, subscribes presence/chats and publishes online", async () => {
    const { default: useWebSocket } = await import("../hooks/useWebSocket");

    const onChatListUpdate = vi.fn();
    const onStatusUpdate = vi.fn();
    const onMessage = vi.fn();
    const onTyping = vi.fn();

    renderHook(() => useWebSocket({
      me: { username: "alice" },
      activeId: 100,
      chatIds: [100, 200],
      onMessage,
      onChatListUpdate,
      onStatusUpdate,
      onTyping,
      enabled: true,
    }));

    const client = wsMocks.clients[0];

    expect(client.config.connectHeaders).toEqual({
      Authorization: "Bearer jwt-token",
      "X-Device-Id": "device-a",
    });

    expect(client.activate).toHaveBeenCalled();
    expect(Object.keys(client.subscriptions)).toEqual(expect.arrayContaining([
      "/topic/user/status",
      "/topic/devices/device-a/status",
      "/topic/users/alice/chats",
      "/topic/devices/device-a/chats/100",
      "/topic/chats/100/typing",
      "/topic/devices/device-a/chats/200",
      "/topic/chats/200/typing",
    ]));

    expect(client.publish).toHaveBeenCalledWith({
      destination: "/app/user.online",
      body: "{}",
    });
    await waitFor(() => expect(wsMocks.syncRealtime).toHaveBeenCalled());

    act(() => {
      client.subscriptions["/topic/users/alice/chats"].cb({ body: "{}" });
      client.subscriptions["/topic/user/status"].cb({ body: JSON.stringify({ username: "bob", online: true }) });
      client.subscriptions["/topic/devices/device-a/chats/100"].cb({ body: JSON.stringify({ type: "MESSAGE_CREATED", chatId: 100 }) });
      client.subscriptions["/topic/chats/100/typing"].cb({ body: JSON.stringify({ username: "bob", typing: true }) });
    });

    expect(onChatListUpdate).toHaveBeenCalled();
    expect(onStatusUpdate).toHaveBeenCalledWith({
      type: "user_status",
      username: "bob",
      online: true,
    });
    await waitFor(() => expect(onMessage).toHaveBeenCalledWith({
      type: "MESSAGE_CREATED",
      chatId: 100,
    }, 100));
    expect(onTyping).toHaveBeenCalledWith({
      username: "bob",
      typing: true,
    }, 100);
  });

  it("deduplicates at-least-once realtime delivery by event id", async () => {
    const { default: useWebSocket } = await import("../hooks/useWebSocket");
    const onMessage = vi.fn();

    renderHook(() => useWebSocket({
      me: { username: "alice" },
      chatIds: [100],
      onMessage,
      enabled: true,
    }));

    const client = wsMocks.clients[0];
    await waitFor(() => expect(wsMocks.syncRealtime).toHaveBeenCalled());
    const callback = client.subscriptions["/topic/devices/device-a/chats/100"].cb;
    const frame = {
      body: JSON.stringify({ eventId: "event-1", type: "MESSAGE_CREATED", chatId: 100 }),
    };

    act(() => {
      callback(frame);
      callback(frame);
    });

    await waitFor(() => expect(onMessage).toHaveBeenCalledTimes(1));
  });

  it("serializes durable live events before advancing to the next event", async () => {
    const { default: useWebSocket } = await import("../hooks/useWebSocket");
    let releaseFirst;
    const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
    const received = [];
    const onMessage = vi.fn(async (event) => {
      received.push(event.eventId);
      if (event.eventId === "event-1") await firstGate;
    });

    renderHook(() => useWebSocket({
      me: { username: "alice" },
      chatIds: [100],
      onMessage,
      enabled: true,
    }));

    const client = wsMocks.clients[0];
    await waitFor(() => expect(wsMocks.syncRealtime).toHaveBeenCalled());
    const callback = client.subscriptions["/topic/devices/device-a/chats/100"].cb;

    act(() => {
      callback({ body: JSON.stringify({ sequence: 1, eventId: "event-1", type: "MESSAGE_CREATED", chatId: 100 }) });
      callback({ body: JSON.stringify({ sequence: 2, eventId: "event-2", type: "MESSAGE_CREATED", chatId: 100 }) });
    });

    await waitFor(() => expect(onMessage).toHaveBeenCalledTimes(1));
    expect(received).toEqual(["event-1"]);
    expect(localStorage.getItem("cm_realtime_cursor:device-a")).not.toBe("2");

    releaseFirst();
    await waitFor(() => expect(received).toEqual(["event-1", "event-2"]));
    expect(localStorage.getItem("cm_realtime_cursor:device-a")).toBe("2");
  });

  it("retries a failed recovered event without advancing or poisoning dedupe", async () => {
    const recoveredPage = {
      events: [{
        sequence: 4,
        eventId: "retry-4",
        destination: "/chats/100",
        payload: { type: "MESSAGE_CREATED", chatId: 100 },
      }],
      nextCursor: 4,
      hasMore: false,
    };
    wsMocks.syncRealtime
      .mockResolvedValueOnce(recoveredPage)
      .mockResolvedValueOnce(recoveredPage);

    const { default: useWebSocket } = await import("../hooks/useWebSocket");
    const onMessage = vi.fn()
      .mockRejectedValueOnce(new Error("indexeddb unavailable"))
      .mockResolvedValueOnce(undefined);

    renderHook(() => useWebSocket({
      me: { username: "alice" },
      chatIds: [100],
      onMessage,
      enabled: true,
    }));

    await waitFor(() => expect(onMessage).toHaveBeenCalledTimes(2));
    expect(wsMocks.syncRealtime).toHaveBeenNthCalledWith(1, 0, 200);
    expect(wsMocks.syncRealtime).toHaveBeenNthCalledWith(2, 0, 200);
    expect(localStorage.getItem("cm_realtime_cursor:device-a")).toBe("4");
  });

  it("replays missed durable events before buffered live events and persists the cursor", async () => {
    wsMocks.syncRealtime.mockResolvedValueOnce({
      events: [{
        sequence: 4,
        eventId: "missed-4",
        destination: "/chats/100",
        payload: { type: "MESSAGE_CREATED", chatId: 100 },
      }],
      nextCursor: 4,
      hasMore: false,
    });
    const { default: useWebSocket } = await import("../hooks/useWebSocket");
    const received = [];

    renderHook(() => useWebSocket({
      me: { username: "alice" },
      chatIds: [100],
      onMessage: (event) => received.push(event.eventId),
      enabled: true,
    }));

    const client = wsMocks.clients[0];
    act(() => {
      client.subscriptions["/topic/devices/device-a/chats/100"].cb({
        body: JSON.stringify({
          sequence: 5,
          eventId: "live-5",
          type: "MESSAGE_CREATED",
          chatId: 100,
        }),
      });
    });

    await waitFor(() => expect(received).toEqual(["missed-4", "live-5"]));
    expect(localStorage.getItem("cm_realtime_cursor:device-a")).toBe("5");
  });

  it("updates chat subscriptions on chatIds changes and unsubscribes removed chats", async () => {
    const { default: useWebSocket } = await import("../hooks/useWebSocket");

    const { rerender } = renderHook(
      ({ chatIds }) => useWebSocket({
        me: { username: "alice" },
        chatIds,
        enabled: true,
      }),
      { initialProps: { chatIds: [100, 200] } }
    );

    const client = wsMocks.clients[0];
    const chat100Sub = client.subscriptions["/topic/devices/device-a/chats/100"].sub;
    const typing100Sub = client.subscriptions["/topic/chats/100/typing"].sub;

    rerender({ chatIds: [200, 300] });

    expect(chat100Sub.unsubscribe).toHaveBeenCalled();
    expect(typing100Sub.unsubscribe).toHaveBeenCalled();
    expect(client.subscriptions["/topic/devices/device-a/chats/300"]).toBeTruthy();
    expect(client.subscriptions["/topic/chats/300/typing"]).toBeTruthy();
  });

  it("sendTyping publishes typing event through active client", async () => {
    const { default: useWebSocket } = await import("../hooks/useWebSocket");

    const { result } = renderHook(() => useWebSocket({
      me: { username: "alice" },
      chatIds: [100],
      enabled: true,
    }));

    const client = wsMocks.clients[0];

    act(() => {
      result.current.sendTyping(100);
    });

    expect(client.publish).toHaveBeenCalledWith({
      destination: "/app/typing",
      body: JSON.stringify({ chatId: 100 }),
    });
  });

  it("deactivates websocket on cleanup", async () => {
    const { default: useWebSocket } = await import("../hooks/useWebSocket");

    const { unmount } = renderHook(() => useWebSocket({
      me: { username: "alice" },
      chatIds: [100],
      enabled: true,
    }));

    const client = wsMocks.clients[0];

    unmount();

    expect(client.deactivate).toHaveBeenCalled();
  });
});