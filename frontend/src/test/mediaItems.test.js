import { describe, expect, it } from "vitest";
import { collectMediaItems, indexOfMediaItem, mediaKindForMessage } from "../mediaItems";

describe("mediaItems", () => {
  it("classifies message kinds", () => {
    expect(mediaKindForMessage(null)).toBeNull();
    expect(mediaKindForMessage({ _img: "blob:pic" })).toBe("image");
    expect(mediaKindForMessage({ _videoNote: { src: "blob:v" } })).toBe("video_note");
    expect(mediaKindForMessage({ _attachment: { mimeType: "video/mp4" } })).toBe("video");
    expect(mediaKindForMessage({ _voice: { duration: 1 } })).toBe("voice");
    expect(mediaKindForMessage({ _attachment: { fileName: "a.xlsx" } })).toBe("file");
    expect(mediaKindForMessage({ _text: "hi" })).toBeNull();
  });

  it("collects images, circles, videos and files in chat order", () => {
    const items = collectMediaItems([
      { id: 1, _img: "blob:pic", _attachment: { fileName: "cat.jpg", mimeType: "image/jpeg" } },
      { id: 2, _videoNote: { src: "blob:note", mime: "video/webm" } },
      { id: 3, _attachment: { mimeType: "video/mp4", objectUrl: "blob:vid", fileName: "clip.mp4" } },
      { id: 4, _attachment: { fileName: "sheet.xlsx", mimeType: "application/vnd.ms-excel", objectUrl: "blob:x" } },
      { id: 5, _text: "skip me" },
      { messageId: 6, _attachment: { objectUrl: "blob:bin" } },
    ]);

    expect(items.map((item) => item.kind)).toEqual(["image", "video_note", "video", "file", "file"]);
    expect(indexOfMediaItem(items, 2, "video_note")).toBe(1);
    expect(indexOfMediaItem(items, "6")).toBe(4);
    expect(indexOfMediaItem(items, "missing")).toBe(-1);
  });

  it("fills default names when attachment metadata is missing", () => {
    const items = collectMediaItems([
      { id: 1, _img: "blob:pic" },
      { id: 2, _videoNote: { src: "blob:note" } },
      { id: 3, _attachment: { mimeType: "video/mp4", objectUrl: "blob:vid" } },
    ]);
    expect(items.map((item) => item.name)).toEqual(["photo", "video-note", "video"]);
  });
});
