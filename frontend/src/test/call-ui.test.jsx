import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CallOverlay from "../components/CallOverlay";
import CallsPage from "../components/CallsPage";

const l = (ru) => ru;

describe("call UI", () => {
  afterEach(cleanup);
  it("renders incoming accept and decline actions", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    render(
      <CallOverlay
        phase="incoming"
        title="Bob"
        micOn
        cameraOn={false}
        remoteVideoOn={false}
        localVideoRef={{ current: null }}
        remoteVideoRef={{ current: null }}
        onAccept={onAccept}
        onDecline={onDecline}
        l={l}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ответить" }));
    fireEvent.click(screen.getByRole("button", { name: "Отклонить" }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("shows connecting status without a timer", () => {
    render(
      <CallOverlay
        phase="connecting"
        title="Bob"
        micOn
        cameraOn={false}
        remoteVideoOn={false}
        localVideoRef={{ current: null }}
        remoteVideoRef={{ current: null }}
        onHangup={vi.fn()}
        l={l}
      />
    );

    expect(screen.getByText("Соединяем…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Завершить" })).toBeTruthy();
  });

  it("renders in-call mic, camera and hangup controls", () => {
    const onToggleMic = vi.fn();
    const onToggleCamera = vi.fn();
    const onHangup = vi.fn();

    render(
      <CallOverlay
        phase="active"
        title="Bob"
        micOn
        cameraOn={false}
        remoteVideoOn={false}
        localVideoRef={{ current: null }}
        remoteVideoRef={{ current: null }}
        onToggleMic={onToggleMic}
        onToggleCamera={onToggleCamera}
        onHangup={onHangup}
        l={l}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Выключить микрофон" }));
    fireEvent.click(screen.getByRole("button", { name: "Включить камеру" }));
    fireEvent.click(screen.getByRole("button", { name: "Завершить" }));
    expect(onToggleMic).toHaveBeenCalledTimes(1);
    expect(onToggleCamera).toHaveBeenCalledTimes(1);
    expect(onHangup).toHaveBeenCalledTimes(1);
  });

  it("shows E2EE badge and local camera pip when in a call", () => {
    render(
      <CallOverlay
        phase="active"
        title="Bob"
        micOn
        cameraOn
        remoteVideoOn
        mediaProtection="e2ee"
        localVideoRef={{ current: null }}
        remoteVideoRef={{ current: null }}
        onHangup={vi.fn()}
        l={l}
      />
    );

    expect(screen.getByText("Медиа: E2EE")).toBeTruthy();
    expect(document.querySelector(".call-pip.is-on")).toBeTruthy();
  });

  it("lists direct contacts to call from the calls tab", () => {
    const onStartCall = vi.fn();
    const chat = {
      id: 7,
      type: "direct",
      name: "Bob Brown",
      username: "bob",
      colorIdx: 1,
    };

    render(
      <CallsPage
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        l={l}
        chats={[chat]}
        recents={[]}
        onStartCall={onStartCall}
        callsEnabled
      />
    );

    fireEvent.click(screen.getByText("Bob Brown"));
    expect(onStartCall).toHaveBeenCalledWith(chat);
  });

  it("shows recent missed and outgoing rows and an empty state", () => {
    const chat = { id: 7, type: "direct", name: "Bob Brown", username: "bob", colorIdx: 1, online: true };
    const onStartCall = vi.fn();

    const { rerender } = render(
      <CallsPage
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        l={l}
        chats={[chat]}
        recents={[{ chatId: 7, direction: "in", missed: true, at: "2026-01-01T12:00:00Z", name: "Bob" }]}
        onStartCall={onStartCall}
        callsEnabled
      />
    );
    fireEvent.click(screen.getByText(/Пропущенный/));
    expect(onStartCall).toHaveBeenCalledWith(chat);

    rerender(
      <CallsPage
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        l={l}
        chats={[chat]}
        recents={[{ chatId: 7, direction: "out", missed: false, at: "2026-01-01T12:00:00Z" }]}
        onStartCall={onStartCall}
        callsEnabled
      />
    );
    expect(screen.getByText(/Исходящий/)).toBeTruthy();

    rerender(
      <CallsPage
        me={{ id: 1, username: "alice" }}
        myName="Alice"
        l={l}
        chats={[]}
        recents={[]}
        onStartCall={onStartCall}
      />
    );
    expect(screen.getByText("Пока нет звонков")).toBeTruthy();
  });
});
