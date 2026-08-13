import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import UserProfileModal from "../components/UserProfileModal";

const chat = {
  id: 10,
  type: "direct",
  name: "Test Robot",
  username: "vaazhen1",
  otherUserId: 2,
  colorIdx: 1,
  online: false,
  avatarUrl: "",
};

function renderProfile(overrides = {}) {
  const props = {
    me: { id: 1 },
    chat,
    chatBg: "grid",
    muted: false,
    l: (_ru, en) => en || _ru,
    onClose: vi.fn(),
    onOpenSearch: vi.fn(),
    onVerifyEncryption: vi.fn(),
    onAliasChange: vi.fn(),
    onChangeBg: vi.fn(),
    onToggleMute: vi.fn(),
    ...overrides,
  };
  render(<UserProfileModal {...props} />);
  return props;
}

describe("UserProfileModal", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("shows a person card with action rail, not a wallpaper form", () => {
    renderProfile();

    expect(screen.getAllByText("Test Robot").length).toBeGreaterThan(0);
    expect(screen.getByText("@vaazhen1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mute" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search messages" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify encryption" })).toBeInTheDocument();
    expect(screen.getByText("Name in chats")).toBeInTheDocument();
    expect(screen.getByText("Chat background")).toBeInTheDocument();
    expect(screen.queryByText("Grid")).toBeInTheDocument();
    expect(screen.queryByText("Waves")).toBeNull();
    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.queryByText("Сохранить")).toBeNull();
  });

  it("opens wallpaper as a nested screen", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByText("Chat background"));
    expect(screen.getByText("Waves")).toBeInTheDocument();
    expect(screen.getByText("Noise")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mute" })).toBeNull();
  });

  it("opens local name as a nested screen", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByText("Name in chats"));
    expect(screen.getByPlaceholderText("Test Robot")).toBeInTheDocument();
    expect(screen.getByText(/Only you see this name/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mute" })).toBeNull();
  });

  it("search action closes the card and opens chat search", async () => {
    const user = userEvent.setup();
    const props = renderProfile();

    await user.click(screen.getByRole("button", { name: "Search messages" }));
    expect(props.onOpenSearch).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
