let aesKey = null;
let frameCounter = 0;

async function importRawKey(rawKey) {
  return crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function ensureKey(rawKey) {
  if (aesKey) return aesKey;
  aesKey = importRawKey(rawKey);
  return aesKey;
}

async function encryptFrame(frame, rawKey) {
  const key = await ensureKey(rawKey);
  const iv = new Uint8Array(12);
  const view = new DataView(iv.buffer);
  view.setUint32(0, frameCounter++ >>> 0);
  view.setUint32(4, Number(frame.timestamp || 0) >>> 0);
  const plaintext = frame.data instanceof ArrayBuffer ? frame.data : frame.data.buffer;
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const packed = new Uint8Array(12 + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), 12);
  frame.data = packed.buffer;
}

async function decryptFrame(frame, rawKey) {
  const key = await ensureKey(rawKey);
  const data = new Uint8Array(frame.data instanceof ArrayBuffer ? frame.data : frame.data);
  if (data.byteLength < 28) return;
  const iv = data.subarray(0, 12);
  const ciphertext = data.subarray(12);
  try {
    frame.data = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  } catch {
    frame.data = new ArrayBuffer(0);
  }
}

async function transformStream(readable, writable, action, rawKey) {
  const transformer = new TransformStream({
    async transform(frame, controller) {
      if (action === "encrypt") await encryptFrame(frame, rawKey);
      else await decryptFrame(frame, rawKey);
      controller.enqueue(frame);
    },
  });
  await readable.pipeThrough(transformer).pipeTo(writable);
}

self.onrtctransform = (event) => {
  const { action, rawKey } = event.transformer.options || {};
  void transformStream(event.transformer.readable, event.transformer.writable, action, rawKey);
};

self.onmessage = (event) => {
  const { action, rawKey, readable, writable } = event.data || {};
  if (!readable || !writable) return;
  void transformStream(readable, writable, action, rawKey);
};
