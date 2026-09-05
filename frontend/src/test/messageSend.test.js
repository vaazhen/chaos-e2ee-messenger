import { describe, expect, it } from "vitest";
import {
  applyTtlAndReply,
  assertPayloadSize,
  buildOptimisticMessage,
  isEmptySend,
  MAX_ENCRYPTED_PAYLOAD_CHARS,
  parseSendInput,
} from "../messageSend";

describe("parseSendInput", () => {
  it("parses a plain string as text-only input", () => {
    expect(parseSendInput("hello")).toEqual({
      text: "hello",
      imgFile: null,
      voiceFile: null,
      videoNoteFile: null,
      generalFile: null,
      ttl: null,
      replyTo: null,
    });
  });

  it("parses an object with trimmed text, ttl, and replyTo", () => {
    const replyTo = { id: 42, _text: "parent", _img: false, _voice: false, _videoNote: false };
    expect(
      parseSendInput({
        text: "  caption  ",
        ttl: 120,
        replyTo,
        imgFile: { file: new Blob() },
      }),
    ).toEqual({
      text: "caption",
      imgFile: { file: expect.any(Blob) },
      voiceFile: undefined,
      videoNoteFile: undefined,
      generalFile: undefined,
      ttl: 120,
      replyTo,
    });
  });
});

describe("isEmptySend", () => {
  it("detects empty text with no files", () => {
    expect(
      isEmptySend({
        text: "",
        imgFile: null,
        voiceFile: null,
        videoNoteFile: null,
        generalFile: null,
      }),
    ).toBe(true);
    expect(
      isEmptySend({
        text: "hi",
        imgFile: null,
        voiceFile: null,
        videoNoteFile: null,
        generalFile: null,
      }),
    ).toBe(false);
  });
});

describe("applyTtlAndReply", () => {
  it("adds compact reply and ttl to a JSON payload", () => {
    const plaintext = JSON.stringify({ v: 1, type: "text", text: "hi" });
    const replyTo = { id: 7, content: "quoted message", _img: true };
    const result = applyTtlAndReply(plaintext, 60, replyTo);
    const parsed = JSON.parse(result);
    expect(parsed.ttl).toBe(60);
    expect(parsed.replyTo).toEqual({
      id: 7,
      _text: "quoted message",
      _img: true,
      _voice: false,
      _videoNote: false,
    });
  });

  it("wraps plain text when ttl or reply is present", () => {
    const result = applyTtlAndReply("plain", null, { id: 1, _text: "ref" });
    expect(JSON.parse(result)).toEqual({
      v: 1,
      type: "text",
      text: "plain",
      replyTo: { id: 1, _text: "ref", _img: false, _voice: false, _videoNote: false },
    });
  });

  it("returns plaintext unchanged when neither ttl nor replyTo is set", () => {
    expect(applyTtlAndReply("unchanged", null, null)).toBe("unchanged");
  });
});

describe("assertPayloadSize", () => {
  it("throws when plaintext exceeds MAX_ENCRYPTED_PAYLOAD_CHARS", () => {
    expect(MAX_ENCRYPTED_PAYLOAD_CHARS).toBe(180_000);
    expect(() => assertPayloadSize("x".repeat(180_001))).toThrow(
      "Файл слишком большой для отправки сообщением. Нужно вложение, а не inline.",
    );
    expect(() => assertPayloadSize("x".repeat(180_000))).not.toThrow();
  });
});

describe("buildOptimisticMessage", () => {
  it("builds a temp outgoing message with compact reply metadata", () => {
    const replyTo = { messageId: 99, content: "parent text" };
    const msg = buildOptimisticMessage({
      clientMessageId: "tmp_123",
      myId: 5,
      parsedPayload: { text: "hello", img: null, voice: null, videoNote: null, payload: null },
      encryptedPlaintext: '{"v":1,"type":"text","text":"hello"}',
      ttl: 30,
      replyTo,
      nowText: "12:00",
      nowMs: 1_000_000,
    });

    expect(msg._temp).toBe(true);
    expect(msg._out).toBe(true);
    expect(msg._replyTo).toEqual({
      id: 99,
      _text: "parent text",
      _img: false,
      _voice: false,
      _videoNote: false,
    });
    expect(msg.expiresAt).toBe(new Date(1_000_000 + 30 * 1000).toISOString());
    expect(msg._time).toBe("12:00");
    expect(msg.status).toBe("SENT");
  });
});
