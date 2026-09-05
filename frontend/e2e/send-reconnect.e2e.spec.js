import { expect, test } from "@playwright/test";

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

async function mockMessenger(page, state) {
  state.calls ??= [];
  state.messages ??= [];
  state.deviceId = null;
  state.identityPublicKey = null;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api/, "");
    const method = request.method();
    state.calls.push({ method, pathname });

    if (pathname === "/v1/i18n/messages" || pathname === "/i18n/locale") {
      return route.fulfill(json({}));
    }

    if (pathname === "/auth/login" && method === "POST") {
      state.loggedIn = true;
      return route.fulfill(json({
        status: "ok",
        exists: true,
        isNewUser: false,
        userId: 1,
        username: "alice",
        email: "alice@test.com",
        token: "jwt-login",
        refreshToken: "refresh-login",
        deviceRegistrationToken: "device-reg-login",
      }));
    }

    if (pathname === "/auth/refresh" && method === "POST") {
      if (!state.loggedIn) {
        return route.fulfill(json({ message: "no session" }, 401));
      }
      return route.fulfill(json({
        token: "jwt-refresh",
        refreshToken: "refresh-rotated",
      }));
    }

    if (pathname === "/crypto/devices/register" && method === "POST") {
      const body = request.postDataJSON() || {};
      state.deviceId = body.deviceId || "device-e2e";
      state.identityPublicKey = body.identityPublicKey || "identity";
      return route.fulfill(json({
        deviceId: state.deviceId,
        serverDeviceInternalId: 10,
      }));
    }

    if (pathname === "/crypto/devices/current") {
      return route.fulfill(json({
        deviceId: state.deviceId || "device-e2e",
        serverDeviceInternalId: 10,
      }));
    }

    if (pathname === "/crypto/devices/current/prekeys") {
      return route.fulfill(json({ available: 80, oneTimePreKeys: [] }));
    }

    if (pathname.startsWith("/crypto/resolve-chat-devices/") && method === "POST") {
      return route.fulfill(json({
        targetDevices: [{
          userId: 1,
          deviceId: state.deviceId || "device-e2e",
          identityPublicKey: state.identityPublicKey || "identity",
          signingPublicKey: "signing",
          signedPreKey: null,
          oneTimePreKey: null,
        }],
      }));
    }

    if (pathname === "/users/me") {
      return route.fulfill(json({
        id: 1,
        username: "alice",
        email: "alice@test.com",
        firstName: "Alice",
        lastName: "E2E",
        avatarUrl: "",
        publicKey: null,
      }));
    }

    if (pathname === "/chats/my") {
      return route.fulfill(json([{
        chatId: 42,
        type: "SAVED",
        lastContent: "",
        lastMessageId: state.messages[0]?.id || null,
        lastMessageAt: state.messages[0]?.createdAt || null,
        unreadCount: 0,
      }]));
    }

    if (pathname === "/chats/requests") {
      return route.fulfill(json([]));
    }

    if (pathname.startsWith("/messages/chat/42/timeline")) {
      return route.fulfill(json(state.messages));
    }

    if (pathname === "/messages/chat/42/delivered" || pathname === "/messages/chat/42/read") {
      return route.fulfill(json({ ok: true }));
    }

    if (pathname === "/messages/encrypted/v2" && method === "POST") {
      const body = request.postDataJSON() || {};
      const rawEnvelope = (body.envelopes || [])[0] || null;
      const envelope = rawEnvelope
        ? { ...rawEnvelope, senderDeviceId: body.senderDeviceId || state.deviceId }
        : null;
      const saved = {
        id: 700,
        chatId: 42,
        senderId: 1,
        senderDeviceId: body.senderDeviceId || state.deviceId,
        clientMessageId: body.clientMessageId,
        version: 1,
        deleted: false,
        createdAt: "2026-09-05T00:00:00.000Z",
        editedAt: null,
        status: "SENT",
        content: "[encrypted]",
        envelope,
        reactions: {},
        myReactions: [],
      };
      state.messages = [saved];
      return route.fulfill(json({
        id: saved.id,
        messageId: saved.id,
        status: "SENT",
        createdAt: saved.createdAt,
        reactions: {},
        myReactions: [],
      }));
    }

    if (pathname === "/realtime/sync") {
      return route.fulfill(json({ events: [], nextAfter: 0 }));
    }

    return route.fulfill(json({
      message: `Unhandled mocked API route: ${method} ${pathname}`,
    }, 500));
  });
}

test.describe("send and reconnect", () => {
  test("self-chat message survives reload from the durable timeline", async ({ page }) => {
    const state = {};
    await mockMessenger(page, state);

    await page.goto("/");
    await page.getByPlaceholder("you@example.com").fill("alice@test.com");
    await page.locator('input[type="password"]').fill("secret123");
    await page.getByRole("button", { name: /Sign in/i }).click();
    await expect(page.getByRole("heading", { name: /Чаты|Chats/i })).toBeVisible();

    const savedChat = page.locator(".conversation-item").filter({ hasText: /Saved Messages|Избранное/i });
    await savedChat.click();
    const composer = page.getByPlaceholder(/Сообщение\.\.\.|Message\.\.\./);
    await expect(composer).toBeVisible();
    await expect(page.locator(".loading-msgs")).toHaveCount(0);

    const plaintext = "reconnect hello";
    await composer.fill(plaintext);
    await composer.press("Enter");
    await expect.poll(() => state.messages.length, { timeout: 10_000 }).toBe(1);
    expect(state.messages[0].envelope?.messageType).toBe("SELF_WHISPER");
    expect(state.messages[0].envelope?.ciphertext).toBeTruthy();

    await page.reload();
    await expect(page.getByRole("heading", { name: /Чаты|Chats/i })).toBeVisible();
    await savedChat.click();
    await expect(page.getByPlaceholder(/Сообщение\.\.\.|Message\.\.\./)).toBeVisible();
    await expect(page.locator(".loading-msgs")).toHaveCount(0);
    await expect(page.locator(".bubble")).toContainText(plaintext);

    const sendCalls = state.calls.filter(call => call.pathname === "/messages/encrypted/v2");
    expect(sendCalls).toHaveLength(1);
  });
});
