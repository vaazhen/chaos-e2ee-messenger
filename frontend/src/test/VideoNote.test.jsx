import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import VideoNote from "../components/VideoNote";

describe("VideoNote", () => {
  afterEach(cleanup);

  it("plays and pauses the circle from the bubble itself", async () => {
    const play = vi.fn().mockResolvedValue();
    const pause = vi.fn();
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(play);
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(pause);

    render(<VideoNote src="blob:note" durationMs={4000} />);
    const button = screen.getByRole("button", { name: "Смотреть" });
    expect(button.className).toContain("is-paused");

    fireEvent.click(button);
    expect(play).toHaveBeenCalledTimes(1);

    const video = document.querySelector("video");
    Object.defineProperty(video, "paused", { configurable: true, get: () => false });
    fireEvent.play(video);
    expect(screen.getByRole("button", { name: "Пауза" }).className).toContain("is-playing");

    fireEvent.click(screen.getByRole("button", { name: "Пауза" }));
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it("opens the viewer if playback fails and resets on ended", async () => {
    const onOpen = vi.fn();
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("autoplay"));
    render(<VideoNote src="blob:note" durationMs={0} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Смотреть" }));
    await vi.waitFor(() => expect(onOpen).toHaveBeenCalled());

    const video = document.querySelector("video");
    Object.defineProperty(video, "duration", { configurable: true, value: 2.5 });
    fireEvent.loadedMetadata(video);
    fireEvent.ended(video);
    expect(screen.getByRole("button", { name: "Смотреть" })).toBeTruthy();
  });
});
