import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const apiMocks = vi.hoisted(() => ({
  listDevices: vi.fn(async () => []),
  deactivateDevice: vi.fn(async () => ({ ok: true })),
  updateProfile: vi.fn(),
  createSaved: vi.fn(),
  getBackupInfo: vi.fn(async () => ({ hasBackup: false })),
}));

vi.mock("../api", () => ({
  api: apiMocks,
  getCurrentDeviceId: () => "device-1",
  setToken: vi.fn(),
}));

// ── mock VoiceMessage so MsgRow tests do not depend on audio DOM ──────────
vi.mock("../components/VoiceMessage", () => ({
  default: ({ src, durationMs, variant }) => (
    <div
      data-testid="voice-msg-mock"
      data-src={src}
      data-duration={durationMs}
      data-variant={variant}
    >
      Voice {durationMs}ms
    </div>
  ),
}));

const defaultL = (ru) => ru;
const englishL = (ru, en) => en || ru;

// ── MsgRow ─────────────────────────────────────────────────────────────────
describe("MsgRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders outgoing bubble", async () => {
    const { MsgRow } = await import("../components/MsgRow");

    const msg = {
      id: 1,
      _text: "Hello world",
      createdAt: "2026-01-01T12:00:00Z",
      status: "SENT",
      reactions: {},
      myReactions: [],
    };

    render(
      <MsgRow
        msg={msg}
        isOut
        isGroupEnd
        text="Hello world"
        time="12:00"
        reactions={{}}
        myReactions={[]}
        onContextMenu={vi.fn()}
      />
    );

    const wrap = document.querySelector(".msg-wrap");
    expect(wrap).toBeTruthy();
    expect(wrap.classList.contains("out")).toBe(true);

    const bubble = wrap.querySelector(".bubble");
    expect(bubble.classList.contains("out")).toBe(true);
    expect(bubble.classList.contains("tl-out")).toBe(true);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("12:00")).toBeInTheDocument();
    expect(document.querySelector(".check")).toBeTruthy();
  });

  it("renders incoming bubble", async () => {
    const { MsgRow } = await import("../components/MsgRow");

    const msg = {
      id: 2,
      _text: "Incoming text",
      createdAt: "2026-01-01T12:00:00Z",
      reactions: {},
      myReactions: [],
    };

    render(
      <MsgRow
        msg={msg}
        isOut={false}
        isGroupEnd
        text="Incoming text"
        time="12:00"
        reactions={{}}
        myReactions={[]}
        activeChat={{ name: "Bob", colorIdx: 2 }}
        onContextMenu={vi.fn()}
      />
    );

    const wrap = document.querySelector(".msg-wrap");
    expect(wrap.classList.contains("out")).toBe(false);

    const bubble = wrap.querySelector(".bubble");
    expect(bubble.classList.contains("in")).toBe(true);
    expect(bubble.classList.contains("tl-in")).toBe(true);

    // Ava rendered for group-end incoming message
    const ava = wrap.querySelector(".av-wrap");
    expect(ava).toBeTruthy();
    expect(screen.getByText("Incoming text")).toBeInTheDocument();
  });

  it("shows checkmarks", async () => {
    const { MsgRow } = await import("../components/MsgRow");

    // READ status → DoubleCheckIcon
    render(
      <MsgRow
        msg={{ id: 3, _text: "read", createdAt: "2026-01-01T12:00:00Z", status: "READ", reactions: {}, myReactions: [] }}
        isOut
        text="read"
        time="12:00"
        reactions={{}}
        myReactions={[]}
        onContextMenu={vi.fn()}
      />
    );

    let check = document.querySelector(".check");
    expect(check).toBeTruthy();
    expect(check.classList.contains("read")).toBe(true);
    // DoubleCheckIcon has two <path> elements
    expect(check.querySelectorAll("path").length).toBe(2);

    cleanup();

    // SENT status → CheckIcon (single path)
    render(
      <MsgRow
        msg={{ id: 4, _text: "sent", createdAt: "2026-01-01T12:00:01Z", status: "SENT", reactions: {}, myReactions: [] }}
        isOut
        text="sent"
        time="12:00"
        reactions={{}}
        myReactions={[]}
        onContextMenu={vi.fn()}
      />
    );

    check = document.querySelector(".check");
    expect(check).toBeTruthy();
    expect(check.classList.contains("read")).toBe(false);
    // CheckIcon has one <path> element
    expect(check.querySelectorAll("path").length).toBe(1);
  });

  it("shows reactions", async () => {
    const { MsgRow } = await import("../components/MsgRow");
    const onReact = vi.fn();

    const msg = {
      id: 5,
      _text: "Reaction test",
      createdAt: "2026-01-01T12:00:00Z",
      reactions: { "👍": 2, "❤️": 1 },
      myReactions: ["👍"],
    };

    render(
      <MsgRow
        msg={msg}
        isOut={false}
        text="Reaction test"
        time="12:00"
        reactions={{ "👍": 2, "❤️": 1 }}
        myReactions={["👍"]}
        onReact={onReact}
        onContextMenu={vi.fn()}
      />
    );

    const chips = document.querySelectorAll(".reaction-chip");
    expect(chips.length).toBe(2);

    // First reaction chip
    expect(chips[0].textContent).toContain("👍");
    expect(chips[0].textContent).toContain("2");
    expect(chips[0].classList.contains("mine")).toBe(true);

    // Second reaction chip
    expect(chips[1].textContent).toContain("❤️");
    expect(chips[1].textContent).toContain("1");
    expect(chips[1].classList.contains("mine")).toBe(false);

    fireEvent.click(chips[0]);
    expect(onReact).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, _text: "Reaction test" }),
      "👍"
    );
  });

  it("handles expiring TTL", async () => {
    const { MsgRow } = await import("../components/MsgRow");

    const now = Date.now();

    // future expiry: shows countdown badge
    const futureExpiry = new Date(now + 45000).toISOString();

    render(
      <MsgRow
        msg={{ id: 6, _text: "pending", expiresAt: futureExpiry, createdAt: "2026-01-01T12:00:00Z", reactions: {}, myReactions: [] }}
        isOut
        text="pending"
        time="12:00"
        reactions={{}}
        myReactions={[]}
        onContextMenu={vi.fn()}
      />
    );

    const ttl = document.querySelector(".msg-ttl");
    expect(ttl).toBeTruthy();
    expect(ttl.textContent).toMatch(/\d+[smh]/);

    cleanup();

    // past expiry: immediately gets expiring class, hides after 500ms
    const pastExpiry = new Date(now - 1000).toISOString();

    render(
      <MsgRow
        msg={{ id: 7, _text: "expired", expiresAt: pastExpiry, createdAt: "2026-01-01T12:00:01Z", reactions: {}, myReactions: [] }}
        isOut
        text="expired"
        time="12:00"
        reactions={{}}
        myReactions={[]}
        onContextMenu={vi.fn()}
      />
    );

    // on mount the useEffect tick() runs synchronously,
    // finds remaining <= 0, and calls setExpiring(true)
    expect(document.querySelector(".msg-wrap.msg-expiring")).toBeTruthy();

    // After the 500ms setTimeout the row disappears
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(document.querySelector(".msg-wrap")).toBeNull();
  });

  it("renders file attachment", async () => {
    const { MsgRow } = await import("../components/MsgRow");

    const msg = {
      id: 7,
      _text: "",
      createdAt: "2026-01-01T12:00:00Z",
      reactions: {},
      myReactions: [],
    };

    render(
      <MsgRow
        msg={msg}
        isOut
        text=""
        time="12:00"
        reactions={{}}
        myReactions={[]}
        isFileAttachment
        attachment={{
          fileName: "report.pdf",
          size: 2048,
          objectUrl: "blob:file",
        }}
        onContextMenu={vi.fn()}
      />
    );

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    expect(document.querySelector(".msg-file")).toBeTruthy();
    expect(document.querySelector(".msg-file-icon")).toBeTruthy();
  });

  it("renders voice message", async () => {
    const { MsgRow } = await import("../components/MsgRow");

    const msg = {
      id: 8,
      _voice: { dataUrl: "blob:voice-1", durationMs: 4000 },
      _text: "",
      createdAt: "2026-01-01T12:00:00Z",
      reactions: {},
      myReactions: [],
    };

    render(
      <MsgRow
        msg={msg}
        isOut={false}
        text=""
        time="12:00"
        reactions={{}}
        myReactions={[]}
        onContextMenu={vi.fn()}
      />
    );

    const voiceEl = screen.getByTestId("voice-msg-mock");
    expect(voiceEl).toBeInTheDocument();
    expect(voiceEl.dataset.src).toBe("blob:voice-1");
    expect(voiceEl.dataset.duration).toBe("4000");
    expect(voiceEl.dataset.variant).toBe("in");

    // Verify time is displayed
    expect(screen.getByText(/4000ms/)).toBeInTheDocument();
  });

  it("renders video notes and voice transcripts", async () => {
    const { MsgRow } = await import("../components/MsgRow");

    const { rerender } = render(
      <MsgRow
        msg={{ id: 11, _videoNote: { src: "blob:circle", durationMs: 3000 }, _text: "" }}
        isOut={false}
        text=""
        time="12:00"
        reactions={{}}
        myReactions={[]}
        onContextMenu={vi.fn()}
      />
    );

    expect(document.querySelector(".video-note")).toBeTruthy();
    expect(document.querySelector(".bubble-circle")).toBeTruthy();
    expect(document.querySelector(".video-note-ring")).toBeTruthy();
    expect(document.querySelector(".video-note video")?.getAttribute("src")).toBe("blob:circle");

    rerender(
      <MsgRow
        msg={{
          id: 12,
          _voice: { dataUrl: "blob:voice-2", durationMs: 1800, transcript: "привет" },
          _payload: { type: "voice" },
          _text: "привет",
        }}
        isOut
        text="привет"
        time="12:01"
        reactions={{}}
        myReactions={[]}
        onContextMenu={vi.fn()}
      />
    );

    expect(screen.getByText("привет")).toBeInTheDocument();
    expect(document.querySelector(".voice-transcript")?.textContent).toContain("привет");
    expect(document.querySelector(".voice-transcript-label")?.textContent).toBe("Расшифровка");
  });

  it("opens media viewer callback from an image", async () => {
    const { MsgRow } = await import("../components/MsgRow");
    const onOpenMedia = vi.fn();

    render(
      <MsgRow
        msg={{ id: 13, _img: "blob:photo", _text: "" }}
        isOut={false}
        text=""
        time="12:00"
        reactions={{}}
        myReactions={[]}
        onContextMenu={vi.fn()}
        onOpenMedia={onOpenMedia}
      />
    );

    fireEvent.click(document.querySelector(".msg-img-wrap"));
    expect(onOpenMedia).toHaveBeenCalledWith(expect.objectContaining({ id: 13 }), "image");
    expect(document.querySelector(".bubble-photo")).toBeTruthy();
  });
});

