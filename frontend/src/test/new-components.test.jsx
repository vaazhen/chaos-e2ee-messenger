import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

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
    const { rerender } = render(
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

  it("renders all 4 tabs", async () => {
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

    expect(screen.getByText("Звонки")).toBeInTheDocument();
    expect(screen.getByText("Контакты")).toBeInTheDocument();
    expect(screen.getByText("Чаты")).toBeInTheDocument();
    expect(screen.getByText("Настройки")).toBeInTheDocument();
  });

  it("highlights active tab", async () => {
    const BottomNav = (await import("../components/BottomNav")).default;

    render(
      <BottomNav
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        activeTab="contacts"
        onNavChange={vi.fn()}
        unreadTotal={0}
        l={defaultL}
      />
    );

    const buttons = document.querySelectorAll(".bottom-nav-item");
    expect(buttons[0].classList.contains("active")).toBe(false);
    expect(buttons[1].classList.contains("active")).toBe(true);
    expect(buttons[2].classList.contains("active")).toBe(false);
    expect(buttons[3].classList.contains("active")).toBe(false);
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

    fireEvent.click(screen.getByText("Звонки"));
    expect(onNavChange).toHaveBeenCalledWith("calls");

    fireEvent.click(screen.getByText("Контакты"));
    expect(onNavChange).toHaveBeenCalledWith("contacts");

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

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Calls")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("Chats")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getAllByText("Language").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Support")).toBeInTheDocument();
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
  });

  afterEach(() => {
    cleanup();
  });

  it("renders device list", async () => {
    const DevicesPage = (await import("../components/DevicesPage")).default;

    render(<DevicesPage l={englishL} onBack={vi.fn()} />);

    expect(screen.getByText("Devices")).toBeInTheDocument();

    const deviceRows = document.querySelectorAll(".device-row");
    expect(deviceRows.length).toBe(2);
  });

  it("shows current/off badges", async () => {
    const DevicesPage = (await import("../components/DevicesPage")).default;

    render(<DevicesPage l={englishL} onBack={vi.fn()} />);

    expect(screen.getByText("Current")).toBeInTheDocument();
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
