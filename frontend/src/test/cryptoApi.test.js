import { describe, expect, it, vi } from "vitest";
import { createCryptoApi, cryptoHttpError } from "../cryptoApi";

describe("crypto HTTP adapter", () => {
  it("attaches status and code so the engine can recognize a missing device", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ message: "Current device is not registered", code: "DEVICE_MISSING" }),
    })));

    const api = createCryptoApi({
      token: "jwt",
      deviceId: "device-1",
      baseUrl: "https://example.test",
    });

    await expect(api("/api/crypto/devices/current/prekeys", { method: "GET" }))
      .rejects.toMatchObject({
        status: 404,
        code: "DEVICE_MISSING",
        message: "Current device is not registered",
      });
  });

  it("builds the same error shape the engine already checks", () => {
    const error = cryptoHttpError(401, "Unauthorized", { message: "inactive device" });
    expect(error.status).toBe(401);
    expect(error.message).toBe("inactive device");
  });

  it("reads device id on each request so a reset identity is sent", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    let deviceId = "device-old";
    const api = createCryptoApi({
      deviceId: () => deviceId,
      baseUrl: "https://example.test",
    });

    await api("/one");
    deviceId = "device-new";
    await api("/two");

    expect(fetchMock.mock.calls[0][1].headers["X-Device-Id"]).toBe("device-old");
    expect(fetchMock.mock.calls[1][1].headers["X-Device-Id"]).toBe("device-new");
  });
});