// ── BottomNav ──────────────────────────────────────────────────────────────
describe("BottomNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders chats and settings tabs", async () => {
    const BottomNav = (await import("../components/BottomNav")).default;

    render(
      <BottomNav
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        activeTab="chats"
        onNavChange={vi.fn()}
        unreadTotal={0}
        l={defaultL}
      />
    );

    expect(screen.getByText("Чаты")).toBeInTheDocument();
    expect(screen.getByText("Настройки")).toBeInTheDocument();
    expect(screen.queryByText("Звонки")).toBeNull();
    expect(screen.queryByText("Контакты")).toBeNull();
  });

  it("renders calls tab between chats and settings when enabled", async () => {
    const BottomNav = (await import("../components/BottomNav")).default;
    const onNavChange = vi.fn();

    render(
      <BottomNav
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        activeTab="chats"
        onNavChange={onNavChange}
        unreadTotal={0}
        l={defaultL}
        callsEnabled
      />
    );

    expect(screen.getByText("Звонки")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Звонки"));
    expect(onNavChange).toHaveBeenCalledWith("calls");
  });

  it("highlights active tab", async () => {
    const BottomNav = (await import("../components/BottomNav")).default;

    render(
      <BottomNav
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        activeTab="settings"
        onNavChange={vi.fn()}
        unreadTotal={0}
        l={defaultL}
      />
    );

    const buttons = document.querySelectorAll(".bottom-nav-item");
    expect(buttons[0].classList.contains("active")).toBe(false);
    expect(buttons[1].classList.contains("active")).toBe(true);
  });

  it("shows unread badge on Chats", async () => {
    const BottomNav = (await import("../components/BottomNav")).default;

    render(
      <BottomNav
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        activeTab="chats"
        onNavChange={vi.fn()}
        unreadTotal={5}
        l={defaultL}
      />
    );

    const badge = document.querySelector(".bottom-nav-badge");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe("5");
  });

  it("shows 99+ for unreadTotal > 99", async () => {
    const BottomNav = (await import("../components/BottomNav")).default;

    render(
      <BottomNav
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        activeTab="chats"
        onNavChange={vi.fn()}
        unreadTotal={150}
        l={defaultL}
      />
    );

    const badge = document.querySelector(".bottom-nav-badge");
    expect(badge.textContent).toBe("99+");
  });

  it("does not show badge when unreadTotal is 0", async () => {
    const BottomNav = (await import("../components/BottomNav")).default;

    render(
      <BottomNav
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        activeTab="chats"
        onNavChange={vi.fn()}
        unreadTotal={0}
        l={defaultL}
      />
    );

    expect(document.querySelector(".bottom-nav-badge")).toBeNull();
  });

  it("calls onNavChange on click", async () => {
    const BottomNav = (await import("../components/BottomNav")).default;
    const onNavChange = vi.fn();

    render(
      <BottomNav
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        activeTab="chats"
        onNavChange={onNavChange}
        unreadTotal={0}
        l={defaultL}
      />
    );

    fireEvent.click(screen.getByText("Чаты"));
    expect(onNavChange).toHaveBeenCalledWith("chats");

    fireEvent.click(screen.getByText("Настройки"));
    expect(onNavChange).toHaveBeenCalledWith("settings");
  });
});

