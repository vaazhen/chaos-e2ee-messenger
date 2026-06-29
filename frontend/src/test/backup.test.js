import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCrypto = {
  getRandomValues: vi.fn((arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
    return arr;
  }),
  randomUUID: vi.fn(() => '00000000-0000-4000-8000-000000000000'),
  subtle: {
    importKey: vi.fn(() => Promise.resolve('mockKey')),
    deriveKey: vi.fn(() => Promise.resolve('mockEncKey')),
    encrypt: vi.fn(() => {
      const buf = new ArrayBuffer(64);
      const view = new Uint8Array(buf);
      for (let i = 0; i < 64; i++) view[i] = i;
      return Promise.resolve(buf);
    }),
    decrypt: vi.fn(() => {
      const plaintext = JSON.stringify({
        version: 1,
        deviceId: 'test-device',
        registrationId: '42',
        identityKeyPair: JSON.stringify({ publicKey: 'id-pub', privateKeyPkcs8: 'id-priv' }),
        signingKeyPair: JSON.stringify({ publicKeySpki: 'sig-pub', privateKeyPkcs8: 'sig-priv' }),
        signedPreKey: JSON.stringify({ preKeyId: 1, publicKey: 'spk-pub', privateKeyPkcs8: 'spk-priv', signature: 'spk-sig' }),
        oneTimePreKeys: JSON.stringify([{ preKeyId: 1000, publicKey: 'otp-pub', privateKeyPkcs8: 'otp-priv' }]),
      });
      return Promise.resolve(new TextEncoder().encode(plaintext));
    }),
    digest: vi.fn(() => {
      const hash = new ArrayBuffer(32);
      const view = new Uint8Array(hash);
      for (let i = 0; i < 32; i++) view[i] = i;
      return Promise.resolve(hash);
    }),
  },
};

const mockBundle = {
  deviceId: 'test-device',
  registrationId: 42,
  identity: { publicKey: 'id-pub', privateKeyPkcs8: 'id-priv' },
  signingKey: { publicKeySpki: 'sig-pub', privateKeyPkcs8: 'sig-priv' },
  signedPreKey: { preKeyId: 1, publicKey: 'spk-pub', privateKeyPkcs8: 'spk-priv', signature: 'spk-sig' },
  oneTimePreKeys: [{ preKeyId: 1000, publicKey: 'otp-pub', privateKeyPkcs8: 'otp-priv' }],
};

beforeEach(() => {
  vi.stubGlobal('crypto', mockCrypto);
  vi.stubGlobal('btoa', vi.fn((s) => Buffer.from(s, 'binary').toString('base64')));
  vi.stubGlobal('atob', vi.fn((s) => Buffer.from(s, 'base64').toString('binary')));
  localStorage.clear();
});

describe('createEncryptedBackup', () => {
  it('throws if crypto engine not loaded', async () => {
    window.e2ee = undefined;
    const mod = await import('../backup');
    await expect(mod.createEncryptedBackup('pass')).rejects.toThrow('Crypto engine not loaded');
  });

  it('throws if no local keys found', async () => {
    window.e2ee = { getLocalDeviceBundle: vi.fn(() => null) };
    const mod = await import('../backup');
    await expect(mod.createEncryptedBackup('pass')).rejects.toThrow('No local keys found');
  });

  it('returns encrypted payload when keys are present', async () => {
    window.e2ee = { getLocalDeviceBundle: vi.fn(() => mockBundle) };

    const mod = await import('../backup');
    const result = await mod.createEncryptedBackup('test-passphrase');

    expect(result).toHaveProperty('encryptedPayload');
    expect(result).toHaveProperty('salt');
    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('checksum');
    expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
    expect(mockCrypto.subtle.deriveKey).toHaveBeenCalled();
    expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
  });
});

describe('decryptBackup', () => {
  it('decrypts and parses backup data', async () => {
    const mod = await import('../backup');
    const result = await mod.decryptBackup(
      Buffer.from('encrypted').toString('base64'),
      Buffer.from('salt123456789012345678901234567890').toString('base64'),
      Buffer.from('iv1234567890').toString('base64'),
      'test-passphrase'
    );

    expect(result).toHaveProperty('version', 1);
    expect(result).toHaveProperty('deviceId', 'test-device');
    expect(result).toHaveProperty('identityKeyPair');
    expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
    expect(mockCrypto.subtle.deriveKey).toHaveBeenCalled();
    expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
  });
});

describe('restoreKeysFromBackup', () => {
  it('restores all keys to localStorage and rebuilds bundle', async () => {
    window.e2ee = { resetLocalDeviceIdentity: vi.fn() };
    const mod = await import('../backup');
    const backupData = {
      deviceId: 'restored-device',
      registrationId: '99',
      identityKeyPair: JSON.stringify({ publicKey: 'id-pub', privateKeyPkcs8: 'id-priv' }),
      signingKeyPair: JSON.stringify({ publicKeySpki: 'sig-pub', privateKeyPkcs8: 'sig-priv' }),
      signedPreKey: JSON.stringify({ preKeyId: 1, publicKey: 'spk-pub', privateKeyPkcs8: 'spk-priv', signature: 'spk-sig' }),
      oneTimePreKeys: JSON.stringify([{ preKeyId: 1000, publicKey: 'otp-pub', privateKeyPkcs8: 'otp-priv' }]),
    };

    const result = await mod.restoreKeysFromBackup(backupData);

    expect(result.restored).toBe(true);
    expect(result.deviceId).toBe('restored-device');
    // chaos_* keys kept for backward compat
    expect(localStorage.getItem('chaos_deviceId')).toBe('restored-device');
    expect(localStorage.getItem('chaos_registrationId')).toBe('99');
    expect(localStorage.getItem('chaos_identityKeyPair')).toBe(backupData.identityKeyPair);
    expect(localStorage.getItem('chaos_backupRestored')).toBe('true');

    // cm_device_bundle_v2 reconstructed
    const savedBundle = JSON.parse(localStorage.getItem('cm_device_bundle_v2'));
    expect(savedBundle.deviceId).toBe('restored-device');
    expect(savedBundle.registrationId).toBe(99);
    expect(savedBundle.identity.publicKey).toBe('id-pub');
    expect(savedBundle.signingKey.publicKeySpki).toBe('sig-pub');
    expect(savedBundle.signedPreKey.preKeyId).toBe(1);
    expect(savedBundle.oneTimePreKeys).toHaveLength(1);

    // cm_device_id set
    expect(localStorage.getItem('cm_device_id')).toBe('restored-device');
  });

  it('handles partial backup data gracefully', async () => {
    const mod = await import('../backup');
    const result = await mod.restoreKeysFromBackup({ deviceId: 'partial-device' });

    expect(result.restored).toBe(true);
    expect(localStorage.getItem('chaos_deviceId')).toBe('partial-device');
    expect(localStorage.getItem('chaos_identityKeyPair')).toBeNull();
    // no bundle reconstruction when identityKeyPair missing
    expect(localStorage.getItem('cm_device_bundle_v2')).toBeNull();
  });
});
