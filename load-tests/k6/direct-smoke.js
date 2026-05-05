import http from "k6/http";
import { check, sleep, fail } from "k6";
import { Trend, Counter } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:8080").replace(/\/+$/, "");
const VUS = Number(__ENV.VUS || 2);
const DURATION = __ENV.DURATION || "30s";
const PASSWORD = __ENV.PASSWORD || "LoadTest123!";
const RUN_ID = __ENV.RUN_ID || `${Date.now()}`;
const SLEEP_SECONDS = Number(__ENV.SLEEP_SECONDS || 1);

const VALID_SIGNING_PUBLIC_KEY =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEJ6eE154MdyVd33hdYaM3pBKVgF1yZdbP0lzNIVEBhwRN02DyCAcXsaJqwQAMnPj4pvroBKu5A1aVM7NZEe+heQ==";

const VALID_SIGNED_PRE_KEY_PUBLIC =
  "EyKlwrULbnEHhWsneYZ5NqNC467RKnXcijB1J9KMT08=";

const VALID_SIGNED_PRE_KEY_SIGNATURE =
  "bJX2tiefKWjpXsEGED3xzTOSPgKjvsXwzbkcpo2x6lH6B1RZqHmdTsiIPWK+153TJheZGFr2GgmlBM/QRmVOtw==";

const VALID_IDENTITY_PUBLIC_KEY =
  "Oj+G1I+DDPPlJYYJvABLRForiSbWhDanv4cWPG+vDII=";

const OTK_1 = "JAQJH4tn7Yw7Ry+sQ3Oo8C1tgkjpvPXnhwCapSZcxHc=";
const OTK_2 = "LComGu7hX4s/ttNcQsDnBhDF+l940O/zrv/EQQdZH30=";
const OTK_3 = "1YhwDeY8ovSTeSty0VNqueOERZG0zi4VBQPR5A41ZHc=";

const sendMessageDuration = new Trend("send_message_duration");
const timelineDuration = new Trend("timeline_duration");
const markDeliveredDuration = new Trend("mark_delivered_duration");
const markReadDuration = new Trend("mark_read_duration");
const loadErrors = new Counter("load_errors");