// ── SettingsPage ───────────────────────────────────────────────────────────
describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders profile block", async () => {
    const SettingsPage = (await import("../components/SettingsPage")).default;

    render(
      <SettingsPage
        me={{ id: 1, username: "alice", firstName: "Alice", lastName: "Smith" }}
        theme="dark"
        l={englishL}
        onToggleTheme={vi.fn()}
        onLogout={vi.fn()}
        onEditProfile={vi.fn()}
      />
    );

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(document.querySelector(".settings-avatar-btn")).toBeTruthy();
    expect(document.querySelector(".settings-profile")).toBeTruthy();
  });

  it("renders settings sections", async () => {
    const SettingsPage = (await import("../components/SettingsPage")).default;

    render(
      <SettingsPage
        me={{ id: 1, username: "alice", firstName: "Alice" }}
        theme="dark"
        l={englishL}
        onToggleTheme={vi.fn()}
        onLogout={vi.fn()}
        onEditProfile={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Devices")).toBeInTheDocument();
    expect(screen.getByText("Backup")).toBeInTheDocument();
    expect(screen.getByText("Saved Messages")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.queryByText("Notifications")).toBeNull();
    expect(screen.queryByText("soon")).toBeNull();
  });

  it("theme toggle works", async () => {
    const SettingsPage = (await import("../components/SettingsPage")).default;
    const onToggleTheme = vi.fn();

    render(
      <SettingsPage
        me={{ id: 1, username: "alice", firstName: "Alice" }}
        theme="dark"
        l={englishL}
        onToggleTheme={onToggleTheme}
        onLogout={vi.fn()}
        onEditProfile={vi.fn()}
      />
    );

    // Dark theme shows "Dark" subtitle
    expect(screen.getByText("Dark")).toBeInTheDocument();

    // Click the SettingsToggle
    const toggle = document.querySelector(".settings-toggle");
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle);

    expect(onToggleTheme).toHaveBeenCalled();
  });

  it("logout button exists", async () => {
    const SettingsPage = (await import("../components/SettingsPage")).default;
    const onLogout = vi.fn();

    render(
      <SettingsPage
        me={{ id: 1, username: "alice", firstName: "Alice" }}
        theme="dark"
        l={englishL}
        onToggleTheme={vi.fn()}
        onLogout={onLogout}
        onEditProfile={vi.fn()}
      />
    );

    const logoutBtn = screen.getByText("Log out");
    expect(logoutBtn).toBeInTheDocument();

    const row = logoutBtn.closest(".settings-row");
    expect(row).toBeTruthy();
    expect(row.classList.contains("danger")).toBe(true);

    fireEvent.click(logoutBtn);
    expect(onLogout).toHaveBeenCalled();
  });
});

