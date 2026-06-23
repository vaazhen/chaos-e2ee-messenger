(function () {
    // ─── UUID helper — works in both secure (https/localhost) and non-secure (http+IP) contexts ───
    function safeUUID() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Chaos Messenger — Crypto Engine v4
    // Protocol: X3DH for session establishment + Double Ratchet for messages
    //
    // Double Ratchet (Signal specification):
    //   DH Ratchet — on every direction change a new X25519 keypair is generated,
    //     a DH exchange is performed, and new root + chain keys are derived.
    //     This provides break-in recovery: a compromised chain key is replaced
    //     after a single round-trip.
    //   Symmetric Ratchet — within each sending/receiving chain:
    //     nextChainKey  = HMAC-SHA256(chainKey, 0x02)
    //     messageKey    = HMAC-SHA256(chainKey, 0x01)
    //   KDF_RK(rootKey, dhOutput) — HKDF-SHA256 with rootKey as salt,
    //     dhOutput as IKM → 64 bytes split into newRootKey + newChainKey.
    // ─────────────────────────────────────────────────────────────────────────

    const DEVICE_KEY_PREFIX    = 'cm_device_bundle_v2';
    const SESSION_KEY_PREFIX   = 'cm_e2ee_sessions_v5';
    const DEVICE_ID_KEY_PREFIX = 'cm_device_id';
    const MAX_SKIP             = 2000;
    const MAX_STORED_SKIPPED_KEYS = 4000;

    let registrationPromise = null;
    let registrationPromiseUsername = null;

    // ─── Base64 utilities ───────────────────────────────────────────────────────

    function b64ToBytes(base64) {
        return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    }

    function bytesToB64(bytes) {
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary);
    }

    function b64UrlToText(base64Url) {
        try {
            const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
            return atob(padded);
        } catch (_) { return ''; }
    }

    function b64ToArrayBuffer(base64) {
        const bytes = b64ToBytes(base64);
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }

    // ─── JWT username (used only for registrationPromise scoping) ─────────────

    function getCurrentUsername() {
        const token = localStorage.getItem('cm_token') || '';
        const parts = token.split('.');
        if (parts.length < 2) return 'anonymous';
        const raw = b64UrlToText(parts[1]);
        if (!raw) return 'anonymous';
        try { return JSON.parse(raw)?.sub || 'anonymous'; } catch (_) { return 'anonymous'; }
    }

    function assertWebCryptoAvailable() {
        if (typeof crypto === 'undefined' || !crypto.subtle) {
            throw new Error('E2EE crypto is unavailable. Open the app via HTTPS or localhost. Mobile browsers usually block WebCrypto on plain http://LAN IP.');
        }
    }

    // ─── One-time migration: move username-scoped keys to unscoped ────────────
    function migrateUsernameScoped() {
        const username = getCurrentUsername();
        if (!username || username === 'anonymous') return;
        [DEVICE_KEY_PREFIX, SESSION_KEY_PREFIX, DEVICE_ID_KEY_PREFIX].forEach(prefix => {
            const oldKey = `${prefix}:${username}`;
            const val = localStorage.getItem(oldKey);
            if (val !== null) {
                if (localStorage.getItem(prefix) === null) {
                    localStorage.setItem(prefix, val);
                }
                localStorage.removeItem(oldKey);
            }
        });
    }
    migrateUsernameScoped();

    // ─── WebCrypto wrappers ───────────────────────────────────────────────────

    async function exportRawPublicKey(publicKey) {
        assertWebCryptoAvailable();
        const raw = await crypto.subtle.exportKey('raw', publicKey);
        return bytesToB64(new Uint8Array(raw));
    }

    async function exportPkcs8PrivateKey(privateKey) {
        assertWebCryptoAvailable();
        const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);
        return bytesToB64(new Uint8Array(pkcs8));
    }

    async function importRawPublicKey(base64) {
        assertWebCryptoAvailable();
        const raw = b64ToBytes(base64);
        return crypto.subtle.importKey('raw', raw, { name: 'X25519' }, true, []);
    }

    async function importPkcs8PrivateKey(base64) {
        assertWebCryptoAvailable();
        const pkcs8 = b64ToBytes(base64);
        return crypto.subtle.importKey('pkcs8', pkcs8, { name: 'X25519' }, true, ['deriveBits']);
    }

    async function generateX25519KeyPair() {
        assertWebCryptoAvailable();
        return crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']);
    }

    async function derive32(privateKey, publicKey) {
        assertWebCryptoAvailable();
        const bits = await crypto.subtle.deriveBits({ name: 'X25519', public: publicKey }, privateKey, 256);
        return new Uint8Array(bits);
    }

    // ─── KDF functions ────────────────────────────────────────────────────────

    async function deriveInitialRootAndChainKey(inputKeyMaterial) {
        assertWebCryptoAvailable();
        const salt = new Uint8Array(32);
        const baseKey = await crypto.subtle.importKey('raw', inputKeyMaterial, { name: 'HKDF' }, false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('ChaosMessengerX3DH') },
            baseKey, 512
        );
        const arr = new Uint8Array(bits);
        return { rootKey: arr.slice(0, 32), chainKey: arr.slice(32, 64) };
    }

    async function kdfRK(rootKeyBytes, dhOutputBytes) {
        assertWebCryptoAvailable();
        const baseKey = await crypto.subtle.importKey('raw', dhOutputBytes, { name: 'HKDF' }, false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt: rootKeyBytes, info: new TextEncoder().encode('ChaosDoubleRatchet') },
            baseKey, 512
        );
        const arr = new Uint8Array(bits);
        return { rootKey: arr.slice(0, 32), chainKey: arr.slice(32, 64) };
    }

    async function ratchetStep(chainKeyBytes) {
        assertWebCryptoAvailable();
        const key = await crypto.subtle.importKey('raw', chainKeyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const mkBits = new Uint8Array(await crypto.subtle.sign('HMAC', key, new Uint8Array([0x01])));
        const ckBits = new Uint8Array(await crypto.subtle.sign('HMAC', key, new Uint8Array([0x02])));
        return { messageKeyRaw: mkBits, nextChainKey: ckBits };
    }

    async function importMessageKey(rawBytes) {
        assertWebCryptoAvailable();
        return crypto.subtle.importKey('raw', rawBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }

    // ─── AES-GCM encrypt / decrypt ───────────────────────────────────────────

    async function aesEncryptWithKey(plainText, aesKey) {
        assertWebCryptoAvailable();
        const nonce = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(plainText);
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, encoded);
        return { ciphertext: bytesToB64(new Uint8Array(ct)), nonce: bytesToB64(nonce) };
    }

    async function aesDecryptWithKey(ciphertextB64, nonceB64, aesKey) {
        assertWebCryptoAvailable();
        const ct    = b64ToBytes(ciphertextB64);
        const nonce = b64ToBytes(nonceB64);
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aesKey, ct);
        return new TextDecoder().decode(plain);
    }

    // ─── Self-envelope encryption (for cross-device sync) ─────────────────────

    async function deriveSelfEnvelopeKey(localBundle) {
        assertWebCryptoAvailable();
        if (!localBundle?.identity?.privateKeyPkcs8) {
            throw new Error('Local private identity key is missing');
        }
        const identityPrivate = await importPkcs8PrivateKey(localBundle.identity.privateKeyPkcs8);
        const identityPublic = await importRawPublicKey(localBundle.identity.publicKey);
        const seed = await crypto.subtle.deriveBits(
            { name: 'X25519', public: identityPublic },
            identityPrivate, 256
        );
        const saltInput = new TextEncoder().encode(localBundle.deviceId || 'unknown-device');
        const salt = new Uint8Array(await crypto.subtle.digest('SHA-256', saltInput));
        const hkdfKey = await crypto.subtle.importKey('raw', seed, { name: 'HKDF' }, false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('ChaosMessengerSelf:v2') },
            hkdfKey, 256
        );
        return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }

    async function deriveLegacySelfEnvelopeKey(localBundle) {
        assertWebCryptoAvailable();
        const raw = b64ToBytes(localBundle.identity.publicKey);
        const hkdfKey = await crypto.subtle.importKey('raw', raw, { name: 'HKDF' }, false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('ChaosMessengerSelf') },
            hkdfKey, 256
        );
        return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }

    async function encryptSelfEnvelope(localBundle, plainText) {
        const key = await deriveSelfEnvelopeKey(localBundle);
        return aesEncryptWithKey(plainText, key);
    }

    async function decryptSelfEnvelope(localBundle, envelope) {
        const key = await deriveSelfEnvelopeKey(localBundle);
        try {
            return await aesDecryptWithKey(envelope.ciphertext, envelope.nonce, key);
        } catch (_) {
            const legacyKey = await deriveLegacySelfEnvelopeKey(localBundle);
            return aesDecryptWithKey(envelope.ciphertext, envelope.nonce, legacyKey);
        }
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    function getOrCreateDeviceId() {
        let id = localStorage.getItem(DEVICE_ID_KEY_PREFIX);
        if (!id) { id = 'device-' + safeUUID(); localStorage.setItem(DEVICE_ID_KEY_PREFIX, id); }
        return id;
    }

    function randomRegistrationId() {
        const bytes = new Uint32Array(1); crypto.getRandomValues(bytes); return bytes[0] & 0x7fffffff;
    }

    function loadJson(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function saveJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getLocalDeviceBundle() { return loadJson(DEVICE_KEY_PREFIX); }
    function loadSessions()         { return loadJson(SESSION_KEY_PREFIX) || {}; }
    function saveSessions(sessions) { saveJson(SESSION_KEY_PREFIX, sessions); }

    function resetLocalDeviceIdentity() {
        localStorage.removeItem(DEVICE_KEY_PREFIX);
        localStorage.removeItem(SESSION_KEY_PREFIX);
        localStorage.removeItem(DEVICE_ID_KEY_PREFIX);
        registrationPromise = null;
        registrationPromiseUsername = null;
        log('[E2EE] Local device identity reset');
    }

    function sessionKey(localDeviceId, remoteDeviceId) {
        return `device:${localDeviceId}:remote:${remoteDeviceId}`;
    }

    function getSession(localDeviceId, remoteDeviceId) {
        return loadSessions()[sessionKey(localDeviceId, remoteDeviceId)] || null;
    }

    function storeSession(localDeviceId, remoteDeviceId, session) {
        const sessions = loadSessions();
        sessions[sessionKey(localDeviceId, remoteDeviceId)] = session;
        saveSessions(sessions);
    }

    // ─── Device bundle generation and registration ───────────────────────────

    async function buildNewDeviceBundle() {
        const deviceId = 'device-' + safeUUID();
        localStorage.setItem(DEVICE_ID_KEY_PREFIX, deviceId);
        log('[E2EE] New deviceId:', deviceId);
        const registrationId = randomRegistrationId();
        const identity = await generateX25519KeyPair();
        const signedPreKey = await generateX25519KeyPair();
        const oneTimePreKeys = [];
        for (let i = 0; i < 50; i++) {
            const kp = await generateX25519KeyPair();
            oneTimePreKeys.push({
                preKeyId: 1000 + i,
                publicKey: await exportRawPublicKey(kp.publicKey),
                privateKeyPkcs8: await exportPkcs8PrivateKey(kp.privateKey)
            });
        }
        const signedPreKeyPublic  = await exportRawPublicKey(signedPreKey.publicKey);
        const identityPrivate     = await exportPkcs8PrivateKey(identity.privateKey);
        const identityPublic      = await exportRawPublicKey(identity.publicKey);

        const signingKeyPair = await crypto.subtle.generateKey(
            { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
        );
        const signingPublicKeySpki = await crypto.subtle.exportKey('spki', signingKeyPair.publicKey);
        const signingPublicKey     = bytesToB64(new Uint8Array(signingPublicKeySpki));
        const signingPrivateKeyPkcs8Raw = await crypto.subtle.exportKey('pkcs8', signingKeyPair.privateKey);
        const signingPrivateKeyPkcs8    = bytesToB64(new Uint8Array(signingPrivateKeyPkcs8Raw));

        const signedPreKeyBytes = b64ToBytes(signedPreKeyPublic);
        const signatureBuf = await crypto.subtle.sign(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            signingKeyPair.privateKey,
            signedPreKeyBytes
        );
        const signedPreKeySignature = bytesToB64(new Uint8Array(signatureBuf));

        return {
            deviceId, registrationId,
            identity: { publicKey: identityPublic, privateKeyPkcs8: identityPrivate },
            signingKey: { publicKeySpki: signingPublicKey, privateKeyPkcs8: signingPrivateKeyPkcs8 },
            signedPreKey: {
                preKeyId: 1,
                publicKey: signedPreKeyPublic,
                privateKeyPkcs8: await exportPkcs8PrivateKey(signedPreKey.privateKey),
                signature: signedPreKeySignature
            },
            oneTimePreKeys
        };
    }

    function log(...args) {
        console.log('[ChaosMessenger]', ...args);
    }

    async function registerBundleOnServer(api, bundle, isNewDevice = false) {
        const body = {
            deviceId: bundle.deviceId,
            deviceName: navigator.userAgent,
            registrationId: bundle.registrationId,
            identityPublicKey: bundle.identity.publicKey,
            signingPublicKey: bundle.signingKey?.publicKeySpki || null,
            signedPreKey: {
                preKeyId: bundle.signedPreKey.preKeyId,
                publicKey: bundle.signedPreKey.publicKey,
                signature: bundle.signedPreKey.signature
            },
            oneTimePreKeys: isNewDevice
                ? bundle.oneTimePreKeys.map(k => ({ preKeyId: k.preKeyId, publicKey: k.publicKey }))
                : []
        };
        log('[E2EE] registerBundleOnServer isNew=' + isNewDevice, 'deviceId=' + bundle.deviceId);
        await api('/api/crypto/devices/register', { method: 'POST', body: JSON.stringify(body) });
    }

    async function ensureDeviceRegistered(api) {
        const username = getCurrentUsername();
        const canRegister = !!(api && (api.__canRegisterDevice || api.canRegisterDevice));

        if (registrationPromise && registrationPromiseUsername === username) return registrationPromise;
        registrationPromiseUsername = username;

        registrationPromise = (async () => {
            let bundle = getLocalDeviceBundle();
            let shouldUploadOneTimeKeys = false;

            if (!bundle) {
                log('[E2EE] New device — generating keys');
                bundle = await buildNewDeviceBundle();
                saveJson(DEVICE_KEY_PREFIX, bundle);
                shouldUploadOneTimeKeys = true;
            } else if (!bundle?.signingKey?.publicKeySpki) {
                log('[E2EE] Legacy bundle without signingKey detected — recreating device');
                localStorage.removeItem(DEVICE_KEY_PREFIX);
                localStorage.removeItem(SESSION_KEY_PREFIX);
                bundle = await buildNewDeviceBundle();
                saveJson(DEVICE_KEY_PREFIX, bundle);
                shouldUploadOneTimeKeys = true;
            }

            if (shouldUploadOneTimeKeys || canRegister) {
                await registerBundleOnServer(api, bundle, true);
            } else {
                log('[E2EE] Existing device detected, skipping re-registration:', bundle.deviceId);
            }
            return bundle;
        })().catch((err) => {
            registrationPromise = null;
            registrationPromiseUsername = null;
            throw err;
        });
        return registrationPromise;
    }

    // ─── Signed prekey verification ──────────────────────────────────────────

    async function verifySignedPreKeySignature(signingPublicKeyB64, signedPreKeyPublicB64, signatureB64) {
        if (!signingPublicKeyB64 || !signedPreKeyPublicB64 || !signatureB64) {
            throw new Error('Target device signed prekey bundle is incomplete');
        }
        assertWebCryptoAvailable();
        const signingKey = await crypto.subtle.importKey(
            'spki',
            b64ToArrayBuffer(signingPublicKeyB64),
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['verify']
        );
        const verified = await crypto.subtle.verify(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            signingKey,
            b64ToBytes(signatureB64),
            b64ToBytes(signedPreKeyPublicB64)
        );
        if (!verified) {
            throw new Error('Invalid signed prekey signature');
        }
    }

    // ─── Helper: serialize/deserialize DH ratchet keypair ────────────────────

    async function exportDHKeyPair(keyPair) {
        return {
            publicKey: await exportRawPublicKey(keyPair.publicKey),
            privateKeyPkcs8: await exportPkcs8PrivateKey(keyPair.privateKey)
        };
    }

    // ─── X3DH + Double Ratchet session establishment (initiator) ─────────────

    async function createInitiatorSession(localBundle, targetDevice) {
        await verifySignedPreKeySignature(
            targetDevice.signingPublicKey,
            targetDevice.signedPreKey?.publicKey,
            targetDevice.signedPreKey?.signature
        );

        const identityPrivate       = await importPkcs8PrivateKey(localBundle.identity.privateKeyPkcs8);
        const ephemeral             = await generateX25519KeyPair();
        const ephemeralPublicKey    = await exportRawPublicKey(ephemeral.publicKey);
        const remoteIdentityPub     = await importRawPublicKey(targetDevice.identityPublicKey);
        const remoteSignedPreKeyPub = await importRawPublicKey(targetDevice.signedPreKey.publicKey);

        // X3DH DH calculations
        const dh1 = await derive32(identityPrivate, remoteSignedPreKeyPub);
        const dh2 = await derive32(ephemeral.privateKey, remoteIdentityPub);
        const dh3 = await derive32(ephemeral.privateKey, remoteSignedPreKeyPub);

        let combined;
        if (targetDevice.oneTimePreKey?.publicKey) {
            const remoteOneTimePub = await importRawPublicKey(targetDevice.oneTimePreKey.publicKey);
            const dh4 = await derive32(ephemeral.privateKey, remoteOneTimePub);
            combined = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
            combined.set(dh1, 0); combined.set(dh2, dh1.length);
            combined.set(dh3, dh1.length + dh2.length); combined.set(dh4, dh1.length + dh2.length + dh3.length);
        } else {
            combined = new Uint8Array(dh1.length + dh2.length + dh3.length);
            combined.set(dh1, 0); combined.set(dh2, dh1.length); combined.set(dh3, dh1.length + dh2.length);
        }

        const initial = await deriveInitialRootAndChainKey(combined);
        const SK = initial.rootKey;

        // Double Ratchet initialization (initiator / Alice role):
        // Generate first DH ratchet keypair, use recipient's signed prekey as DHr.
        const DHs = await generateX25519KeyPair();
        const DHsExported = await exportDHKeyPair(DHs);
        const DHr = targetDevice.signedPreKey.publicKey;

        const remoteSignedPub = await importRawPublicKey(DHr);
        const dhResult = await derive32(DHs.privateKey, remoteSignedPub);
        const { rootKey, chainKey: CKs } = await kdfRK(SK, dhResult);

        const session = {
            localDeviceId: localBundle.deviceId,
            remoteDeviceId: targetDevice.deviceId,
            RK: bytesToB64(rootKey),
            DHs: DHsExported,
            DHr: DHr,
            CKs: bytesToB64(CKs),
            CKr: null,
            Ns: 0,
            Nr: 0,
            PN: 0,
            MKSKIPPED: {},
            senderIdentityPublicKey: localBundle.identity.publicKey,
            _ephemeralPublicKey: ephemeralPublicKey,
            establishedAt: Date.now(),
            version: 4
        };

        storeSession(localBundle.deviceId, targetDevice.deviceId, session);
        return { session, ephemeralPublicKey };
    }

    // ─── X3DH + Double Ratchet session establishment (recipient) ─────────────

    async function bootstrapRecipientSession(localBundle, envelope) {
        const identityPrivate      = await importPkcs8PrivateKey(localBundle.identity.privateKeyPkcs8);
        const signedPreKeyPrivate  = await importPkcs8PrivateKey(localBundle.signedPreKey.privateKeyPkcs8);
        const senderIdentityPub    = await importRawPublicKey(envelope.senderIdentityPublicKey);
        const ephemeralPub         = await importRawPublicKey(envelope.ephemeralPublicKey);

        // X3DH DH calculations (recipient / Bob role)
        const dh1 = await derive32(signedPreKeyPrivate, senderIdentityPub);
        const dh2 = await derive32(identityPrivate, ephemeralPub);
        const dh3 = await derive32(signedPreKeyPrivate, ephemeralPub);

        let combined;
        if (envelope.oneTimePreKeyId != null) {
            const oneTime = localBundle.oneTimePreKeys.find(k => k.preKeyId === envelope.oneTimePreKeyId);
            if (!oneTime) throw new Error('One-time prekey not found locally: ' + envelope.oneTimePreKeyId);
            const oneTimePrivate = await importPkcs8PrivateKey(oneTime.privateKeyPkcs8);
            const dh4 = await derive32(oneTimePrivate, ephemeralPub);
            combined = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
            combined.set(dh1, 0); combined.set(dh2, dh1.length);
            combined.set(dh3, dh1.length + dh2.length); combined.set(dh4, dh1.length + dh2.length + dh3.length);
        } else {
            combined = new Uint8Array(dh1.length + dh2.length + dh3.length);
            combined.set(dh1, 0); combined.set(dh2, dh1.length); combined.set(dh3, dh1.length + dh2.length);
        }

        const initial = await deriveInitialRootAndChainKey(combined);
        const SK = initial.rootKey;

        // Double Ratchet initialization (recipient / Bob role):
        // DHs = signed prekey pair; DHr is unknown until first message arrives.
        // The first decryptWithDoubleRatchet call will perform the DH ratchet step.
        const session = {
            localDeviceId: localBundle.deviceId,
            remoteDeviceId: envelope.senderDeviceId,
            RK: bytesToB64(SK),
            DHs: {
                publicKey: localBundle.signedPreKey.publicKey,
                privateKeyPkcs8: localBundle.signedPreKey.privateKeyPkcs8
            },
            DHr: null,
            CKs: null,
            CKr: null,
            Ns: 0,
            Nr: 0,
            PN: 0,
            MKSKIPPED: {},
            senderIdentityPublicKey: envelope.senderIdentityPublicKey,
            establishedAt: Date.now(),
            version: 4
        };

        storeSession(localBundle.deviceId, envelope.senderDeviceId, session);
        return session;
    }

    // ─── Double Ratchet core ─────────────────────────────────────────────────

    function skippedKeyId(dhPub, n) {
        return dhPub + ':' + n;
    }

    async function trySkippedMessageKeys(session, envelope) {
        const kid = skippedKeyId(envelope.ratchetPublicKey, envelope.messageIndex ?? 0);
        const mkRawB64 = session.MKSKIPPED[kid];
        if (!mkRawB64) return null;
        delete session.MKSKIPPED[kid];
        const mk = await importMessageKey(b64ToBytes(mkRawB64));
        return aesDecryptWithKey(envelope.ciphertext, envelope.nonce, mk);
    }

    async function skipMessageKeys(session, until) {
        if (session.CKr == null) return;
        if ((until - (session.Nr || 0)) > MAX_SKIP) {
            throw new Error('Too many skipped messages: ' + (until - (session.Nr || 0)));
        }
        let ckBytes = b64ToBytes(session.CKr);
        let nr = session.Nr || 0;
        while (nr < until) {
            const { messageKeyRaw, nextChainKey } = await ratchetStep(ckBytes);
            session.MKSKIPPED[skippedKeyId(session.DHr, nr)] = bytesToB64(messageKeyRaw);
            ckBytes = nextChainKey;
            nr++;
        }
        session.CKr = bytesToB64(ckBytes);
        session.Nr = nr;
        pruneSkippedKeys(session);
    }

    function pruneSkippedKeys(session) {
        const keys = Object.keys(session.MKSKIPPED);
        if (keys.length > MAX_STORED_SKIPPED_KEYS) {
            const sorted = keys.sort((a, b) => {
                const idxA = parseInt(a.split(':')[1] || '0', 10);
                const idxB = parseInt(b.split(':')[1] || '0', 10);
                return idxA - idxB;
            });
            for (let i = 0; i < (keys.length - MAX_STORED_SKIPPED_KEYS); i++) {
                delete session.MKSKIPPED[sorted[i]];
            }
        }
    }

    async function dhRatchetStep(session, newDHrPub) {
        session.PN = session.Ns;
        session.Ns = 0;
        session.Nr = 0;
        session.DHr = newDHrPub;

        // Derive new receiving chain
        const dhsPrivate = await importPkcs8PrivateKey(session.DHs.privateKeyPkcs8);
        const dhrPublic = await importRawPublicKey(session.DHr);
        const dhResult1 = await derive32(dhsPrivate, dhrPublic);
        const kdf1 = await kdfRK(b64ToBytes(session.RK), dhResult1);
        session.RK = bytesToB64(kdf1.rootKey);
        session.CKr = bytesToB64(kdf1.chainKey);

        // Generate new sending keypair and derive new sending chain
        const newDHs = await generateX25519KeyPair();
        session.DHs = await exportDHKeyPair(newDHs);
        const dhResult2 = await derive32(newDHs.privateKey, dhrPublic);
        const kdf2 = await kdfRK(b64ToBytes(session.RK), dhResult2);
        session.RK = bytesToB64(kdf2.rootKey);
        session.CKs = bytesToB64(kdf2.chainKey);
    }

    async function encryptWithDoubleRatchet(session, plainText) {
        if (!session.CKs) {
            throw new Error('Sending chain not initialized');
        }

        const ckBytes = b64ToBytes(session.CKs);
        const { messageKeyRaw, nextChainKey } = await ratchetStep(ckBytes);
        const messageIndex = session.Ns;

        const mk = await importMessageKey(messageKeyRaw);
        const encrypted = await aesEncryptWithKey(plainText, mk);

        session.CKs = bytesToB64(nextChainKey);
        session.Ns = (session.Ns || 0) + 1;

        return {
            encrypted,
            messageIndex,
            ratchetPublicKey: session.DHs.publicKey,
            previousChainLength: session.PN || 0
        };
    }

    async function decryptWithDoubleRatchet(session, envelope) {
        session.MKSKIPPED = session.MKSKIPPED || {};
        const ratchetPub = envelope.ratchetPublicKey;
        const msgIdx = envelope.messageIndex ?? 0;

        // 1. Try previously stored skipped message keys
        const skippedResult = await trySkippedMessageKeys(session, envelope);
        if (skippedResult !== null) return skippedResult;

        // 2. If new DH ratchet public key, perform DH ratchet
        if (ratchetPub && ratchetPub !== session.DHr) {
            await skipMessageKeys(session, envelope.previousChainLength ?? 0);
            await dhRatchetStep(session, ratchetPub);
        }

        // 3. Skip to the correct message index in the receiving chain
        if (session.CKr == null) {
            throw new Error('Receiving chain not initialized for device ' + (envelope.senderDeviceId || '?'));
        }

        await skipMessageKeys(session, msgIdx);

        // 4. Derive the message key for this index (check skipped keys first)
        const ckBytes = b64ToBytes(session.CKr);
        const { messageKeyRaw, nextChainKey } = await ratchetStep(ckBytes);

        const mk = await importMessageKey(messageKeyRaw);
        const plainText = await aesDecryptWithKey(envelope.ciphertext, envelope.nonce, mk);

        session.CKr = bytesToB64(nextChainKey);
        session.Nr = (session.Nr || 0) + 1;
        return plainText;
    }

    // ─── Fanout (send to chat) ─────────────────────────────────────────────────

    async function buildFanoutRequest(api, chatId, plainText) {
        const localBundle = await ensureDeviceRegistered(api);
        const resolved = await api('/api/crypto/resolve-chat-devices/' + encodeURIComponent(chatId), { method: 'POST' });

        const envelopes = [];
        const uniqueTargets = new Map();
        for (const dev of (resolved.targetDevices || [])) {
            if (dev?.deviceId && !uniqueTargets.has(dev.deviceId)) {
                uniqueTargets.set(dev.deviceId, dev);
            }
        }

        for (const targetDevice of uniqueTargets.values()) {
            if (targetDevice.deviceId === localBundle.deviceId) {
                const encrypted = await encryptSelfEnvelope(localBundle, plainText);
                envelopes.push({
                    targetDeviceId: targetDevice.deviceId,
                    targetUserId: targetDevice.userId,
                    messageType: 'SELF_WHISPER',
                    senderIdentityPublicKey: localBundle.identity.publicKey,
                    ephemeralPublicKey: null,
                    ratchetPublicKey: null,
                    previousChainLength: null,
                    ciphertext: encrypted.ciphertext,
                    nonce: encrypted.nonce,
                    messageIndex: null,
                    signedPreKeyId: null,
                    oneTimePreKeyId: null,
                    timestamp: Date.now()
                });
                continue;
            }

            let session = getSession(localBundle.deviceId, targetDevice.deviceId);
            let ephemeralPublicKey = null;
            let isNewSession = false;
            let resolvedSignedPreKey = targetDevice.signedPreKey || null;
            let resolvedOneTimePreKey = null;

            if (!session || session.version !== 4) {
                const reserved = await api(
                    '/api/crypto/chats/' + encodeURIComponent(chatId) + '/devices/' + encodeURIComponent(targetDevice.deviceId) + '/reserve-prekey',
                    { method: 'POST' }
                );
                resolvedSignedPreKey = reserved?.signedPreKey || targetDevice.signedPreKey || null;
                resolvedOneTimePreKey = reserved?.oneTimePreKey || null;
                const created = await createInitiatorSession(localBundle, {
                    ...targetDevice,
                    signedPreKey: resolvedSignedPreKey,
                    oneTimePreKey: resolvedOneTimePreKey,
                });
                session = created.session;
                ephemeralPublicKey = created.ephemeralPublicKey;
                isNewSession = true;
            }

            const { encrypted, messageIndex, ratchetPublicKey, previousChainLength } =
                await encryptWithDoubleRatchet(session, plainText);
            storeSession(localBundle.deviceId, targetDevice.deviceId, session);

            envelopes.push({
                targetDeviceId: targetDevice.deviceId,
                targetUserId: targetDevice.userId,
                messageType: isNewSession ? 'PREKEY_WHISPER' : 'WHISPER',
                senderIdentityPublicKey: localBundle.identity.publicKey,
                ephemeralPublicKey: isNewSession ? ephemeralPublicKey : null,
                ratchetPublicKey,
                previousChainLength,
                ciphertext: encrypted.ciphertext,
                nonce: encrypted.nonce,
                messageIndex,
                signedPreKeyId: isNewSession && resolvedSignedPreKey ? resolvedSignedPreKey.preKeyId : null,
                oneTimePreKeyId: isNewSession && resolvedOneTimePreKey ? resolvedOneTimePreKey.preKeyId : null,
                timestamp: Date.now()
            });
        }

        return {
            chatId,
            clientMessageId: safeUUID(),
            senderDeviceId: localBundle.deviceId,
            envelopes
        };
    }

    // ─── Decrypt an incoming envelope ─────────────────────────────────────────

    async function decryptEnvelope(envelope) {
        const localBundle = getLocalDeviceBundle();
        if (!localBundle) throw new Error('Local device bundle is missing');

        log('[decrypt] senderDeviceId=' + envelope.senderDeviceId + ' messageType=' + envelope.messageType + ' messageIndex=' + envelope.messageIndex);

        if (envelope.messageType === 'SELF_WHISPER') {
            return decryptSelfEnvelope(localBundle, envelope);
        }

        let session = getSession(localBundle.deviceId, envelope.senderDeviceId);

        if (envelope.messageType === 'PREKEY_WHISPER') {
            log('[decrypt] Bootstrap X3DH + Double Ratchet session with', envelope.senderDeviceId);
            await bootstrapRecipientSession(localBundle, envelope);
            session = getSession(localBundle.deviceId, envelope.senderDeviceId);
        }

        if (!session) {
            throw new Error('No session for device ' + envelope.senderDeviceId);
        }

        if (session.version !== 4) {
            throw new Error('Session version mismatch (expected 4, got ' + session.version + ') — re-establish session');
        }

        const plainText = await decryptWithDoubleRatchet(session, envelope);
        storeSession(localBundle.deviceId, envelope.senderDeviceId, session);

        log('[decrypt] OK messageIndex=' + envelope.messageIndex);
        return plainText;
    }

    // ─── File encryption / decryption (AES-256-GCM with random key) ────────────

    async function encryptFile(fileArrayBuffer) {
        assertWebCryptoAvailable();
        const key = crypto.getRandomValues(new Uint8Array(32));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const cryptoKey = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
        const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, fileArrayBuffer);
        const result = new Uint8Array(iv.length + encrypted.byteLength);
        result.set(iv, 0);
        result.set(new Uint8Array(encrypted), iv.length);
        return { encrypted: result, fileKey: btoa(String.fromCharCode(...key)) };
    }

    async function decryptFile(encryptedArrayBuffer, fileKeyBase64) {
        assertWebCryptoAvailable();
        const keyBytes = Uint8Array.from(atob(fileKeyBase64), c => c.charCodeAt(0));
        const data = new Uint8Array(encryptedArrayBuffer);
        const iv = data.slice(0, 12);
        const ciphertext = data.slice(12);
        const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ciphertext);
        return decrypted;
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    window.e2ee = {
        getOrCreateDeviceId,
        getLocalDeviceBundle,
        resetLocalDeviceIdentity,
        ensureDeviceRegistered,
        buildFanoutRequest,
        decryptEnvelope,
        encryptFile,
        decryptFile
    };

})();
