import { describe, expect, it } from 'vitest';
import { resolveRuntimeEndpoints, toStompBrokerUrl } from '../config';

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

  it('converts HTTP(S) and relative WS URLs into STOMP broker URLs', () => {
    expect(toStompBrokerUrl('ws://localhost:8080/ws')).toBe('ws://localhost:8080/ws');
    expect(toStompBrokerUrl('http://localhost/ws')).toBe('ws://localhost/ws');
    expect(toStompBrokerUrl('https://messenger.example.com/ws')).toBe('wss://messenger.example.com/ws');
    expect(toStompBrokerUrl('/ws', { protocol: 'https:', host: 'app.example.com' }))
      .toBe('wss://app.example.com/ws');
    expect(toStompBrokerUrl('/ws', { protocol: 'http:', host: 'localhost:5173' }))
      .toBe('ws://localhost:5173/ws');
  });
});
