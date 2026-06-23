import { expect, test } from "@playwright/test";

const PASSWORD = "secret123";

function uniqueId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function userData(prefix, suffix) {
  const username = `e2e_${prefix}_${suffix}`.toLowerCase();
  return {
    username,
    email: `${username}@chaos-e2e-test.com`,
    firstName: prefix === "alice" ? "Alice" : "Bob",
    lastName: "Test",
    displayName: `${prefix === "alice" ? "Alice" : "Bob"} Test`,
  };
}

async function ensureBackend(request) {
  const resp = await request.get("http://127.0.0.1:8080/actuator/health", { timeout: 10_000 });
  expect(resp.ok(), "Backend must be running on :8080").toBeTruthy();
}

async function registerUser(page, data) {
  await page.goto("/");
  await page.getByPlaceholder("you@example.com").fill(data.email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /Create account by email/i }).click();
  await page.getByRole("button", { name: /^Create account$|^Создать аккаунт$/i }).click();
  await expect(page.getByText(/Tell us about yourself|Расскажите о себе/i)).toBeVisible();

  await page.getByPlaceholder("John").fill(data.firstName);
  await page.getByPlaceholder("Smith").fill(data.lastName);
  const usernameInput = page.getByPlaceholder("ivan_petrov");
  await expect(usernameInput).toBeVisible();
  await usernameInput.fill(data.username);
  await expect(page.getByText(/Available|Доступ/i)).toBeVisible();
  await page.getByRole("button", { name: /Enter messenger|Войти/i }).click();
  await expect(page.getByText(/Чаты|Chats/i)).toBeVisible();

  expect(await page.evaluate(() => localStorage.getItem("cm_token"))).not.toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("cm_refresh_token"))).not.toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("cm_device_id"))).not.toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("cm_device_bundle_v2"))).not.toBeNull();
}

async function openDirectChat(page, target) {
  await page.getByTitle("Новый чат").click();
  await page.getByPlaceholder("Поиск по username").fill(target.username);
  const row = page.locator(".new-chat-drawer-user").filter({ hasText: `@${target.username}` });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.locator(".head-name")).toContainText(target.displayName);
}

async function selectChat(page, target) {
  const chat = page.locator(".conversation-item").filter({ hasText: target.displayName });
  await expect(chat).toBeVisible();
  await chat.click();
  await expect(page.locator(".head-name")).toContainText(target.displayName);
}

async function sendMessage(page, text) {
  await page.getByPlaceholder("Сообщение...").fill(text);
  await page.locator(".send-btn").click();
  await expect(page.locator(".msgs")).toContainText(text);
}

async function waitForMessage(page, text, timeout = 25_000) {
  await expect(page.locator(".msgs")).toContainText(text, { timeout });
}

test.describe("Full E2EE flow with real backend", () => {
  test.beforeAll(async ({ request }) => {
    await ensureBackend(request);
  });

  test("two users register, exchange encrypted messages both ways, verify decryption", async ({ browser }) => {
    const uid = uniqueId();
    const alice = userData("alice", uid);
    const bob = userData("bob", uid);

    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    const msg1 = `hello from alice ${uid}`;
    const msg2 = `hello back from bob ${uid}`;
    const editMsg = `edited message ${uid}`;

    // 1. Register both users
    await registerUser(alicePage, alice);
    await registerUser(bobPage, bob);

    // 2. Alice opens direct chat with Bob and sends message
    await openDirectChat(alicePage, bob);
    await sendMessage(alicePage, msg1);

    // 3. Bob opens chat with Alice and should see the message
    await selectChat(bobPage, alice);
    await waitForMessage(bobPage, msg1);

    // 4. Bob replies
    await sendMessage(bobPage, msg2);

    // 5. Alice should see Bob's reply in real-time (via WebSocket)
    await waitForMessage(alicePage, msg2);

    // 6. Verify delivery receipts (✓ becomes ✓✓ when read)
    await expect(alicePage.locator(".msg-wrap.out .check.read")).toHaveCount(1, { timeout: 10_000 });

    // 7. Alice edits her first message
    const lastOutMsg = alicePage.locator(".msg-wrap.out").last();
    await lastOutMsg.click({ button: "right" });
    await pageClickMenuItem(alicePage, /Edit|Редактировать/);
    const editInput = alicePage.locator(".edit-input");
    await expect(editInput).toBeVisible();
    await editInput.fill(editMsg);
    await alicePage.locator(".edit-save-btn").click();
    await waitForMessage(alicePage, editMsg);

    // 8. Bob sees the edit
    await waitForMessage(bobPage, editMsg);

    // 9. Bob reacts to Alice's message
    const bobFirstIn = bobPage.locator(".msg-wrap.in").first();
    await bobFirstIn.click({ button: "right" });
    await pageClickMenuItem(bobPage, /👍/);
    await expect(bobFirstIn.locator(".reaction-chip")).toContainText("👍");

    // 10. Verify reaction syncs to Alice
    const aliceFirstOut = alicePage.locator(".msg-wrap.out").first();
    await expect(aliceFirstOut.locator(".reaction-chip")).toContainText("👍", { timeout: 10_000 });

    // 11. Reload Bob and verify messages persist (decrypted from server)
    await bobPage.reload();
    await expect(bobPage.getByText(/Чаты|Chats/i)).toBeVisible();
    await selectChat(bobPage, alice);
    await waitForMessage(bobPage, msg1);
    await waitForMessage(bobPage, msg2);
    await waitForMessage(bobPage, editMsg);

    await aliceCtx.close();
    await bobCtx.close();
  });

  test("user presence and typing indicators work", async ({ browser }) => {
    const uid = uniqueId();
    const alice = userData("pres_a", uid);
    const bob = userData("pres_b", uid);

    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    await registerUser(alicePage, alice);
    await registerUser(bobPage, bob);

    // Alice opens chat with Bob
    await openDirectChat(alicePage, bob);

    // Bob opens chat with Alice  
    await selectChat(bobPage, alice);

    // Bob should appear online to Alice
    await expect(alicePage.locator(".head-status")).toContainText(/online|в сети/i);

    // Alice starts typing
    await alicePage.getByPlaceholder("Сообщение...").fill("hello");

    // Bob should see typing indicator
    await expect(bobPage.locator(".typing")).toBeVisible({ timeout: 10_000 });

    // Alice clears input
    await alicePage.getByPlaceholder("Сообщение...").clear();
    await expect(bobPage.locator(".typing")).not.toBeVisible({ timeout: 10_000 });

    await aliceCtx.close();
    await bobCtx.close();
  });
});

async function pageClickMenuItem(page, text) {
  const item = page.locator(".ctx-menu-item, .popup-menu-item").filter({ hasText: text });
  await expect(item).toBeVisible();
  await item.click();
}
