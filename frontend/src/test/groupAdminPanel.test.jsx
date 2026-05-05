import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it('renders "Show more" when filtered list exceeds page size', async () => {
    const { default: GroupAdminPanel } = await import("../components/GroupAdminPanel");
    const many = Array.from({ length: 160 }, (_, i) => ({
      userId: 1000 + i,
      firstName: `User${i}`,
      username: `u${i}`,
      role: "MEMBER",
    }));
    render(<GroupAdminPanel me={{ id: 99 }} chat={buildChat({ groupParticipants: many })} l={l} onRefreshGroup={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Show more/i })).toBeInTheDocument();
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
    expect(container.querySelector(".user-profile-screen")).toBeTruthy();
    expect(container.querySelector(".user-profile-modal-bg")).toBeTruthy();
  });
});
