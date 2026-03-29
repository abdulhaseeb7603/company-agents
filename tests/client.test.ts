import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaperclipClient } from "../src/paperclip/client.js";

describe("PaperclipClient", () => {
  let client: PaperclipClient;

  beforeEach(() => {
    client = new PaperclipClient("http://localhost:3100", "test-token");
    vi.restoreAllMocks();
  });

  it("sends Authorization header on all requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ status: "ok" })),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.healthCheck();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3100/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("uses correct path for agent keys", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ key: "ak-123" })),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.createAgentKey("agent-1");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3100/api/agents/agent-1/keys",
      expect.any(Object)
    );
  });

  it("throws on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: () => Promise.resolve({ error: "Invalid" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(client.createCompany("Test", "Mission text")).rejects.toThrow();
  });

  it("retries on network errors up to 3 times", async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: "ok" })),
      });
    vi.stubGlobal("fetch", mockFetch);

    const result = await client.healthCheck();
    expect(result.status).toBe("ok");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 409 Conflict", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: () => Promise.resolve({ error: "Already assigned" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(client.createCompany("Test", "Mission text here")).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
