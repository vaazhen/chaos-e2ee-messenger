const BACKUP_VERSION = 1;

export async function createEncryptedBackup(passphrase) {
  const e2ee = window.e2ee;
  if (!e2ee) throw new Error('Crypto engine not loaded');

  const identityKeyPair = localStorage.getItem('chaos_identityKeyPair');
  const signingKeyPair = localStorage.getItem('chaos_signingKeyPair');
  const signedPreKey = localStorage.getItem('chaos_signedPreKey');
  const oneTimePreKeys = localStorage.getItem('chaos_oneTimePreKeys');
  const deviceId = localStorage.getItem('chaos_deviceId');
  const registrationId = localStorage.getItem('chaos_registrationId');

  if (!identityKeyPair || !deviceId) {
    throw new Error('No local keys found to backup');
  }

  const plaintext = JSON.stringify({
    version: BACKUP_VERSION,
    deviceId,
    registrationId,
    identityKeyPair,
    signingKeyPair,
    signedPreKey,
    oneTimePreKeys,
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

  localStorage.setItem('chaos_backupRestored', 'true');

  return { deviceId, restored: true };
}
