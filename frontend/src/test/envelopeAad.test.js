import { describe, expect, it } from "vitest";
import { ENVELOPE_AAD_VERSION, envelopeAadHex } from "../envelopeAad";

describe("envelope AAD v2 vectors", () => {
  it("keeps the published version byte", () => {
    expect(ENVELOPE_AAD_VERSION).toBe(0x02);
  });

  it("encodes a whisper with a 64-bit chat id and trailing unused zeros", () => {
    expect(envelopeAadHex({
      messageType: "WHISPER",
      chatId: 100,
      messageIndex: 0,
      previousChainLength: 0,
    })).toBe("02020000000000000064000000000000000000000000");
  });

  it("encodes a prekey whisper with index and previous chain length", () => {
    expect(envelopeAadHex({
      messageType: "PREKEY_WHISPER",
      chatId: 1,
      messageIndex: 7,
      previousChainLength: 3,
    })).toBe("02010000000000000001000000070000000300000000");
  });

  it("encodes a self-whisper with a missing chat id as zero", () => {
    expect(envelopeAadHex({
      messageType: "SELF_WHISPER",
    })).toBe("02030000000000000000000000000000000000000000");
  });

  it("appends ratchet public key length and latin-1 bytes", () => {
    expect(envelopeAadHex({
      messageType: "WHISPER",
      chatId: 100,
      messageIndex: 2,
      previousChainLength: 1,
      ratchetPublicKey: "AB",
    })).toBe("02020000000000000064000000020000000100000000000000024142");
  });

  it("uses type code 0 for an unknown message type", () => {
    expect(envelopeAadHex({
      messageType: "UNKNOWN",
      chatId: 0,
    })).toBe("02000000000000000000000000000000000000000000");
  });

  it("changes the hex when any bound field changes", () => {
    const base = {
      messageType: "WHISPER",
      chatId: 100,
      messageIndex: 2,
      previousChainLength: 1,
      ratchetPublicKey: "AB",
    };
    const baseline = envelopeAadHex(base);
    const mutants = [
      { ...base, messageType: "PREKEY_WHISPER" },
      { ...base, chatId: 101 },
      { ...base, messageIndex: 3 },
      { ...base, previousChainLength: 2 },
      { ...base, ratchetPublicKey: "AC" },
    ];
    for (const mutant of mutants) {
      expect(envelopeAadHex(mutant)).not.toBe(baseline);
    }
  });
});