export const options = {
  scenarios: {
    direct_chat_smoke: {
      executor: "constant-vus",
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
    checks: ["rate>0.95"],

    send_message_duration: ["p(95)<1500"],
    timeline_duration: ["p(95)<1000"],
    mark_delivered_duration: ["p(95)<1000"],
    mark_read_duration: ["p(95)<1000"],
  },
};

let session = null;

function uniqueSuffix(role) {
  const random = Math.floor(Math.random() * 1000000);
  return `k6${role}${RUN_ID.slice(-8)}v${__VU}i${__ITER}r${random}`;
}

function jsonHeaders(extra = {}) {
  return Object.assign(
    {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    extra
  );
}

function authHeaders(user) {
  return jsonHeaders({
    Authorization: `Bearer ${user.token}`,
    "X-Device-Id": user.deviceId,
  });
}

function postJson(path, body, headers = jsonHeaders(), endpoint = path) {
  const res = http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
    headers,
    tags: { endpoint },
  });

  const ok = check(res, {
    [`POST ${endpoint} status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });

  if (!ok) {
    loadErrors.add(1);
    fail(`POST ${path} failed: status=${res.status}, body=${res.body}`);
  }

  return res;
}

function getJson(path, headers = jsonHeaders(), endpoint = path) {
  const res = http.get(`${BASE_URL}${path}`, {
    headers,
    tags: { endpoint },
  });

  const ok = check(res, {
    [`GET ${endpoint} status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });

  if (!ok) {
    loadErrors.add(1);
    fail(`GET ${path} failed: status=${res.status}, body=${res.body}`);
  }

  return res;
}

function registerUser(role) {
  const suffix = uniqueSuffix(role);
  const username = suffix.toLowerCase();
  const email = `${suffix.toLowerCase()}@load.local`;

  const res = postJson(
    "/api/auth/register",
    {
      email,
      password: PASSWORD,
      username,
      firstName: `K6 ${role}`,
      lastName: `VU ${__VU}`,
      avatarUrl: null,
    },
    jsonHeaders(),
    "auth_register"
  );

  const body = res.json();

  check(body, {
    "auth token exists": (b) => !!b.token,
    "device registration token exists": (b) => !!b.deviceRegistrationToken,
    "user id exists": (b) => !!b.userId,
    "username exists": (b) => !!b.username,
  });

  return {
    userId: body.userId,
    username: body.username,
    token: body.token,
    refreshToken: body.refreshToken,
    deviceRegistrationToken: body.deviceRegistrationToken,
    deviceId: `${body.username}_device`,
  };
}

function registerDevice(user) {
  const res = postJson(
    "/api/crypto/devices/register",
    {
      deviceId: user.deviceId,
      deviceName: `k6-${user.username}-browser`,
      registrationId: 100000 + __VU,
      identityPublicKey: VALID_IDENTITY_PUBLIC_KEY,
      signingPublicKey: VALID_SIGNING_PUBLIC_KEY,
      signedPreKey: {
        preKeyId: 1,
        publicKey: VALID_SIGNED_PRE_KEY_PUBLIC,
        signature: VALID_SIGNED_PRE_KEY_SIGNATURE,
      },
      oneTimePreKeys: [
        { preKeyId: 1, publicKey: OTK_1 },
        { preKeyId: 2, publicKey: OTK_2 },
        { preKeyId: 3, publicKey: OTK_3 },
      ],
    },
    jsonHeaders({
      "X-Device-Registration-Token": user.deviceRegistrationToken,
    }),
    "device_register"
  );

  const body = res.json();

  check(body, {
    "registered device id returned": (b) => b.deviceId === user.deviceId,
    "server internal device id returned": (b) => !!b.serverDeviceInternalId,
  });

  return body;
}

function createDirectChat(alice, bob) {
  const res = postJson(
    `/api/chats/direct/by-username?username=${encodeURIComponent(bob.username)}`,
    {},
    authHeaders(alice),
    "chat_direct_by_username"
  );

  const body = res.json();

  check(body, {
    "chat id returned": (b) => !!b.chatId,
  });

  return body.chatId;
}

function envelope(targetUser, index) {
  return {
    targetDeviceId: targetUser.deviceId,
    targetUserId: targetUser.userId,
    messageType: "TEXT",
    senderIdentityPublicKey: VALID_IDENTITY_PUBLIC_KEY,
    ephemeralPublicKey: `ephemeral-public-key-${RUN_ID}-${__VU}-${__ITER}-${index}`,
    ciphertext: `ciphertext-${RUN_ID}-${__VU}-${__ITER}-${index}`,
    nonce: `nonce-${RUN_ID}-${__VU}-${__ITER}-${index}`,
    signedPreKeyId: 1,
    oneTimePreKeyId: null,
    timestamp: Date.now(),
    messageIndex: index,
  };
}

function sendEncryptedMessage(alice, bob, chatId) {
  const clientMessageId = `k6-msg-${RUN_ID}-${__VU}-${__ITER}-${Date.now()}`;
  const started = Date.now();

  const res = postJson(
    "/api/messages/encrypted/v2",
    {
      chatId,
      clientMessageId,
      senderDeviceId: alice.deviceId,
      envelopes: [
        envelope(alice, 0),
        envelope(bob, 1),
      ],
    },
    authHeaders(alice),
    "send_message"
  );

  sendMessageDuration.add(Date.now() - started);

  const body = res.json();

  check(body, {
    "message id returned": (b) => !!b.messageId,
    "message chat id matches": (b) => b.chatId === chatId,
    "message status exists": (b) => !!b.status,
  });

  return body.messageId;
}

function loadTimeline(user, chatId) {
  const started = Date.now();

  const res = getJson(
    `/api/messages/chat/${chatId}/timeline?limit=50`,
    authHeaders(user),
    "timeline"
  );

  timelineDuration.add(Date.now() - started);

  const body = res.json();

  check(body, {
    "timeline is array": (b) => Array.isArray(b),
  });

  return body;
}

function markDelivered(user, chatId) {
  const started = Date.now();

  postJson(
    `/api/messages/chat/${chatId}/delivered`,
    {},
    authHeaders(user),
    "mark_delivered"
  );

  markDeliveredDuration.add(Date.now() - started);
}

function markRead(user, chatId) {
  const started = Date.now();

  postJson(
    `/api/messages/chat/${chatId}/read`,
    {},
    authHeaders(user),
    "mark_read"
  );

  markReadDuration.add(Date.now() - started);
}

function bootstrap() {
  const alice = registerUser("alice");
  const bob = registerUser("bob");

  registerDevice(alice);
  registerDevice(bob);

  const chatId = createDirectChat(alice, bob);

  return { alice, bob, chatId };
}

export default function () {
  if (!session) {
    session = bootstrap();
  }

  const { alice, bob, chatId } = session;

  sendEncryptedMessage(alice, bob, chatId);

  loadTimeline(bob, chatId);
  markDelivered(bob, chatId);
  markRead(bob, chatId);

  loadTimeline(alice, chatId);
  loadTimeline(bob, chatId);

  if (SLEEP_SECONDS > 0) {
    sleep(SLEEP_SECONDS);
  }
}


