import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  api: {
    searchUsers: vi.fn(),
    patchGroupSettings: vi.fn(),
    patchGroupPermissions: vi.fn(),
    inviteGroupParticipants: vi.fn(),
    deleteGroup: vi.fn(),
    patchParticipantRole: vi.fn(),
    removeGroupParticipant: vi.fn(),
    muteGroupParticipant: vi.fn(),
    unmuteGroupParticipant: vi.fn(),
    banGroupParticipant: vi.fn(),
    unbanGroupParticipant: vi.fn(),
  },
}));

vi.mock("../api", () => ({
  api: mocks.api,
}));

const l = (_ru, en) => en;

function buildChat(overrides = {}) {
  const participants = overrides.groupParticipants ?? [
    { userId: 1, firstName: "Alice", username: "alice", role: "MEMBER" },
    { userId: 2, firstName: "Bob", username: "bob", role: "MEMBER" },
    { userId: 3, firstName: "Carol", username: "carol", role: "ADMIN" },
  ];
  return {
    id: 10,
    type: "group",
    myRole: "OWNER",
    name: "Team",
    groupBio: "",
    whoCanWrite: "ALL",
    whoCanEditInfo: "ADMINS",
    whoCanInvite: "ADMINS",
    groupParticipants: participants,
    ...overrides,
  };
}

describe("GroupAdminPanel", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("debounces participant search and filters the list", async () => {
    vi.useFakeTimers();
    const { default: GroupAdminPanel } = await import("../components/GroupAdminPanel");
    render(<GroupAdminPanel me={{ id: 99 }} chat={buildChat()} l={l} onRefreshGroup={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Name, @username/i);
    fireEvent.change(input, { target: { value: "bob" } });

    expect(screen.getByText("Alice")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(160);
    });

    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows overflow menu with moderation actions for owner", async () => {
    const { default: GroupAdminPanel } = await import("../components/GroupAdminPanel");
    window.confirm = vi.fn(() => true);
    window.prompt = vi.fn(() => null);

    render(<GroupAdminPanel me={{ id: 99 }} chat={buildChat()} l={l} onRefreshGroup={vi.fn()} />);

    const menus = screen.getAllByRole("button", { name: /Participant actions/i });
    fireEvent.click(menus[0]);

    await waitFor(() => {
      expect(screen.getByRole("menu", { name: /Participant actions/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("menuitem", { name: /Mute/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Ban/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Remove from group/i })).toBeInTheDocument();
  });

  it("paginates participants when list exceeds page size (30 per page)", async () => {
    const { default: GroupAdminPanel } = await import("../components/GroupAdminPanel");
    const many = Array.from({ length: 160 }, (_, i) => ({
      userId: 1000 + i,
      firstName: `User${i}`,
      username: `u${i}`,
      role: "MEMBER",
    }));
    render(<GroupAdminPanel me={{ id: 99 }} chat={buildChat({ groupParticipants: many })} l={l} onRefreshGroup={vi.fn()} />);

    expect(screen.getByRole("navigation", { name: /Participant list pages/i })).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 6/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Next$/i })).toBeEnabled();

    expect(screen.getByText("User0")).toBeInTheDocument();
    expect(screen.queryByText("User31")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Next$/i }));
    expect(screen.queryByText("User0")).not.toBeInTheDocument();
    expect(screen.getByText("User31")).toBeInTheDocument();
  });

  it("filters participants by role", async () => {
    const { default: GroupAdminPanel } = await import("../components/GroupAdminPanel");
    render(<GroupAdminPanel me={{ id: 99 }} chat={buildChat()} l={l} onRefreshGroup={vi.fn()} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    const roleSelect = document.getElementById("ga-participant-role-filter");
    fireEvent.change(roleSelect, { target: { value: "ADMIN" } });

    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });

  it("shows muted-only filter when payload includes muted participants", async () => {
    const { default: GroupAdminPanel } = await import("../components/GroupAdminPanel");
    const participants = [
      { userId: 1, firstName: "Alice", username: "alice", role: "MEMBER" },
      { userId: 2, firstName: "Bob", username: "bob", role: "MEMBER", mutedUntil: "2099-01-01T00:00:00.000Z" },
    ];
    render(<GroupAdminPanel me={{ id: 99 }} chat={buildChat({ groupParticipants: participants })} l={l} onRefreshGroup={vi.fn()} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Muted only/i }));

    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});

describe("GroupAdminModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders floating card shell with dialog semantics", async () => {
    const { default: GroupAdminModal } = await import("../components/GroupAdminModal");
    const { container } = render(
      <GroupAdminModal me={{ id: 1 }} chat={buildChat()} l={l} onRefreshGroup={vi.fn()} onClose={vi.fn()} />
    );

    expect(screen.getByRole("dialog", { name: /Group management/i })).toBeInTheDocument();
    expect(container.querySelector(".user-profile-screen.group-admin-modal-screen")).toBeTruthy();
    expect(container.querySelector(".user-profile-modal-bg")).toBeTruthy();
  });
});
