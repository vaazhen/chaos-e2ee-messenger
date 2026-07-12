import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

async function activateDevice(bundle, sessions = {}) {
  await window.e2ee.importLocalDeviceBundle(bundle);
  await window.e2ee.__importSessionStateForTests(sessions);
}

function getSessions() {
  return window.e2ee.__exportSessionStateForTests();
}

function clearCryptoTestState() {
  localStorage.clear();
  sessionStorage.clear();
  delete window.e2ee;
  delete globalThis.__chaosSecureStorageMemoryV1;
}

describe("crypto-engine frontend safety checks", () => {
  beforeEach(() => {
    clearCryptoTestState();
    vi.stubGlobal("indexedDB", undefined);
  });

  it("migrates legacy private state to secure storage and removes it from localStorage", async () => {
    const bundle = testBundle();
    const sessions = { "device:a:remote:b": { Ns: 1 } };

    localStorage.setItem("cm_device_id:alice", bundle.deviceId);
    localStorage.setItem("cm_device_bundle_v2:alice", JSON.stringify(bundle));
    localStorage.setItem("cm_e2ee_sessions_v5:alice", JSON.stringify(sessions));

    await loadCryptoEngine();

    expect(localStorage.getItem("cm_device_id")).toBe(bundle.deviceId);
    expect(window.e2ee.getLocalDeviceBundle()).toEqual(bundle);
    expect(window.e2ee.__exportSessionStateForTests()).toEqual(sessions);
    expect(window.e2ee.getSecureStorageBackend()).toBe("memory");

    expect(localStorage.getItem("cm_device_bundle_v2")).toBeNull();
    expect(localStorage.getItem("cm_e2ee_sessions_v5")).toBeNull();
    expect(localStorage.getItem("cm_device_id:alice")).toBeNull();
    expect(localStorage.getItem("cm_device_bundle_v2:alice")).toBeNull();
    expect(localStorage.getItem("cm_e2ee_sessions_v5:alice")).toBeNull();
  });

  it("does not overwrite an existing unscoped device id during migration", async () => {
    localStorage.setItem("cm_device_id", "device-current");
    localStorage.setItem("cm_device_id:alice", "device-old");

    await loadCryptoEngine();

    expect(localStorage.getItem("cm_device_id")).toBe("device-current");
    expect(localStorage.getItem("cm_device_id:alice")).toBeNull();
  });

  it("getOrCreateDeviceId creates a stable non-secret device id", async () => {
    await loadCryptoEngine();
    const first = window.e2ee.getOrCreateDeviceId();
    const second = window.e2ee.getOrCreateDeviceId();
    expect(first).toMatch(/^device-/);
    expect(second).toBe(first);
    expect(localStorage.getItem("cm_device_id")).toBe(first);
  });

  it("resetLocalDeviceIdentity removes secure keys, sessions and the old id", async () => {
    await loadCryptoEngine();
    const bundle = testBundle();
    await activateDevice(bundle, { session: true });

    await window.e2ee.resetLocalDeviceIdentity();

    expect(window.e2ee.getLocalDeviceBundle()).toBeNull();
    expect(window.e2ee.__exportSessionStateForTests()).toEqual({});
    expect(localStorage.getItem("cm_device_id")).toBeNull();
    expect(window.e2ee.getOrCreateDeviceId()).toMatch(/^device-/);
    expect(window.e2ee.getOrCreateDeviceId()).not.toBe(bundle.deviceId);
  });

  it("decryptEnvelope fails clearly when the local bundle is missing", async () => {
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
    await activateDevice(bundle);

    const api = vi.fn(async (path) => {
      expect(path).toBe("/api/crypto/resolve-chat-devices/100");
      return { targetDevices: [{ userId: 1, deviceId: bundle.deviceId }] };
    });

    const request = await window.e2ee.buildFanoutRequest(api, 100, "private self secret");
    const selfEnvelope = request.envelopes[0];
    expect(selfEnvelope.messageType).toBe("SELF_WHISPER");

    await window.e2ee.importLocalDeviceBundle({
      ...bundle,
      identity: {
        ...bundle.identity,
        publicKey: bytesToB64(new Uint8Array(32).fill(99)),
      },
    });

    await expect(window.e2ee.decryptEnvelope(selfEnvelope)).resolves.toBe("private self secret");
  });
});