// ── DevicesPage ────────────────────────────────────────────────────────────
describe("DevicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiMocks.listDevices.mockResolvedValue([
      {
        id: 1,
        deviceId: "device-1",
        deviceName: "Chrome · Windows",
        active: true,
        current: true,
        lastSeen: "2026-07-01T10:00:00.000Z",
      },
      {
        id: 2,
        deviceId: "device-2",
        deviceName: "Old browser",
        active: false,
        current: false,
        lastSeen: "2026-06-24T10:00:00.000Z",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders device list", async () => {
    const DevicesPage = (await import("../components/DevicesPage")).default;

    render(<DevicesPage l={englishL} onBack={vi.fn()} />);

    expect(screen.getByText("Devices")).toBeInTheDocument();

    await waitFor(() => {
      expect(document.querySelectorAll(".device-row").length).toBe(2);
    });
  });

  it("shows current/off badges", async () => {
    const DevicesPage = (await import("../components/DevicesPage")).default;

    render(<DevicesPage l={englishL} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Current")).toBeInTheDocument();
    });
    expect(screen.getByText("Off")).toBeInTheDocument();

    const currentBadge = document.querySelector(".device-badge.current");
    expect(currentBadge).toBeTruthy();
    expect(currentBadge.textContent).toBe("Current");

    const offBadge = document.querySelector(".device-badge.disabled");
    expect(offBadge).toBeTruthy();
    expect(offBadge.textContent).toBe("Off");
  });

  it("back button works", async () => {
    const DevicesPage = (await import("../components/DevicesPage")).default;
    const onBack = vi.fn();

    render(<DevicesPage l={englishL} onBack={onBack} />);

    const backBtn = screen.getByTitle("Back");
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});

