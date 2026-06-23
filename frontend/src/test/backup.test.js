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
        identityKeyPair: 'id-key',
        signingKeyPair: 'sig-key',
        signedPreKey: 'spk',
        oneTimePreKeys: 'otp',
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
    window.e2ee = { getOrCreateDeviceId: vi.fn() };
    const mod = await import('../backup');
    await expect(mod.createEncryptedBackup('pass')).rejects.toThrow('No local keys found');
  });

  it('returns encrypted payload when keys are present', async () => {
    window.e2ee = { getOrCreateDeviceId: vi.fn() };
    localStorage.setItem('chaos_identityKeyPair', 'test-id-key');
    localStorage.setItem('chaos_deviceId', 'test-device');
    localStorage.setItem('chaos_registrationId', '42');

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
    expect(result).toHaveProperty('identityKeyPair', 'id-key');
    expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
    expect(mockCrypto.subtle.deriveKey).toHaveBeenCalled();
    expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
  });
});

describe('restoreKeysFromBackup', () => {
  it('restores all keys to localStorage', async () => {
    const mod = await import('../backup');
    const backupData = {
      deviceId: 'restored-device',
      registrationId: '99',
      identityKeyPair: 'restored-id',
      signingKeyPair: 'restored-sig',
      signedPreKey: 'restored-spk',
      oneTimePreKeys: 'restored-otp',
    };

    const result = await mod.restoreKeysFromBackup(backupData);

    expect(result.restored).toBe(true);
    expect(result.deviceId).toBe('restored-device');
    expect(localStorage.getItem('chaos_deviceId')).toBe('restored-device');
    expect(localStorage.getItem('chaos_registrationId')).toBe('99');
    expect(localStorage.getItem('chaos_identityKeyPair')).toBe('restored-id');
    expect(localStorage.getItem('chaos_signingKeyPair')).toBe('restored-sig');
    expect(localStorage.getItem('chaos_signedPreKey')).toBe('restored-spk');
    expect(localStorage.getItem('chaos_oneTimePreKeys')).toBe('restored-otp');
    expect(localStorage.getItem('chaos_backupRestored')).toBe('true');
  });

  it('handles partial backup data gracefully', async () => {
    const mod = await import('../backup');
    const result = await mod.restoreKeysFromBackup({ deviceId: 'partial-device' });

    expect(result.restored).toBe(true);
    expect(localStorage.getItem('chaos_deviceId')).toBe('partial-device');
    expect(localStorage.getItem('chaos_identityKeyPair')).toBeNull();
  });
});