describe("Double Ratchet full protocol cycle", () => {
  let Alice;
  let Bob;

  async function genDevice(deviceId) {
    const identityKey = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
    const signedPreKey = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
    const signingKey = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
    );

    const identityPub = new Uint8Array(await crypto.subtle.exportKey("raw", identityKey.publicKey));
    const identityPriv = new Uint8Array(await crypto.subtle.exportKey("pkcs8", identityKey.privateKey));
    const signedPreKeyPub = new Uint8Array(await crypto.subtle.exportKey("raw", signedPreKey.publicKey));
    const signedPreKeyPriv = new Uint8Array(await crypto.subtle.exportKey("pkcs8", signedPreKey.privateKey));
    const signingPub = new Uint8Array(await crypto.subtle.exportKey("spki", signingKey.publicKey));
    const signingPriv = new Uint8Array(await crypto.subtle.exportKey("pkcs8", signingKey.privateKey));
    const signedPreKeySig = new Uint8Array(await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" }, signingKey.privateKey, signedPreKeyPub
    ));

    return {
      deviceId,
      registrationId: 1,
      identity: { publicKey: bytesToB64(identityPub), privateKeyPkcs8: bytesToB64(identityPriv) },
      signingKey: { publicKeySpki: bytesToB64(signingPub), privateKeyPkcs8: bytesToB64(signingPriv) },
      signedPreKey: {
        preKeyId: 1,
        publicKey: bytesToB64(signedPreKeyPub),
        privateKeyPkcs8: bytesToB64(signedPreKeyPriv),
        signature: bytesToB64(signedPreKeySig),
      },
      oneTimePreKeys: [],
    };
  }

  function makeApi(targetBundle) {
    return vi.fn(async (path) => {
      if (path.includes("resolve-chat-devices")) {
        return {
          targetDevices: [{
            userId: 42,
            deviceId: targetBundle.deviceId,
            identityPublicKey: targetBundle.identity.publicKey,
            signingPublicKey: targetBundle.signingKey.publicKeySpki,
            signedPreKey: targetBundle.signedPreKey,
            oneTimePreKey: null,
          }],
        };
      }
      if (path.includes("reserve-prekey")) {
        return { signedPreKey: null, oneTimePreKey: null };
      }
      return {};
    });
  }

  beforeAll(async () => {
    Alice = await genDevice("device-alice");
    Bob = await genDevice("device-bob");
  }, 30000);

  beforeEach(() => {
    clearCryptoTestState();
    vi.stubGlobal("indexedDB", undefined);
  });

  it("completes a bidirectional X3DH + Double Ratchet cycle", async () => {
    await loadCryptoEngine();

    await activateDevice(Alice);
    const fanout = await window.e2ee.buildFanoutRequest(makeApi(Bob), 100, "hello from alice");
    const env1 = fanout.envelopes[0];
    expect(env1.messageType).toBe("PREKEY_WHISPER");
    const aliceSessions = getSessions();

    await activateDevice(Bob);
    await expect(window.e2ee.decryptEnvelope({ ...env1, senderDeviceId: Alice.deviceId }))
      .resolves.toBe("hello from alice");
    const bobSessions = getSessions();

    await activateDevice(Bob, bobSessions);
    const fanout2 = await window.e2ee.buildFanoutRequest(makeApi(Alice), 100, "hello from bob");
    const env2 = fanout2.envelopes[0];
    expect(env2.messageType).toBe("WHISPER");
    expect(env2.ratchetPublicKey).not.toBe(env1.ratchetPublicKey);

    await activateDevice(Alice, aliceSessions);
    await expect(window.e2ee.decryptEnvelope({ ...env2, senderDeviceId: Bob.deviceId }))
      .resolves.toBe("hello from bob");
  }, 30000);

  it("serializes concurrent sends and never reuses a message index", async () => {
    await loadCryptoEngine();
    await activateDevice(Alice);

    const requests = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        window.e2ee.buildFanoutRequest(makeApi(Bob), 100, `msg-${index}`)
      )
    );
    const indexes = requests.map(request => request.envelopes[0].messageIndex);
    expect(indexes).toEqual([0, 1, 2, 3, 4, 5]);

    await activateDevice(Bob);
    for (let index = 0; index < requests.length; index++) {
      await expect(window.e2ee.decryptEnvelope({
        ...requests[index].envelopes[0],
        senderDeviceId: Alice.deviceId,
      })).resolves.toBe(`msg-${index}`);
    }
  }, 30000);

  it("supports out-of-order delivery through skipped message keys", async () => {
    await loadCryptoEngine();
    await activateDevice(Alice);
    const envelopes = [];
    for (let index = 0; index < 5; index++) {
      const fanout = await window.e2ee.buildFanoutRequest(makeApi(Bob), 100, `msg-${index}`);
      envelopes.push(fanout.envelopes[0]);
    }

    await activateDevice(Bob);
    await expect(window.e2ee.decryptEnvelope({ ...envelopes[0], senderDeviceId: Alice.deviceId }))
      .resolves.toBe("msg-0");
    for (const index of [4, 2, 1, 3]) {
      await expect(window.e2ee.decryptEnvelope({ ...envelopes[index], senderDeviceId: Alice.deviceId }))
        .resolves.toBe(`msg-${index}`);
    }
  }, 30000);

  it("persists verified identity state and blocks unexpected identity key changes", async () => {
    await loadCryptoEngine();
    await activateDevice(Alice);

    await window.e2ee.buildFanoutRequest(makeApi(Bob), 100, "first contact");
    expect(window.e2ee.getRemoteIdentityTrust(Bob.deviceId, Bob.identity.publicKey).trustState)
      .toBe("UNVERIFIED");

    await window.e2ee.verifyRemoteIdentity(Bob.deviceId, Bob.identity.publicKey, "SAFETY_NUMBER");
    expect(window.e2ee.getRemoteIdentityTrust(Bob.deviceId, Bob.identity.publicKey))
      .toEqual(expect.objectContaining({
        trustState: "VERIFIED",
        verificationMethod: "SAFETY_NUMBER",
      }));

    const changedBob = {
      ...Bob,
      identity: { ...Bob.identity, publicKey: bytesToB64(new Uint8Array(32).fill(55)) },
    };
    await expect(window.e2ee.buildFanoutRequest(makeApi(changedBob), 100, "must block"))
      .rejects.toThrow(`IDENTITY_KEY_CHANGED:${Bob.deviceId}`);
  }, 30000);

  it("rejects decryption when the local bundle is missing", async () => {
    await loadCryptoEngine();
    await expect(window.e2ee.decryptEnvelope({
      messageType: "WHISPER", senderDeviceId: "x", ciphertext: "x", nonce: "x",
    })).rejects.toThrow("Local device bundle is missing");
  });

  it("self-whisper works alongside Double Ratchet", async () => {
    await loadCryptoEngine();
    await activateDevice(Alice);
    const api = vi.fn(async (path) => {
      if (path.includes("resolve-chat-devices")) {
        return { targetDevices: [{ userId: 1, deviceId: Alice.deviceId }] };
      }
      return {};
    });
    const fanout = await window.e2ee.buildFanoutRequest(api, 100, "self note");
    expect(fanout.envelopes[0].messageType).toBe("SELF_WHISPER");
    await expect(window.e2ee.decryptEnvelope({
      ...fanout.envelopes[0], senderDeviceId: Alice.deviceId,
    })).resolves.toBe("self note");
  });
});
