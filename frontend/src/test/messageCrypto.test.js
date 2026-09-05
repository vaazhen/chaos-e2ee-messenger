import { beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  saveMessages: vi.fn(async () => {}),
}));

const attachmentMocks = vi.hoisted(() => ({
  hydrateAttachment: vi.fn(),
}));

vi.mock("../localMessageStore", () => ({
  saveMessages: storeMocks.saveMessages,
}));

vi.mock("../previewCache", () => ({
  saveMessagePreview: vi.fn(),
}));

vi.mock("../messageAttachments", () => ({
  hydrateAttachment: attachmentMocks.hydrateAttachment,
}));

vi.mock("../api", () => ({
  getToken: () => "jwt",
  API_BASE: "https://example.test/api",
}));

vi.mock("../deviceId", () => ({
  getOrCreateDeviceId: () => "device-1",
}));

describe("decryptMsg", () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.e2ee;
    attachmentMocks.hydrateAttachment.mockReset();
    storeMocks.saveMessages.mockClear();
  });

  it("keeps a reply pointer from the decrypted payload", async () => {
    window.e2ee = {
      decryptEnvelope: vi.fn(async () => JSON.stringify({
        v: 1,
        type: "text",
        text: "answer",
        replyTo: { id: 9, _text: "orig" },
      })),
    };
    const { decryptMsg } = await import("../messageCrypto");
    const row = await decryptMsg({
      id: 12,
      chatId: 100,
      senderId: 2,
      senderDeviceId: "device-b",
      createdAt: "2026-04-28T10:00:00.000Z",
      content: "[encrypted]",
      envelope: { ciphertext: "c", nonce: "n", messageType: "WHISPER" },
    }, 1, 100);

    expect(row._text).toBe("answer");
    expect(row._replyTo).toEqual({ id: 9, _text: "orig" });
  });

  it("does not trust server content when envelope decrypt fails", async () => {
    window.e2ee = {
      decryptEnvelope: vi.fn(async () => {
        throw new Error("aad mismatch");
      }),
    };
    const { decryptMsg } = await import("../messageCrypto");
    const row = await decryptMsg({
      id: 13,
      chatId: 100,
      senderId: 2,
      senderDeviceId: "device-b",
      createdAt: "2026-04-28T10:00:00.000Z",
      content: "attacker-controlled plaintext",
      envelope: { ciphertext: "c", nonce: "n", messageType: "WHISPER" },
    }, 1, 100);

    expect(row.content).toBe("[encrypted]");
    expect(row._text).toBe("[encrypted]");
  });
});
