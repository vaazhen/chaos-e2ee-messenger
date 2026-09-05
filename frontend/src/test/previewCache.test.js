import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../deviceId", () => ({
  getOrCreateDeviceId: () => "device-1",
}));

describe("previewCache", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    localStorage.setItem("cm_decrypted_preview:legacy", JSON.stringify({ preview: "old secret" }));
  });

  it("keeps previews in memory and wipes leftover localStorage plaintext", async () => {
    const cache = await import("../previewCache");
    expect(localStorage.getItem("cm_decrypted_preview:legacy")).toBeNull();

    cache.saveMessagePreview({
      userId: 1,
      chatId: 10,
      messageId: 99,
      preview: "hello",
    });

    expect(cache.loadMessagePreview({ userId: 1, chatId: 10, messageId: 99 }).preview).toBe("hello");
    for (let i = 0; i < localStorage.length; i += 1) {
      expect(String(localStorage.key(i) || "")).not.toContain("cm_decrypted_preview");
    }

    cache.clearPreviewCacheForUser(1);
    expect(cache.loadMessagePreview({ userId: 1, chatId: 10, messageId: 99 })).toBeNull();
  });
});
