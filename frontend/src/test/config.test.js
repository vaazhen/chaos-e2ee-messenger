import { describe, expect, it } from 'vitest';
import { resolveRuntimeEndpoints } from '../config';

describe('runtime endpoint configuration', () => {
  it('allows same-origin relative endpoints for the web build', () => {
    expect(resolveRuntimeEndpoints({
      apiBase: '/api',
      wsUrl: '/ws',
      isElectron: false,
      isProduction: true,
    })).toEqual({ apiBase: '/api', wsUrl: '/ws' });
  });

  it('requires secure absolute endpoints for packaged Electron', () => {
    expect(() => resolveRuntimeEndpoints({
      apiBase: '/api',
      wsUrl: '/ws',
      isElectron: true,
      isProduction: true,
    })).toThrow(/absolute HTTPS/);

    expect(resolveRuntimeEndpoints({
      apiBase: 'https://messenger.example.com/api',
      wsUrl: 'wss://messenger.example.com/ws',
      isElectron: true,
      isProduction: true,
    })).toEqual({
      apiBase: 'https://messenger.example.com/api',
      wsUrl: 'wss://messenger.example.com/ws',
    });
  });

  it('uses same-origin defaults backed by the Vite development proxy', () => {
    expect(resolveRuntimeEndpoints()).toEqual({
      apiBase: '/api',
      wsUrl: '/ws',
    });
  });
});
