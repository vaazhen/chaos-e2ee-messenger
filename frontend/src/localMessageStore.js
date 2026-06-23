const DB_NAME = 'chaos-messenger';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('chatId', 'chatId', { unique: false });
        store.createIndex('chatId_createdAt', ['chatId', 'createdAt'], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

function sanitizeAttachment(attachment) {
  if (!attachment) return null;
  const clean = { ...attachment };
  delete clean.objectUrl;
  delete clean.blob;
  return clean;
}

function toStoreRow(msg) {
  return {
    id: msg.id,
    chatId: msg.chatId,
    senderId: msg.senderId,
    content: msg.content,
    createdAt: msg.createdAt,
    editedAt: msg.editedAt || null,
    version: msg.version || null,
    status: msg.status || 'SENT',
    reactions: msg.reactions || {},
    myReactions: msg.myReactions || [],
    _out: Boolean(msg._out),
    _text: msg._text || '',
    _img: null,
    _voice: null,
    _payload: msg._payload || null,
    _attachment: sanitizeAttachment(msg._attachment),
    _ttl: msg._ttl || null,
    expiresAt: msg.expiresAt || null,
    _time: msg._time || null,
    savedAt: new Date().toISOString(),
  };
}

export async function saveMessage(msg) {
  if (!msg || !msg.id) return;
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(toStoreRow(msg));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveMessages(msgs) {
  if (!msgs || msgs.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const msg of msgs) {
    if (!msg || !msg.id) continue;
    store.put(toStoreRow(msg));
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMessagesByChat(chatId) {
  if (!chatId) return [];
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('chatId_createdAt');
  const range = IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']);
  const messages = [];
  return new Promise((resolve, reject) => {
    const cursor = index.openCursor(range);
    cursor.onsuccess = (event) => {
      const cur = event.target.result;
      if (cur) {
        messages.push(cur.value);
        cur.continue();
      } else {
        resolve(messages);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

export async function getMessageByMessageId(messageId) {
  if (!messageId) return null;
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.get(messageId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMessage(messageId) {
  if (!messageId) return;
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(messageId);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateMessageReactions(messageId, reactions, myReactions) {
  if (!messageId) return;
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.get(messageId);
    request.onsuccess = () => {
      const existing = request.result;
      if (existing) {
        existing.reactions = reactions || {};
        if (myReactions !== undefined && myReactions !== null) {
          existing.myReactions = Array.isArray(myReactions) ? myReactions : [];
        }
        store.put(existing);
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearChat(chatId) {
  if (!chatId) return;
  const messages = await getMessagesByChat(chatId);
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const msg of messages) {
    store.delete(msg.id);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAll() {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLastMessageByChat(chatId) {
  if (!chatId) return null;
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('chatId_createdAt');
  const range = IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']);
  let last = null;
  return new Promise((resolve, reject) => {
    const cursor = index.openCursor(range, 'prev');
    cursor.onsuccess = (event) => {
      const cur = event.target.result;
      if (cur) {
        last = cur.value;
        resolve(last);
      } else {
        resolve(null);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}
