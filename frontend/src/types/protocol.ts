// ─── E2EE Protocol Types ───────────────────────────────────────────────────
// These types define the wire format and internal state for the X3DH + Double
// Ratchet protocol. They serve as the authoritative reference for the
// crypto-engine module and its consumers.

/** Versioned protocol message types transported over WebSocket / REST. */
export type MessageType = 'WHISPER' | 'PREKEY_WHISPER' | 'SELF_WHISPER';
export type VerificationMethod = 'MANUAL' | 'SAFETY_NUMBER' | 'QR_CODE';

/** AES-GCM encrypted envelope sent to a single recipient device. */
export interface EncryptedEnvelope {
  targetDeviceId: string;
  targetUserId: number;
  messageType: MessageType;
  senderIdentityPublicKey: string;
  ephemeralPublicKey: string | null;
  ratchetPublicKey: string | null;
  previousChainLength: number | null;
  ciphertext: string;
  nonce: string;
  messageIndex: number | null;
  signedPreKeyId: number | null;
  oneTimePreKeyId: number | null;
  timestamp: number;
  /** Client-only context used to construct AAD; never trusted as server state. */
  _chatId?: number;
}

/** Envelope as received by the decrypt path (includes sender context). */
export interface DecryptEnvelope {
  messageType: MessageType;
  senderDeviceId: string;
  senderIdentityPublicKey?: string;
  ciphertext: string;
  nonce: string;
  ratchetPublicKey?: string | null;
  messageIndex?: number;
  previousChainLength?: number;
  signedPreKeyId?: number | null;
  oneTimePreKeyId?: number | null;
  ephemeralPublicKey?: string | null;
  _chatId?: number;
}

/** Double Ratchet session state (v4). */
export interface RatchetSession {
  version: number;
  DHs: { publicKey: string; privateKey: string };
  DHr: string;
  RK: string;
  CKs: string | null;
  CKr: string | null;
  Ns: number;
  Nr: number;
  PN: number;
  MKSKIPPED: Record<string, string>;
  rootKey: string;
  receivingChainKey?: string;
  sendingChainKey?: string;
}

/** Identity key pair stored in secure storage. */
export interface IdentityKeyPair {
  publicKey: string;
  privateKeyPkcs8: string;
}

/** Signing key pair for signed pre-key signatures. */
export interface SigningKeyPair {
  publicKeySpki: string;
  privateKeyPkcs8: string;
}

/** A single pre-key (signed or one-time). */
export interface PreKey {
  preKeyId: number;
  publicKey: string;
  privateKeyPkcs8: string;
  signature?: string;
}

/** Full device bundle stored in IndexedDB / LocalStorage. */
export interface DeviceBundle {
  deviceId: string;
  registrationId: number;
  identity: IdentityKeyPair;
  signingKey: SigningKeyPair;
  signedPreKey: PreKey;
  oneTimePreKeys: PreKey[];
}

/** Target device info returned by resolve-chat-devices API. */
export interface TargetDevice {
  userId: number;
  deviceId: string;
  identityPublicKey: string;
  signingPublicKey: string;
  signedPreKey: PreKey | null;
  oneTimePreKey: PreKey | null;
}

/** X3DH bootstrap result — new session + ephemeral public key. */
export interface BootstrapResult {
  session: RatchetSession;
  ephemeralPublicKey: string;
}

/** Result of encryptWithDoubleRatchet. */
export interface EncryptionResult {
  encrypted: { ciphertext: string; nonce: string };
  messageIndex: number;
  ratchetPublicKey: string;
  previousChainLength: number;
}

/** Fanout request sent to /api/crypto/send-message. */
export interface FanoutRequest {
  chatId: number;
  clientMessageId: string;
  senderDeviceId: string;
  envelopes: EncryptedEnvelope[];
}

/** Trust state for a remote device identity. */
export type TrustState = 'UNVERIFIED' | 'VERIFIED' | 'KEY_CHANGED';

export interface RemoteIdentityTrust {
  trustState: TrustState;
  verificationMethod?: VerificationMethod;
  verifiedAt?: number;
  identityPublicKey: string;
}

/** File encryption result. */
export interface EncryptedFile {
  encrypted: Uint8Array;
  fileKey: string;
}

/** AAD context for envelope authentication. */
export interface AADContext {
  messageType?: MessageType;
  chatId?: number;
  messageIndex?: number | null;
  previousChainLength?: number | null;
  ratchetPublicKey?: string | null;
}

/** Exported public API of the crypto engine. */
export interface CryptoEngine {
  getOrCreateDeviceId(): string;
  getLocalDeviceBundle(): DeviceBundle | null;
  ensureDeviceRegistered(api: (path: string, opts?: RequestInit) => Promise<any>): Promise<DeviceBundle>;
  replenishOneTimePreKeys(api: (path: string, opts?: RequestInit) => Promise<any>): Promise<DeviceBundle | null>;
  resetLocalDeviceIdentity(): Promise<void>;
  buildFanoutRequest(api: (path: string, opts?: RequestInit) => Promise<any>, chatId: number, plainText: string): Promise<FanoutRequest>;
  decryptEnvelope(envelope: DecryptEnvelope): Promise<string>;
  encryptFile(fileArrayBuffer: ArrayBuffer): Promise<EncryptedFile>;
  decryptFile(encryptedArrayBuffer: ArrayBuffer, fileKeyBase64: string): Promise<ArrayBuffer>;
  getRemoteIdentityTrust(deviceId: string, identityPublicKey?: string | null): RemoteIdentityTrust;
  verifyRemoteIdentity(deviceId: string, identityPublicKey: string, method?: VerificationMethod): Promise<void>;
  importLocalDeviceBundle(bundle: DeviceBundle): Promise<string>;
  getSecureStorageBackend(): string;
  // Test-only internals
  __clearSecureStorageForTests?(): Promise<void>;
  __importSessionStateForTests?(sessions: Record<string, RatchetSession>): Promise<void>;
  __exportSessionStateForTests?(): Record<string, RatchetSession>;
  // Old API (backward compat during transition)
  deriveSelfEnvelopeKey?(bundle: DeviceBundle): Promise<CryptoKey>;
}

declare global {
  interface Window {
    e2ee?: CryptoEngine;
  }
}
