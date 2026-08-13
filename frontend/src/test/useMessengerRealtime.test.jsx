import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const wsMocks = vi.hoisted(() => ({
  captured: {},
  sendTyping: vi.fn(),
}));

vi.mock("../hooks/useWebSocket", () => ({
  default: (options) => {
    wsMocks.captured = options;
    return { sendTyping: wsMocks.sendTyping };
  },
}));

describe("useMessengerRealtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    wsMocks.captured = {};
    wsMocks.sendTyping.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup() {
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
});
