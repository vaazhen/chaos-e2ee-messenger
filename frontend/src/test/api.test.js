import { beforeEach, describe, expect, it, vi } from "vitest";

function okJson(body) {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(body),
  });
}

function failJson(status, statusText, body) {
  return Promise.resolve({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve(body),
    clone: () => ({
      json: () => Promise.resolve(body),
    }),
  });
}

describe("api", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    delete window.e2ee;
    global.fetch = vi.fn();
  });

  it("keeps access tokens in memory and removes legacy persisted credentials", async () => {
    localStorage.setItem("cm_token", "legacy-access");
    localStorage.setItem("cm_refresh_token", "legacy-refresh");
    sessionStorage.setItem("cm_token", "legacy-session-access");

    const { getToken, setToken, clearToken } = await import("../api");

    expect(getToken()).toBe("");
    expect(localStorage.getItem("cm_token")).toBeNull();
    expect(localStorage.getItem("cm_refresh_token")).toBeNull();
    expect(sessionStorage.getItem("cm_token")).toBeNull();

    setToken("runtime-only");
    expect(getToken()).toBe("runtime-only");
    expect(localStorage.getItem("cm_token")).toBeNull();
    expect(sessionStorage.getItem("cm_token")).toBeNull();

    clearToken();
    expect(getToken()).toBe("");
  });

  it("call attaches JWT, current device id, JSON content type and custom headers", async () => {
    const { call, setToken } = await import("../api");

    setToken("jwt-token");
    localStorage.setItem("cm_device_id", "device-local");

    fetch.mockResolvedValueOnce(await okJson({ ok: true }));

    const response = await call("/test", {
      method: "POST",
      headers: { "X-Custom": "yes" },
      body: JSON.stringify({ hello: "world" }),
    });

    expect(response).toEqual({ ok: true });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fetch.mock.calls[0];

    expect(url).toContain("/test");
    expect(opts.method).toBe("POST");
    expect(opts.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer jwt-token",
      "X-Device-Id": "device-local",
      "X-Custom": "yes",
    });
  });

  it("call uses window.e2ee device id when crypto engine is loaded", async () => {
    window.e2ee = {
      getOrCreateDeviceId: vi.fn(() => "device-from-e2ee"),
    };

    const { call } = await import("../api");

    fetch.mockResolvedValueOnce(await okJson({ ok: true }));

    await call("/secured");

    const [, opts] = fetch.mock.calls[0];

    expect(window.e2ee.getOrCreateDeviceId).toHaveBeenCalled();
    expect(opts.headers["X-Device-Id"]).toBe("device-from-e2ee");
  });

  it("call throws backend message on non-2xx response", async () => {
    const { call } = await import("../api");

    fetch.mockResolvedValueOnce(await failJson(409, "Conflict", {
      message: "username is taken",
    }));

    await expect(call("/users/profile")).rejects.toThrow("username is taken");
  });

  it("call falls back to status text when error body has no message", async () => {
    const { call } = await import("../api");

    fetch.mockResolvedValueOnce(await failJson(500, "Server Error", {}));

    await expect(call("/boom")).rejects.toThrow("500 Server Error");
  });

  it("completeSetup sends setupToken merged with profile payload", async () => {
    const { api } = await import("../api");

    fetch.mockResolvedValueOnce(await okJson({ token: "jwt" }));

    await api.completeSetup("setup-123", {
      firstName: "Alice",
      username: "alice",
      avatarUrl: "data:image/png;base64,abc",
    });

    const [, opts] = fetch.mock.calls[0];
    const body = JSON.parse(opts.body);

    expect(opts.method).toBe("POST");
    expect(body).toEqual({
      setupToken: "setup-123",
      firstName: "Alice",
      username: "alice",
      avatarUrl: "data:image/png;base64,abc",
    });
  });

  it("usernameAvailable calls public auth endpoint when method exists", async () => {
    const { api } = await import("../api");

    if (!api.usernameAvailable) {
      return;
    }

    fetch.mockResolvedValueOnce(await okJson({ username: "alice", available: true }));

    const response = await api.usernameAvailable("alice");

    expect(response.available).toBe(true);
    expect(fetch.mock.calls[0][0]).toContain("/auth/username-available?username=alice");
  });

  it("does not rotate the refresh cookie when 401 means the device is missing", async () => {
    const { call, setToken } = await import("../api");
    setToken("jwt-token");

    fetch.mockResolvedValueOnce(await failJson(401, "Unauthorized", {
      message: "Current device is not registered or inactive",
    }));

    await expect(call("/messages/chat/1/timeline")).rejects.toMatchObject({
      message: "Current device is not registered or inactive",
      status: 401,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).not.toContain("/auth/refresh");
  });

  it("auto-refreshes a generic 401 and retries the original request", async () => {
    const { call, getToken, setToken } = await import("../api");
    setToken("jwt-expired");

    fetch
      .mockResolvedValueOnce(await failJson(401, "Unauthorized", { message: "Unauthorized" }))
      .mockResolvedValueOnce(await okJson({ token: "jwt-fresh" }))
      .mockResolvedValueOnce(await okJson({ chats: [] }));

    await expect(call("/chats/my")).resolves.toEqual({ chats: [] });
    expect(getToken()).toBe("jwt-fresh");
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining("/chats/my"),
      expect.stringContaining("/auth/refresh"),
      expect.stringContaining("/chats/my"),
    ]);
  });
});