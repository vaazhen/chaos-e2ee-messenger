const BACKUP_VERSION = 1;
const DEVICE_KEY_PREFIX = 'cm_device_bundle_v2';
const SESSION_KEY_PREFIX = 'cm_e2ee_sessions_v5';
const DEVICE_ID_KEY_PREFIX = 'cm_device_id';

export async function createEncryptedBackup(passphrase) {
  const e2ee = window.e2ee;
  if (!e2ee) throw new Error('Crypto engine not loaded');

  const bundle = e2ee.getLocalDeviceBundle();
  if (!bundle || !bundle.deviceId || !bundle.identity) {
    throw new Error('No local keys found to backup');
  }

  const plaintext = JSON.stringify({
    version: BACKUP_VERSION,
    deviceId: bundle.deviceId,
    registrationId: String(bundle.registrationId),
    identityKeyPair: JSON.stringify(bundle.identity),
    signingKeyPair: bundle.signingKey ? JSON.stringify(bundle.signingKey) : null,
    signedPreKey: bundle.signedPreKey ? JSON.stringify(bundle.signedPreKey) : null,
    oneTimePreKeys: bundle.oneTimePreKeys ? JSON.stringify(bundle.oneTimePreKeys) : null,
    createdAt: new Date().toISOString(),
  });

  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    new TextEncoder().encode(plaintext)
  );

  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encryptedBase64));
  const checksum = btoa(String.fromCharCode(...new Uint8Array(hash)));

  return {
    encryptedPayload: encryptedBase64,
    salt: saltBase64,
    iv: ivBase64,
    checksum,
  };
}

export async function decryptBackup(encryptedPayload, salt, iv, passphrase) {
  const encryptedBytes = Uint8Array.from(atob(encryptedPayload), (c) => c.charCodeAt(0));
  const saltBytes = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    encryptionKey,
    encryptedBytes
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}

export async function restoreKeysFromBackup(backupData) {
  const { deviceId, registrationId, identityKeyPair, signingKeyPair, signedPreKey, oneTimePreKeys } = backupData;

  if (deviceId) localStorage.setItem('chaos_deviceId', deviceId);
  if (registrationId) localStorage.setItem('chaos_registrationId', registrationId);
  if (identityKeyPair) localStorage.setItem('chaos_identityKeyPair', identityKeyPair);
  if (signingKeyPair) localStorage.setItem('chaos_signingKeyPair', signingKeyPair);
  if (signedPreKey) localStorage.setItem('chaos_signedPreKey', signedPreKey);
  if (oneTimePreKeys) localStorage.setItem('chaos_oneTimePreKeys', oneTimePreKeys);

  // Reconstruct the crypto engine bundle so restored keys actually take effect
  if (deviceId && identityKeyPair) {
    try {
      const bundle = {
        deviceId,
        registrationId: Number(registrationId) || 0,
        identity: JSON.parse(identityKeyPair),
        signingKey: signingKeyPair ? JSON.parse(signingKeyPair) : null,
        signedPreKey: signedPreKey ? JSON.parse(signedPreKey) : null,
        oneTimePreKeys: oneTimePreKeys ? JSON.parse(oneTimePreKeys) : [],
      };
      localStorage.setItem(DEVICE_KEY_PREFIX, JSON.stringify(bundle));
      localStorage.setItem(DEVICE_ID_KEY_PREFIX, deviceId);
      // Clear sessions — they are tied to the old device identity
      localStorage.removeItem(SESSION_KEY_PREFIX);
      // Reset crypto engine registration state so it re-registers
      if (window.e2ee) {
        window.e2ee.resetLocalDeviceIdentity();
        // Re-save the bundle after reset cleared it
        localStorage.setItem(DEVICE_KEY_PREFIX, JSON.stringify(bundle));
        localStorage.setItem(DEVICE_ID_KEY_PREFIX, deviceId);
      }
    } catch (_) {
      // If JSON parse fails, just keep chaos_* keys for manual recovery
    }
  }

  localStorage.setItem('chaos_backupRestored', 'true');

  return { deviceId, restored: true };
}
