import { beforeEach, describe, expect, it, vi } from "vitest";

function b64urlJson(value) {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function loadCryptoEngine() {
  vi.resetModules();
  await import("../crypto-engine.js");
}

function bytesToB64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function testBundle() {
  return {
    deviceId: "device-self",
    registrationId: 1,
    identity: {
      publicKey: bytesToB64(new Uint8Array(32).fill(7)),
      privateKeyPkcs8: bytesToB64(new Uint8Array(64).fill(13)),
    },
    signingKey: {
      publicKeySpki: "signing-public",
      privateKeyPkcs8: "signing-private",
    },
    signedPreKey: {
      preKeyId: 1,
      publicKey: "signed-pre-key-public",
      privateKeyPkcs8: "signed-pre-key-private",
      signature: "signature",
    },
    oneTimePreKeys: [],
  };
}

describe("crypto-engine frontend safety checks", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    delete window.e2ee;
  });

  it("migrates old username-scoped crypto storage to unscoped storage once token subject is known", async () => {
    const token = `header.${b64urlJson({ sub: "alice" })}.signature`;

    localStorage.setItem("cm_token", token);
    localStorage.setItem("cm_device_id:alice", "device-old");
    localStorage.setItem("cm_device_bundle_v2:alice", JSON.stringify({ deviceId: "device-old" }));
    localStorage.setItem("cm_e2ee_sessions_v5:alice", JSON.stringify({ session: true }));

    await loadCryptoEngine();

    expect(localStorage.getItem("cm_device_id")).toBe("device-old");
    expect(JSON.parse(localStorage.getItem("cm_device_bundle_v2"))).toEqual({ deviceId: "device-old" });
    expect(JSON.parse(localStorage.getItem("cm_e2ee_sessions_v5"))).toEqual({ session: true });

    expect(localStorage.getItem("cm_device_id:alice")).toBeNull();
    expect(localStorage.getItem("cm_device_bundle_v2:alice")).toBeNull();
    expect(localStorage.getItem("cm_e2ee_sessions_v5:alice")).toBeNull();
  });

  it("does not overwrite already existing unscoped crypto storage during migration", async () => {
    const token = `header.${b64urlJson({ sub: "alice" })}.signature`;

    localStorage.setItem("cm_token", token);
    localStorage.setItem("cm_device_id", "device-current");
    localStorage.setItem("cm_device_id:alice", "device-old");

    await loadCryptoEngine();

    expect(localStorage.getItem("cm_device_id")).toBe("device-current");
    expect(localStorage.getItem("cm_device_id:alice")).toBeNull();
  });

  it("getOrCreateDeviceId creates stable unscoped device id", async () => {
    await loadCryptoEngine();

    const first = window.e2ee.getOrCreateDeviceId();
    const second = window.e2ee.getOrCreateDeviceId();

    expect(first).toMatch(/^device-/);
    expect(second).toBe(first);
    expect(localStorage.getItem("cm_device_id")).toBe(first);
  });

  it("resetLocalDeviceIdentity clears local device keys and creates a fresh id", async () => {
    await loadCryptoEngine();

    localStorage.setItem("cm_device_id", "device-old");
    localStorage.setItem("cm_device_bundle_v2", JSON.stringify({ deviceId: "device-old" }));
    localStorage.setItem("cm_e2ee_sessions_v5", JSON.stringify({ session: true }));

    window.e2ee.resetLocalDeviceIdentity();

    expect(localStorage.getItem("cm_device_bundle_v2")).toBeNull();
    expect(localStorage.getItem("cm_e2ee_sessions_v5")).toBeNull();
    expect(localStorage.getItem("cm_device_id")).toBeNull();
    expect(window.e2ee.getOrCreateDeviceId()).toMatch(/^device-/);
    expect(window.e2ee.getOrCreateDeviceId()).not.toBe("device-old");
  });

  it("decryptEnvelope fails clearly when local bundle is missing", async () => {
    await loadCryptoEngine();

    await expect(window.e2ee.decryptEnvelope({
      messageType: "SELF_WHISPER",
      ciphertext: "bad",
      nonce: "bad",
    })).rejects.toThrow("Local device bundle is missing");
  });

  it("encrypts self envelopes with private identity material instead of public key material", async () => {
    await loadCryptoEngine();

    const bundle = testBundle();
    localStorage.setItem("cm_device_bundle_v2", JSON.stringify(bundle));

    const api = vi.fn(async (path) => {
      expect(path).toBe("/api/crypto/resolve-chat-devices/100");
      return {
        targetDevices: [{
          userId: 1,
          deviceId: bundle.deviceId,
        }],
      };
    });

    const request = await window.e2ee.buildFanoutRequest(api, 100, "private self secret");
    const selfEnvelope = request.envelopes[0];

    expect(selfEnvelope.messageType).toBe("SELF_WHISPER");

    localStorage.setItem("cm_device_bundle_v2", JSON.stringify({
      ...bundle,
      identity: {
        ...bundle.identity,
        publicKey: bytesToB64(new Uint8Array(32).fill(99)),
      },
    }));

    await expect(window.e2ee.decryptEnvelope(selfEnvelope)).resolves.toBe("private self secret");
  });
});
