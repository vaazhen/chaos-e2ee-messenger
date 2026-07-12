const DB_NAME = "chaos-messenger-secure";
const DB_VERSION = 1;
const KEY_STORE = "keyring";
const RECORD_STORE = "records";
const WRAPPING_KEY_ID = "storage-wrapping-key-v1";
const MEMORY_SLOT = "__chaosSecureStorageMemoryV1";

let dbPromise;

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function memoryState() {
  if (!globalThis[MEMORY_SLOT]) {
    globalThis[MEMORY_SLOT] = { records: new Map() };
  }
  return globalThis[MEMORY_SLOT];
}

function openDatabase() {
  if (!hasIndexedDb()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
      if (!db.objectStoreNames.contains(RECORD_STORE)) db.createObjectStore(RECORD_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open secure storage"));
    request.onblocked = () => reject(new Error("Secure storage upgrade is blocked by another tab"));
  });

  return dbPromise;
}

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Secure storage request failed"));
  });
}

async function getObject(storeName, key) {
  const db = await openDatabase();
  if (!db) return undefined;
  const tx = db.transaction(storeName, "readonly");
  return requestAsPromise(tx.objectStore(storeName).get(key));
}

async function putObject(storeName, key, value) {
  const db = await openDatabase();
  if (!db) return;
  const tx = db.transaction(storeName, "readwrite");
  await requestAsPromise(tx.objectStore(storeName).put(value, key));
}

async function deleteObject(storeName, key) {
  const db = await openDatabase();
  if (!db) return;
  const tx = db.transaction(storeName, "readwrite");
  await requestAsPromise(tx.objectStore(storeName).delete(key));
}

async function getWrappingKey() {
  let key = await getObject(KEY_STORE, WRAPPING_KEY_ID);
  if (key) return key;

  key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  await putObject(KEY_STORE, WRAPPING_KEY_ID, key);
  return key;
}

function additionalData(recordName) {
  return new TextEncoder().encode(`ChaosMessengerSecureStorage:${recordName}:v1`);
}

export async function readSecureRecord(recordName) {
  if (!hasIndexedDb()) {
    const value = memoryState().records.get(recordName);
    return value === undefined ? null : structuredClone(value);
  }

  const record = await getObject(RECORD_STORE, recordName);
  if (!record) return null;
  if (record.version !== 1 || !record.iv || !record.ciphertext) {
    throw new Error(`Unsupported secure record format for ${recordName}`);
  }

  const key = await getWrappingKey();
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: record.iv,
      additionalData: additionalData(recordName),
    },
    key,
    record.ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export async function writeSecureRecord(recordName, value) {
  if (!hasIndexedDb()) {
    memoryState().records.set(recordName, structuredClone(value));
    return;
  }

  const key = await getWrappingKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: additionalData(recordName),
    },
    key,
    plaintext,
  );

  await putObject(RECORD_STORE, recordName, {
    version: 1,
    iv,
    ciphertext,
    updatedAt: Date.now(),
  });
}

export async function deleteSecureRecord(recordName) {
  if (!hasIndexedDb()) {
    memoryState().records.delete(recordName);
    return;
  }
  await deleteObject(RECORD_STORE, recordName);
}

export async function clearSecureStorageForTests() {
  if (!hasIndexedDb()) {
    delete globalThis[MEMORY_SLOT];
    return;
  }

  const db = await openDatabase();
  await Promise.all([
    requestAsPromise(db.transaction(RECORD_STORE, "readwrite").objectStore(RECORD_STORE).clear()),
    requestAsPromise(db.transaction(KEY_STORE, "readwrite").objectStore(KEY_STORE).clear()),
  ]);
}

export function secureStorageBackend() {
  return hasIndexedDb() ? "indexeddb" : "memory";
}
