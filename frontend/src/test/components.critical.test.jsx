import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../deviceId", () => ({
  getOrCreateDeviceId: vi.fn(() => "device-a"),
}));

describe("critical UI components", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("ChatList filters, searches, selects chat and triggers actions", async () => {
    const { default: ChatList } = await import("../components/ChatList");

    const onSelectChat = vi.fn();
    const onSearch = vi.fn();
    const onNewChat = vi.fn();
    const onFilterChange = vi.fn();
    const onNavChange = vi.fn();

    const chats = [
      {
        id: 100,
        type: "direct",
        name: "Bob Brown",
        username: "bob",
        preview: "hello",
        unread: 2,
        time: "10:00",
        colorIdx: 1,
        lastActivityAt: "2026-04-28T10:00:00.000Z",
      },
      {
        id: 150,
        type: "direct",
        name: "Long Preview",
        username: "long",
        preview:
          "Это очень длинное сообщение предпросмотра, которое должно быть обрезано многоточием в списке чатов.",
        unread: 0,
        time: "10:30",
        colorIdx: 3,
        lastActivityAt: "2026-04-28T10:30:00.000Z",
      },
      {
        id: 200,
        type: "group",
        name: "Team",
        username: "",
        preview: "deploy",
        unread: 0,
        members: 3,
        time: "09:00",
        colorIdx: 2,
        lastActivityAt: "2026-04-28T09:00:00.000Z",
      },
      {
        id: 250,
        type: "saved",
        name: "Избранное",
        username: "",
        preview: "Заметка без лишнего символа",
        unread: 0,
        time: "08:45",
        colorIdx: 4,
        avatarUrl: "preset:saved",
        lastActivityAt: "2026-04-28T08:45:00.000Z",
      },
    ];

    render(
      <ChatList
        me={{ id: 1, username: "alice", firstName: "Alice" }}
        chats={chats}
        activeId={100}
        search=""
        filter="all"
        onSelectChat={onSelectChat}
        onПоиск={onSearch}
        onNewChat={onNewChat}
        onFilterChange={onFilterChange}
        onOpenНастройки={onNavChange}
        onNavChange={onNavChange}
      />
    );

    expect(screen.getByText("Bob Brown")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Long Preview")).toBeInTheDocument();
    const savedEls = screen.getAllByText("Избранное");
    expect(savedEls.length).toBeGreaterThanOrEqual(1);
    const savedRow = savedEls.find(el => el.closest("button.conversation-item"))?.closest("button");
    expect(savedRow).toBeTruthy();
    const bobRow = screen.getByText("Bob Brown").closest("button");
    expect(bobRow).toBeTruthy();
    expect(bobRow.querySelector(".conversation-unread-floating")).toHaveTextContent("2");
    expect(savedRow.querySelector(".saved-avatar-star")).toBeInTheDocument();
    expect(savedRow.querySelector(".soft-chip")).toBeNull();

    fireEvent.click(screen.getByText("Team"));
    expect(onSelectChat).toHaveBeenCalledWith(200);

    fireEvent.change(screen.getByPlaceholderText("Поиск чатов"), {
      target: { value: "bob" },
    });
    expect(onSearch).toHaveBeenLastCalledWith("bob");

    fireEvent.click(screen.getByTitle("Новый чат"));
    expect(onNewChat).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Настройки"));
    expect(onNavChange).toHaveBeenCalledWith("settings");

    fireEvent.click(screen.getByText("Непрочитанные"));
    expect(onFilterChange).toHaveBeenCalledWith("unread");

    fireEvent.click(screen.getByText("Все"));

    const longRow = screen.getByText("Long Preview").closest("button");
    const preview = longRow?.querySelector(".conversation-preview");
    expect(preview).toBeTruthy();
    expect(preview.textContent.endsWith("…")).toBe(true);
    expect(preview.textContent.length).toBeLessThanOrEqual(36);
  });

  it("MessageInput sends text, supports reply cancel, typing callback and emoji picker", async () => {
    const { default: MessageInput } = await import("../components/MessageInput");

    const onSend = vi.fn();
    const onTyping = vi.fn();
    const onCancelReply = vi.fn();

    vi.useFakeTimers();

    render(
      <MessageInput
        onSend={onSend}
        replyTo={{ _text: "old message" }}
        onОтменаОтветить={onCancelReply}
        onTyping={onTyping}
      />
    );

    expect(screen.getByText("Ответить")).toBeInTheDocument();
    expect(screen.getByText("old message")).toBeInTheDocument();

    fireEvent.click(document.querySelector(".modal-close"));
    expect(onCancelReply).toHaveBeenCalled();

    const textarea = screen.getByPlaceholderText("Сообщение...");
    textarea.blur();
    fireEvent.keyDown(window, { key: "a" });
    expect(textarea).toHaveFocus();

    fireEvent.change(textarea, { target: { value: "hello" } });
    expect(onTyping).toHaveBeenCalledTimes(1);

    fireEvent.change(textarea, { target: { value: "hello world" } });
    expect(onTyping).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2100);

    fireEvent.change(textarea, { target: { value: "hello world!" } });
    expect(onTyping).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Emoji" }));
    expect(screen.getByTitle("Smileys")).toBeInTheDocument();

    fireEvent.click(screen.getByText("😀"));
    expect(localStorage.getItem("cm_recent_emojis")).toContain("😀");

    fireEvent.click(screen.getByTitle("Send"));

    expect(onSend).toHaveBeenCalledWith({
      text: "hello world!😀",
      imgFile: null,
      voiceFile: null,
      generalFile: null,
      ttl: null,
      replyTo: { _text: "old message" },
    });
  });

  it("MessageList renders empty/loading states, reactions, search highlight and callbacks", async () => {
    const { default: MessageList } = await import("../components/MessageList");

    const onContextMenu = vi.fn();
    const onReact = vi.fn();

    const { rerender } = render(
      <MessageList
        msgs={[]}
        me={{ id: 1, username: "alice" }}
        activeChat={{ name: "Bob" }}
        loadingMsgs={true}
        onContextMenu={onContextMenu}
        onReact={onReact}
      />
    );

    expect(document.querySelector(".spinner")).toBeInTheDocument();

    rerender(
      <MessageList
        msgs={[]}
        me={{ id: 1, username: "alice" }}
        activeChat={{ name: "Bob" }}
        loadingMsgs={false}
        onContextMenu={onContextMenu}
        onReact={onReact}
      />
    );

    expect(screen.getByText("Нет сообщений")).toBeInTheDocument();

    const messages = [
      {
        id: 500,
        senderId: 1,
        _out: true,
        _text: "hello world",
        createdAt: "2026-04-28T10:00:00.000Z",
        status: "READ",
        reactions: { "👍": 2 },
        myReactions: ["👍"],
      },
      {
        id: 501,
        senderId: 2,
        _out: false,
        _text: "incoming text",
        createdAt: "2026-04-28T10:01:00.000Z",
        reactions: {},
        myReactions: [],
      },
    ];

    rerender(
      <MessageList
        msgs={messages}
        me={{ id: 1, username: "alice" }}
        activeChat={{ name: "Bob", colorIdx: 2 }}
        loadingMsgs={false}
        onContextMenu={onContextMenu}
        onReact={onReact}
        searchQuery="world"
        activeMatchId={500}
        typingUsername="Bob"
      />
    );

    expect(screen.getAllByText("hello").length).toBeGreaterThan(0);
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(document.querySelector(".check.read svg")).toBeTruthy();

    const reactionButton = screen.getByRole("button", { name: /👍/ });
    fireEvent.click(reactionButton);

    expect(onReact).toHaveBeenCalledWith(
      expect.objectContaining({ id: 500, _text: "hello world", _out: true }),
      "👍"
    );

    const bubble = screen.getByText("incoming text").closest(".msg-wrap");
    fireEvent.contextMenu(bubble);

    expect(onContextMenu).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ id: 501, _text: "incoming text", _out: false })
    );

    expect(document.querySelectorAll(".msg-wrap.search-hit-active").length).toBe(1);
    expect(document.querySelector(".typing")).toBeInTheDocument();
  });

  it("VoiceMessage renders waveform, plays, cycles speed and broadcasts play event", async () => {
    const { default: VoiceMessage } = await import("../components/VoiceMessage");

    let pausedState = true;
    const originalPausedDescriptor = Object.getOwnPropertyDescriptor(
      window.HTMLMediaElement.prototype,
      "paused"
    );
    Object.defineProperty(window.HTMLMediaElement.prototype, "paused", {
      configurable: true,
      get() { return pausedState; },
    });

    const playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockImplementation(function play() {
        pausedState = false;
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      });
    const pauseSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "pause")
      .mockImplementation(function pause() {
        pausedState = true;
        this.dispatchEvent(new Event("pause"));
      });

    const broadcasts = [];
    const onBroadcast = (event) => broadcasts.push(event.detail);
    window.addEventListener("cm:voice:play", onBroadcast);

    try {
      const { container } = render(
        <VoiceMessage
          src="blob:voice-1"
          durationMs={5000}
          variant="in"
        />
      );

      expect(container.querySelectorAll(".voice-msg-wave i")).toHaveLength(32);
      expect(screen.getByText("0:05")).toBeInTheDocument();

      const playBtn = screen.getByRole("button", { name: /play/i });
      fireEvent.click(playBtn);

      expect(playSpy).toHaveBeenCalled();
      expect(broadcasts.length).toBeGreaterThan(0);

      const pauseBtn = screen.getByRole("button", { name: /pause/i });
      fireEvent.click(pauseBtn);
      expect(pauseSpy).toHaveBeenCalled();

      const rateBtn = screen.getByTitle("Playback speed");
      expect(rateBtn).toHaveTextContent("1×");
      fireEvent.click(rateBtn);
      expect(rateBtn).toHaveTextContent("1.5×");
      fireEvent.click(rateBtn);
      expect(rateBtn).toHaveTextContent("2×");
      fireEvent.click(rateBtn);
      expect(rateBtn).toHaveTextContent("1×");
    } finally {
      window.removeEventListener("cm:voice:play", onBroadcast);
      playSpy.mockRestore();
      pauseSpy.mockRestore();
      if (originalPausedDescriptor) {
        Object.defineProperty(window.HTMLMediaElement.prototype, "paused", originalPausedDescriptor);
      } else {
        delete window.HTMLMediaElement.prototype.paused;
      }
    }
  });

  it("VoiceMessage in preview variant shows cancel button and hides speed control", async () => {
    const { default: VoiceMessage } = await import("../components/VoiceMessage");
    const onCancel = vi.fn();

    render(
      <VoiceMessage
        src="blob:voice-2"
        durationMs={3000}
        variant="preview"
        onCancel={onCancel}
      />
    );

    expect(screen.queryByTitle("Playback speed")).toBeNull();

    const cancelBtn = screen.getByRole("button", { name: /cancel voice message/i });
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("App resets message search state when switching chats", async () => {
    vi.resetModules();
    let activeId = 100;
    const chats = [
      {
        id: 100,
        type: "direct",
        name: "First Chat",
        username: "first",
        preview: "hello",
        unread: 0,
        time: "10:00",
        colorIdx: 1,
      },
      {
        id: 200,
        type: "direct",
        name: "Second Chat",
        username: "second",
        preview: "no match",
        unread: 0,
        time: "10:05",
        colorIdx: 2,
      },
    ];

    const chatStore = {
      chats,
      requests: [],
      get activeId() { return activeId; },
      loadingChats: false,
      loadingRequests: false,
      loadChats: vi.fn(async () => {}),
      loadRequests: vi.fn(async () => {}),
      revealChat: vi.fn(),
      updateChatPreview: vi.fn(),
      setChats: vi.fn(),
      setActiveId: vi.fn((id) => { activeId = id; }),
      selectChat: vi.fn((id) => { activeId = id; }),
      deleteChatForMe: vi.fn(),
      markChatOnlineStatus: vi.fn(),
    };

    const msgStore = {
      msgs: {
        100: [{ id: 1, senderId: 2, _text: "hello world", createdAt: "2026-04-28T10:00:00.000Z" }],
        200: [{ id: 2, senderId: 2, _text: "second chat body", createdAt: "2026-04-28T10:01:00.000Z" }],
      },
      loadingMsgs: false,
      setMsgs: vi.fn(),
      loadMessages: vi.fn(async () => {}),
      handleIncomingEvent: vi.fn(async () => null),
      sendMessage: vi.fn(async () => ({})),
      editMessage: vi.fn(async () => ({})),
      deleteMessage: vi.fn(),
      toggleReaction: vi.fn(),
      updateMessageStatus: vi.fn(),
      updateChatOutgoingStatus: vi.fn(),
    };

    vi.doMock("../hooks/useAuth", () => ({
      useAuth: () => ({
        screen: "app",
        me: { id: 1, username: "alice", firstName: "Alice" },
        restoreSession: vi.fn(),
        setScreen: vi.fn(),
        setMe: vi.fn(),
        logout: vi.fn(async () => {}),
      }),
    }));
    vi.doMock("../hooks/useChats", () => ({ useChats: () => chatStore }));
    vi.doMock("../hooks/useMessages", () => ({ useMessages: () => msgStore }));
    vi.doMock("../hooks/useI18n", () => ({
      useI18n: () => ({
        lang: "en",
        t: {
          participants: "members",
          online: "online",
          offline: "offline",
          encrypted_notice: "Encrypted on device",
          message_placeholder: "Message...",
        },
        loadTranslations: vi.fn(),
        switchLang: vi.fn(),
      }),
    }));
    vi.doMock("../hooks/useWebSocket", () => ({
      default: () => ({ sendTyping: vi.fn() }),
    }));
    vi.doMock("../i18n/useUiTranslator", () => ({ useUiTranslator: vi.fn() }));

    const { default: App } = await import("../App");
    const user = userEvent.setup();
    const { rerender } = render(<App />);

    await user.click(screen.getByTitle("Profile"));
    await user.click(screen.getByText("Search messages"));
    const searchInput = screen.getByPlaceholderText("Search messages");
    await user.type(searchInput, "hello");
    expect(searchInput).toHaveValue("hello");
    expect(screen.getByText("1/1")).toBeInTheDocument();

    await user.click(screen.getByText("Second Chat"));
    rerender(<App />);

    expect(screen.queryByPlaceholderText("Search messages")).toBeNull();

    await user.click(screen.getByTitle("Profile"));
    await user.click(screen.getByText("Search messages"));
    expect(screen.getByPlaceholderText("Search messages")).toHaveValue("");
  });

  it("group panel: visibility by role matches RBAC", async () => {
    const buildStores = (myRole) => {
      const chats = [
        {
          id: 300,
          type: "group",
          name: "Team",
          username: "",
          preview: "hello",
          unread: 0,
          members: 3,
          time: "10:00",
          colorIdx: 2,
          groupParticipants: [
            { userId: 1, username: "alice", firstName: "Alice", role: myRole },
            { userId: 2, username: "bob", firstName: "Bob", role: "MEMBER" },
            { userId: 99, username: "owneru", firstName: "Owner User", role: "OWNER" },
          ],
          myRole,
          whoCanWrite: "ALL",
          whoCanEditInfo: "ADMINS",
          whoCanInvite: "ADMINS",
        },
      ];
      return {
        chatStore: {
          chats,
          requests: [],
          activeId: 300,
          loadingChats: false,
          loadingRequests: false,
          loadChats: vi.fn(async () => {}),
          loadRequests: vi.fn(async () => {}),
          revealChat: vi.fn(),
          updateChatPreview: vi.fn(),
          setChats: vi.fn(),
          setActiveId: vi.fn(),
          selectChat: vi.fn(),
          deleteChatForMe: vi.fn(),
          markChatOnlineStatus: vi.fn(),
        },
        msgStore: {
          msgs: { 300: [] },
          loadingMsgs: false,
          setMsgs: vi.fn(),
          loadMessages: vi.fn(async () => {}),
          handleIncomingEvent: vi.fn(async () => null),
          sendMessage: vi.fn(async () => ({})),
          editMessage: vi.fn(async () => ({})),
          deleteMessage: vi.fn(),
          toggleReaction: vi.fn(),
          updateMessageStatus: vi.fn(),
          updateChatOutgoingStatus: vi.fn(),
        },
      };
    };

    const mockAndRender = async (myRole) => {
      vi.resetModules();
      const { chatStore, msgStore } = buildStores(myRole);
      vi.doMock("../hooks/useAuth", () => ({
        useAuth: () => ({
          screen: "app",
          me: { id: 1, username: "alice", firstName: "Alice" },
          restoreSession: vi.fn(),
          setScreen: vi.fn(),
          setMe: vi.fn(),
          logout: vi.fn(async () => {}),
        }),
      }));
      vi.doMock("../hooks/useChats", () => ({ useChats: () => chatStore }));
      vi.doMock("../hooks/useMessages", () => ({ useMessages: () => msgStore }));
      vi.doMock("../hooks/useI18n", () => ({
        useI18n: () => ({
          lang: "ru",
          t: { participants: "участников", message_placeholder: "Сообщение...", encrypted_notice: "Сообщения шифруются на устройстве" },
          loadTranslations: vi.fn(),
          switchLang: vi.fn(),
        }),
      }));
      vi.doMock("../hooks/useWebSocket", () => ({ default: () => ({ sendTyping: vi.fn() }) }));
      vi.doMock("../i18n/useUiTranslator", () => ({ useUiTranslator: vi.fn() }));

      const { default: App } = await import("../App");
      render(<App />);
    };

    await mockAndRender("MEMBER");
    expect(screen.queryByTitle("Администрирование группы")).toBeNull();
    fireEvent.click(screen.getByTitle("Профиль"));
    expect(screen.queryByRole("dialog", { name: "Управление группой" })).toBeNull();
    expect(screen.queryByText("Политики группы (только владелец)")).toBeNull();
    expect(screen.queryByText("Удалить группу")).toBeNull();
    cleanup();

    await mockAndRender("MODERATOR");
    fireEvent.click(screen.getByTitle("Администрирование группы"));
    expect(screen.getByRole("dialog", { name: "Управление группой" })).toBeInTheDocument();
    expect(
      screen.getByText(/ПКМ или кнопка «⋯»|действия только для участников с ролью MEMBER/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Политики группы (только владелец)")).toBeNull();
    expect(screen.queryByText("Профиль группы")).toBeNull();
    cleanup();

    await mockAndRender("ADMIN");
    fireEvent.click(screen.getByTitle("Администрирование группы"));
    expect(screen.getByText("Профиль группы")).toBeInTheDocument();
    expect(screen.queryByText("Политики группы (только владелец)")).toBeNull();
    expect(screen.queryByText("Удалить группу")).toBeNull();
    cleanup();

    await mockAndRender("OWNER");
    fireEvent.click(screen.getByTitle("Администрирование группы"));
    expect(screen.getByText("Политики группы (только владелец)")).toBeInTheDocument();
    expect(screen.getByText("Удалить группу")).toBeInTheDocument();
  });

  it("group panel: overflow menu lists mute for manageable member", async () => {
    vi.resetModules();
    const chats = [
      {
        id: 300,
        type: "group",
        name: "Team",
        username: "",
        preview: "hello",
        unread: 0,
        members: 2,
        time: "10:00",
        colorIdx: 2,
        groupParticipants: [
          { userId: 1, username: "alice", firstName: "Alice", role: "ADMIN" },
          { userId: 2, username: "bob", firstName: "Bob", role: "MEMBER" },
        ],
        myRole: "ADMIN",
        whoCanWrite: "ALL",
        whoCanEditInfo: "ADMINS",
        whoCanInvite: "ADMINS",
      },
    ];
    const chatStore = {
      chats,
      requests: [],
      activeId: 300,
      loadingChats: false,
      loadingRequests: false,
      loadChats: vi.fn(async () => {}),
      loadRequests: vi.fn(async () => {}),
      revealChat: vi.fn(),
      updateChatPreview: vi.fn(),
      setChats: vi.fn(),
      setActiveId: vi.fn(),
      selectChat: vi.fn(),
      deleteChatForMe: vi.fn(),
      markChatOnlineStatus: vi.fn(),
    };
    const msgStore = {
      msgs: { 300: [] },
      loadingMsgs: false,
      setMsgs: vi.fn(),
      loadMessages: vi.fn(async () => {}),
      handleIncomingEvent: vi.fn(async () => null),
      sendMessage: vi.fn(async () => ({})),
      editMessage: vi.fn(async () => ({})),
      deleteMessage: vi.fn(),
      toggleReaction: vi.fn(),
      updateMessageStatus: vi.fn(),
      updateChatOutgoingStatus: vi.fn(),
    };
    vi.doMock("../hooks/useAuth", () => ({
      useAuth: () => ({
        screen: "app",
        me: { id: 1, username: "alice", firstName: "Alice" },
        restoreSession: vi.fn(),
        setScreen: vi.fn(),
        setMe: vi.fn(),
        logout: vi.fn(async () => {}),
      }),
    }));
    vi.doMock("../hooks/useChats", () => ({ useChats: () => chatStore }));
    vi.doMock("../hooks/useMessages", () => ({ useMessages: () => msgStore }));
    vi.doMock("../hooks/useI18n", () => ({
      useI18n: () => ({ lang: "ru", t: { participants: "участников" }, loadTranslations: vi.fn(), switchLang: vi.fn() }),
    }));
    vi.doMock("../hooks/useWebSocket", () => ({ default: () => ({ sendTyping: vi.fn() }) }));
    vi.doMock("../i18n/useUiTranslator", () => ({ useUiTranslator: vi.fn() }));

    const { default: App } = await import("../App");
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTitle("Администрирование группы"));

    const bobRow = screen.getByText("Bob").closest(".group-participant-row");
    expect(bobRow).toBeTruthy();
    const overflow = bobRow.querySelector(".group-participant-overflow-btn");
    expect(overflow).toBeTruthy();
    await user.click(overflow);
    expect(await screen.findByText("Замутить…")).toBeInTheDocument();
  });
});
