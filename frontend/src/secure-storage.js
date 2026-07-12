const DB_NAME = "chaos-messenger-secure";
const DB_VERSION = 1;
const KEY_STORE = "keyring";
const RECORD_STORE = "records";
const WRAPPING_KEY_ID = "storage-wrapping-key-v1";
const MEMORY_SLOT = "__chaosSecureStorageMemoryV1";

let dbPromise;
let wrappingKeyPromise;

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

function transactionAsPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error("Secure storage transaction aborted"));
    transaction.onerror = () => reject(transaction.error || new Error("Secure storage transaction failed"));
  });
}

async function getObject(storeName, key) {
  const db = await openDatabase();
  if (!db) return undefined;
  const tx = db.transaction(storeName, "readonly");
  const result = await requestAsPromise(tx.objectStore(storeName).get(key));
  await transactionAsPromise(tx);
  return result;
}

async function putObject(storeName, key, value) {
  const db = await openDatabase();
  if (!db) return;
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(value, key);
  await transactionAsPromise(tx);
}

async function addObjectIfAbsent(storeName, key, value) {
  const db = await openDatabase();
  if (!db) return true;
  const tx = db.transaction(storeName, "readwrite");
  const request = tx.objectStore(storeName).add(value, key);
  let inserted = true;
  request.onerror = (event) => {
    if (request.error?.name === "ConstraintError") {
      inserted = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  };
  await transactionAsPromise(tx);
  return inserted;
}

async function deleteObject(storeName, key) {
  const db = await openDatabase();
  if (!db) return;
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(key);
  await transactionAsPromise(tx);
}

async function getWrappingKey() {
  if (!hasIndexedDb()) return null;
  if (wrappingKeyPromise) return wrappingKeyPromise;

  wrappingKeyPromise = (async () => {
    const existing = await getObject(KEY_STORE, WRAPPING_KEY_ID);
    if (existing) return existing;

    const candidate = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );

    const inserted = await addObjectIfAbsent(KEY_STORE, WRAPPING_KEY_ID, candidate);
    if (inserted) return candidate;

    const winner = await getObject(KEY_STORE, WRAPPING_KEY_ID);
    if (!winner) throw new Error("Secure storage wrapping key race could not be resolved");
    return winner;
  })().catch((error) => {
    wrappingKeyPromise = null;
    throw error;
  });

  return wrappingKeyPromise;
}

function additionalData(recordName) {
  return new TextEncoder().encode(`ChaosMessengerSecureStorage:${recordName}:v1`);
}

async function encryptRecord(recordName, value, key) {
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

  return {
    version: 1,
    iv,
    ciphertext,
    updatedAt: Date.now(),
  };
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
  const encrypted = await encryptRecord(recordName, value, key);
  await putObject(RECORD_STORE, recordName, encrypted);
}

export async function writeSecureRecordsAtomic(entries) {
  const normalized = Object.entries(entries || {});
  if (normalized.length === 0) return;

  if (!hasIndexedDb()) {
    const state = memoryState();
    normalized.forEach(([recordName, value]) => {
      state.records.set(recordName, structuredClone(value));
    });
    return;
  }

  const key = await getWrappingKey();
  const encryptedEntries = await Promise.all(
    normalized.map(async ([recordName, value]) => [recordName, await encryptRecord(recordName, value, key)]),
  );

  const db = await openDatabase();
  const tx = db.transaction(RECORD_STORE, "readwrite");
  const store = tx.objectStore(RECORD_STORE);
  encryptedEntries.forEach(([recordName, encrypted]) => store.put(encrypted, recordName));
  await transactionAsPromise(tx);
}

export async function deleteSecureRecord(recordName) {
  if (!hasIndexedDb()) {
    memoryState().records.delete(recordName);
    return;
  }
  await deleteObject(RECORD_STORE, recordName);
}

export async function clearSecureStorageForTests() {
  wrappingKeyPromise = null;
  if (!hasIndexedDb()) {
    delete globalThis[MEMORY_SLOT];
    return;
  }

  const db = await openDatabase();
  const tx = db.transaction([RECORD_STORE, KEY_STORE], "readwrite");
  tx.objectStore(RECORD_STORE).clear();
  tx.objectStore(KEY_STORE).clear();
  await transactionAsPromise(tx);
}

export function secureStorageBackend() {
  return hasIndexedDb() ? "indexeddb" : "memory";
}
