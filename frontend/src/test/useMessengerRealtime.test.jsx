import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const wsMocks = vi.hoisted(() => ({
  captured: {},
  sendTyping: vi.fn(),
  sendCall: vi.fn(),
}));

vi.mock("../hooks/useWebSocket", () => ({
  default: (options) => {
    wsMocks.captured = options;
    return { sendTyping: wsMocks.sendTyping, sendCall: wsMocks.sendCall };
  },
}));

describe("useMessengerRealtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    wsMocks.captured = {};
    wsMocks.sendTyping.mockReset();
    wsMocks.sendCall.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup(extra = {}) {
    const chatStore = {
      activeId: 10,
      loadChats: vi.fn(),
      loadRequests: vi.fn(),
      revealChat: vi.fn(),
      updateChatPreview: vi.fn(),
      resetUnread: vi.fn(),
      deleteChatForMe: vi.fn(),
      setActiveId: vi.fn(),
      markChatOnlineStatus: vi.fn(),
    };
    const msgStore = {
      handleIncomingEvent: vi.fn(),
      updateMessageStatus: vi.fn(),
      updateChatOutgoingStatus: vi.fn(),
      loadMessages: vi.fn(),
    };
    const { useMessengerRealtime } = await import("../hooks/useMessengerRealtime");
    const rendered = renderHook(() => useMessengerRealtime({
      me: { id: 1, username: "alice" },
      enabled: true,
      chatStore,
      msgStore,
      requestChatIds: new Set(["99"]),
      wsChatIds: [10, 99],
      atBottomRef: { current: true },
      ...extra,
    }));
    return { chatStore, msgStore, result: rendered.result };
  }

  it("refreshes requests only for incoming request messages", async () => {
    const { chatStore } = await setup();

    act(() => {
      wsMocks.captured.onChatListUpdate({ reason: "request_message", chatId: 99 });
    });
    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(chatStore.loadRequests).toHaveBeenCalledWith(1);
    expect(chatStore.loadChats).not.toHaveBeenCalled();
  });

  it("refreshes chats and requests when a request is accepted on /requests", async () => {
    const { chatStore } = await setup();

    act(() => {
      wsMocks.captured.onRequestsUpdate({ reason: "request_accepted", chatId: 99 });
    });
    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(chatStore.loadRequests).toHaveBeenCalledWith(1);
    expect(chatStore.loadChats).toHaveBeenCalledWith(1);
  });

  it("refreshes chats for group membership changes", async () => {
    const { chatStore } = await setup();

    act(() => {
      wsMocks.captured.onChatListUpdate({ reason: "group_participants_invited", chatId: 20 });
    });
    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(chatStore.loadChats).toHaveBeenCalledWith(1);
  });

  it("deletes a chat locally when everyone-delete includes chatId", async () => {
    const { chatStore } = await setup();

    act(() => {
      wsMocks.captured.onChatListUpdate({ reason: "chat_deleted_for_everyone", chatId: 10 });
    });

    expect(chatStore.deleteChatForMe).toHaveBeenCalledWith(10);
    expect(chatStore.setActiveId).toHaveBeenCalledWith(null);
    expect(chatStore.loadChats).not.toHaveBeenCalled();
  });

  it("records other users typing and ignores self", async () => {
    const { result } = await setup();

    act(() => {
      wsMocks.captured.onTyping({ username: "bob" }, 10);
      wsMocks.captured.onTyping({ username: "alice" }, 11);
    });

    expect(result.current.typingUsers[10]).toBe("bob");
    expect(result.current.typingUsers[11]).toBeUndefined();
  });

  it("applies delivery status to the message store", async () => {
    const { msgStore } = await setup();

    act(() => {
      wsMocks.captured.onStatusUpdate({ type: "delivery", messageId: 500, status: "READ" });
    });

    expect(msgStore.updateMessageStatus).toHaveBeenCalledWith(500, "READ");
  });

  it("forwards call signals immediately and sendCall", async () => {
    const onCallSignal = vi.fn();
    const { result } = await setup({ onCallSignal });

    act(() => {
      wsMocks.captured.onCall({ type: "offer", chatId: 10, fromUsername: "bob" });
      wsMocks.captured.onCall({ type: "ice", chatId: 10, candidate: { candidate: "x" } });
    });

    expect(onCallSignal).toHaveBeenCalledTimes(2);
    expect(onCallSignal).toHaveBeenNthCalledWith(1, { type: "offer", chatId: 10, fromUsername: "bob" });
    expect(onCallSignal).toHaveBeenNthCalledWith(2, { type: "ice", chatId: 10, candidate: { candidate: "x" } });

    act(() => {
      result.current.sendCall({ chatId: 10, type: "hangup" });
    });
    expect(wsMocks.sendCall).toHaveBeenCalledWith({ chatId: 10, type: "hangup" });
  });
});
