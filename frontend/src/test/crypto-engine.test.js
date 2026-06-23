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

describe("Double Ratchet full protocol cycle", () => {
  let Alice, Bob;

  async function genDevice(deviceId) {
    const identityKey = await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
    const signedPreKey = await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
    const signingKey = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
    );

    const identityPub = new Uint8Array(await crypto.subtle.exportKey('raw', identityKey.publicKey));
    const identityPriv = new Uint8Array(await crypto.subtle.exportKey('pkcs8', identityKey.privateKey));
    const signedPreKeyPub = new Uint8Array(await crypto.subtle.exportKey('raw', signedPreKey.publicKey));
    const signedPreKeyPriv = new Uint8Array(await crypto.subtle.exportKey('pkcs8', signedPreKey.privateKey));
    const signingPub = new Uint8Array(await crypto.subtle.exportKey('spki', signingKey.publicKey));
    const signingPriv = new Uint8Array(await crypto.subtle.exportKey('pkcs8', signingKey.privateKey));
    const signedPreKeySig = new Uint8Array(await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' }, signingKey.privateKey, signedPreKeyPub
    ));

    return {
      deviceId,
      registrationId: 1,
      identity: { publicKey: bytesToB64(identityPub), privateKeyPkcs8: bytesToB64(identityPriv) },
      signingKey: { publicKeySpki: bytesToB64(signingPub), privateKeyPkcs8: bytesToB64(signingPriv) },
      signedPreKey: { preKeyId: 1, publicKey: bytesToB64(signedPreKeyPub), privateKeyPkcs8: bytesToB64(signedPreKeyPriv), signature: bytesToB64(signedPreKeySig) },
      oneTimePreKeys: [],
    };
  }

  function makeApi(targetBundle) {
    return vi.fn(async (path) => {
      if (path.includes("resolve-chat-devices")) {
        return { targetDevices: [{ userId: 42, deviceId: targetBundle.deviceId, identityPublicKey: targetBundle.identity.publicKey, signingPublicKey: targetBundle.signingKey.publicKeySpki, signedPreKey: targetBundle.signedPreKey, oneTimePreKey: null }] };
      }
      if (path.includes("reserve-prekey")) {
        return { signedPreKey: null, oneTimePreKey: null };
      }
      return {};
    });
  }

  function setBundle(bundle) {
    localStorage.setItem("cm_device_bundle_v2", JSON.stringify(bundle));
  }

  function getSessions() {
    return localStorage.getItem("cm_e2ee_sessions_v5") || "{}";
  }

  function setSessions(json) {
    localStorage.setItem("cm_e2ee_sessions_v5", json);
  }

  beforeAll(async () => {
    Alice = await genDevice("device-alice");
    Bob = await genDevice("device-bob");
  }, 30000);

  beforeEach(() => {
    delete window.e2ee;
    localStorage.clear();
  });

  it("full bidirectional X3DH + Double Ratchet cycle (Alice sends, Bob decrypts, Bob replies, Alice decrypts)", async () => {
    await loadCryptoEngine();

    // Alice → Bob via X3DH (PREKEY_WHISPER)
    setBundle(Alice);
    setSessions("{}");
    const fanout = await window.e2ee.buildFanoutRequest(makeApi(Bob), 100, "hello from alice");
    expect(fanout.envelopes).toHaveLength(1);
    const env1 = fanout.envelopes[0];
    expect(env1.messageType).toBe("PREKEY_WHISPER");
    expect(env1.ciphertext).toBeTruthy();
    const aliceSessions = getSessions();

    // Bob decrypts (X3DH recipient, establishes session)
    setBundle(Bob);
    setSessions("{}");
    const pt1 = await window.e2ee.decryptEnvelope({ ...env1, senderDeviceId: Alice.deviceId });
    expect(pt1).toBe("hello from alice");
    const bobSessions = getSessions();

    // Bob replies via existing session (WHISPER, triggers DH ratchet on both sides)
    localStorage.setItem("cm_token", `header.${b64urlJson({ sub: "bob" })}.signature`);
    setBundle(Bob);
    setSessions(bobSessions);
    const fanout2 = await window.e2ee.buildFanoutRequest(makeApi(Alice), 100, "hello from bob");
    expect(fanout2.envelopes).toHaveLength(1);
    const env2 = fanout2.envelopes[0];
    expect(env2.messageType).toBe("WHISPER");
    expect(env2.ratchetPublicKey).not.toBe(env1.ratchetPublicKey);

    // Alice decrypts (DH ratchet on receiving side)
    setBundle(Alice);
    setSessions(aliceSessions);
    const pt2 = await window.e2ee.decryptEnvelope({ ...env2, senderDeviceId: Bob.deviceId });
    expect(pt2).toBe("hello from bob");
  }, 30000);

  it("multiple sequential messages advance sending chain", async () => {
    await loadCryptoEngine();

    setBundle(Alice);
    setSessions("{}");
    const N = 5;
    const envelopes = [];
    for (let i = 0; i < N; i++) {
      const fanout = await window.e2ee.buildFanoutRequest(makeApi(Bob), 100, `msg-${i}`);
      envelopes.push(fanout.envelopes[0]);
    }

    setBundle(Bob);
    setSessions("{}");
    for (let i = 0; i < N; i++) {
      const pt = await window.e2ee.decryptEnvelope({ ...envelopes[i], senderDeviceId: Alice.deviceId });
      expect(pt).toBe(`msg-${i}`);
    }
  }, 30000);

  it("out-of-order delivery via skipped message keys", async () => {
    await loadCryptoEngine();

    setBundle(Alice);
    setSessions("{}");
    const envelopes = [];
    for (let i = 0; i < 5; i++) {
      const fanout = await window.e2ee.buildFanoutRequest(makeApi(Bob), 100, `msg-${i}`);
      envelopes.push(fanout.envelopes[0]);
    }

    setBundle(Bob);
    setSessions("{}");
    // First establish session with the PREKEY_WHISPER message (index 0)
    expect(await window.e2ee.decryptEnvelope({ ...envelopes[0], senderDeviceId: Alice.deviceId })).toBe("msg-0");
    // Then decrypt out of order — skipped message keys handle indices 1,2,3
    for (const idx of [4, 2, 1, 3]) {
      const pt = await window.e2ee.decryptEnvelope({ ...envelopes[idx], senderDeviceId: Alice.deviceId });
      expect(pt).toBe(`msg-${idx}`);
    }
  }, 30000);

  it("rejects decryption when local bundle is missing", async () => {
    await loadCryptoEngine();
    await expect(window.e2ee.decryptEnvelope({
      messageType: "WHISPER", senderDeviceId: "x", ciphertext: "x", nonce: "x",
    })).rejects.toThrow("Local device bundle is missing");
  });

  it("self-whisper works alongside Double Ratchet", async () => {
    await loadCryptoEngine();

    setBundle(Alice);
    const api = vi.fn(async (path) => {
      if (path.includes("resolve-chat-devices")) {
        return { targetDevices: [{ userId: 1, deviceId: Alice.deviceId }] };
      }
      return {};
    });
    const fanout = await window.e2ee.buildFanoutRequest(api, 100, "self note");
    expect(fanout.envelopes).toHaveLength(1);
    expect(fanout.envelopes[0].messageType).toBe("SELF_WHISPER");

    await expect(window.e2ee.decryptEnvelope({
      ...fanout.envelopes[0], senderDeviceId: Alice.deviceId,
    })).resolves.toBe("self note");
  });
});
