import type { AADContext } from "./types/protocol";

export const ENVELOPE_AAD_VERSION = 0x02;

function typeCode(messageType: string | undefined): number {
  if (messageType === "PREKEY_WHISPER") return 1;
  if (messageType === "WHISPER") return 2;
  if (messageType === "SELF_WHISPER") return 3;
  return 0;
}

/** AES-GCM AAD v2: version, type, chat id, index, previous chain length, optional ratchet key. */
export function buildEnvelopeAAD({
  messageType,
  chatId,
  messageIndex,
  previousChainLength,
  ratchetPublicKey,
}: AADContext): ArrayBuffer {
  const cid = BigInt(chatId != null ? chatId : 0);
  const idx = messageIndex != null ? messageIndex >>> 0 : 0;
  const pcl = previousChainLength != null ? previousChainLength >>> 0 : 0;

  const buf = new ArrayBuffer(22);
  const dv = new DataView(buf);
  dv.setUint8(0, ENVELOPE_AAD_VERSION);
  dv.setUint8(1, typeCode(messageType));
  dv.setBigUint64(2, cid, false);
  dv.setUint32(10, idx, false);
  dv.setUint32(14, pcl, false);

  if (ratchetPublicKey) {
    const rpk = String(ratchetPublicKey);
    const ext = new ArrayBuffer(buf.byteLength + 4 + rpk.length);
    new Uint8Array(ext).set(new Uint8Array(buf), 0);
    const edv = new DataView(ext);
    edv.setUint32(buf.byteLength, rpk.length, false);
    for (let i = 0; i < rpk.length; i++) {
      edv.setUint8(buf.byteLength + 4 + i, rpk.charCodeAt(i));
    }
    return ext;
  }
  return buf;
}

export function envelopeAadHex(context: AADContext): string {
  return [...new Uint8Array(buildEnvelopeAAD(context))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