describe("MediaViewer", () => {
  afterEach(() => {
    cleanup();
  });

  it("pages through photos with arrows", async () => {
    const MediaViewer = (await import("../components/MediaViewer")).default;
    const onIndexChange = vi.fn();

    render(
      <MediaViewer
        items={[
          { id: "1:image", messageId: "1", kind: "image", src: "blob:a", name: "a.jpg", mime: "image/jpeg" },
          { id: "2:image", messageId: "2", kind: "image", src: "blob:b", name: "b.jpg", mime: "image/jpeg" },
        ]}
        index={0}
        onClose={vi.fn()}
        onIndexChange={onIndexChange}
      />
    );

    fireEvent.click(document.querySelector(".media-viewer-nav.next"));
    expect(onIndexChange).toHaveBeenCalledWith(1);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("renders office files as a download prompt and video notes as a circle", async () => {
    const MediaViewer = (await import("../components/MediaViewer")).default;
    const onClose = vi.fn();
    const { rerender } = render(
      <MediaViewer
        items={[{ id: "1:file", messageId: "1", kind: "file", src: "blob:x", name: "sheet.xlsx", mime: "application/vnd.ms-excel" }]}
        index={0}
        onClose={onClose}
      />
    );
    expect(screen.getByText(/Word\/Excel\/PowerPoint/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Закрыть"));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <MediaViewer
        items={[{ id: "2:video_note", messageId: "2", kind: "video_note", src: "blob:note", name: "note.webm", mime: "video/webm" }]}
        index={0}
        onClose={onClose}
      />
    );
    expect(document.querySelector("video.is-circle")).toBeTruthy();
  });

  it("loads a text preview and pages with keyboard", async () => {
    const MediaViewer = (await import("../components/MediaViewer")).default;
    const onIndexChange = vi.fn();
    const onClose = vi.fn();
    render(
      <MediaViewer
        items={[
          { id: "1:file", messageId: "1", kind: "file", name: "note.txt", mime: "text/plain", blob: { text: async () => "hello file" } },
          { id: "2:file", messageId: "2", kind: "file", src: "blob:pdf", name: "doc.pdf", mime: "application/pdf" },
        ]}
        index={0}
        onClose={onClose}
        onIndexChange={onIndexChange}
      />
    );
    expect(await screen.findByText("hello file")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onIndexChange).toHaveBeenCalledWith(0);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("swipes between items, downloads, and renders audio or generic files", async () => {
    const MediaViewer = (await import("../components/MediaViewer")).default;
    const onIndexChange = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const { rerender } = render(
      <MediaViewer
        items={[
          { id: "1:image", messageId: "1", kind: "image", src: "blob:a", name: "a.jpg", mime: "image/jpeg" },
          { id: "2:image", messageId: "2", kind: "image", src: "blob:b", name: "b.jpg", mime: "image/jpeg" },
        ]}
        index={1}
        onClose={vi.fn()}
        onIndexChange={onIndexChange}
      />
    );
    fireEvent.click(document.querySelector(".media-viewer-nav.prev"));
    expect(onIndexChange).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getAllByText("Скачать")[0]);
    expect(click).toHaveBeenCalled();

    rerender(
      <MediaViewer
        items={[{ id: "3:voice", messageId: "3", kind: "voice", src: "blob:a", name: "voice.webm", mime: "audio/webm" }]}
        index={0}
        onClose={vi.fn()}
      />
    );
    expect(document.querySelector("audio")).toBeTruthy();

    rerender(
      <MediaViewer
        items={[{ id: "4:file", messageId: "4", kind: "file", src: "blob:z", name: "archive.zip", mime: "application/zip" }]}
        index={0}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/Превью для этого формата/)).toBeInTheDocument();
    click.mockRestore();
  });
});

describe("SendMediaModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a Telegram-style send window and sends from the footer", async () => {
    const SendMediaModal = (await import("../components/SendMediaModal")).default;
    const onSend = vi.fn();
    const onClose = vi.fn();
    const onCaptionChange = vi.fn();

    render(
      <SendMediaModal
        kind="image"
        src="blob:pic"
        file={{ name: "pic.jpg", size: 12, type: "image/jpeg" }}
        caption=""
        onCaptionChange={onCaptionChange}
        onSend={onSend}
        onClose={onClose}
      />
    );

    expect(screen.getByText("1 медиа")).toBeInTheDocument();
    expect(document.querySelector(".send-media-stage img")?.getAttribute("src")).toBe("blob:pic");

    fireEvent.change(screen.getByPlaceholderText("Добавить подпись..."), { target: { value: "кот" } });
    expect(onCaptionChange).toHaveBeenCalledWith("кот");

    fireEvent.click(screen.getByLabelText("Отправить"));
    expect(onSend).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Закрыть"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows send errors inside the window", async () => {
    const SendMediaModal = (await import("../components/SendMediaModal")).default;
    render(
      <SendMediaModal
        kind="image"
        src="blob:pic"
        caption=""
        error="Не удалось сохранить файл. Обнови страницу и попробуй ещё раз."
        onSend={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/Не удалось сохранить файл/)).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const SendMediaModal = (await import("../components/SendMediaModal")).default;
    const onClose = vi.fn();
    render(
      <SendMediaModal kind="file" file={{ name: "notes.txt", size: 4, type: "text/plain" }} onClose={onClose} />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
