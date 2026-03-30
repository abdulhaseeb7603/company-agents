import { describe, it, expect } from "vitest";
import { generateEnv } from "../src/generators/env.js";

describe("generateEnv", () => {
  it("includes LLM_API_KEY", () => {
    const output = generateEnv({ apiKey: "sk-test-123", model: "anthropic/claude-sonnet-4", dashboardPort: 3100 });
    expect(output).toContain('LLM_API_KEY="sk-test-123"');
  });

  it("includes DEFAULT_MODEL", () => {
    const output = generateEnv({ apiKey: "sk-test", model: "anthropic/claude-sonnet-4", dashboardPort: 3100 });
    expect(output).toContain('DEFAULT_MODEL="anthropic/claude-sonnet-4"');
  });

  it("includes DASHBOARD_PORT", () => {
    const output = generateEnv({ apiKey: "sk-test", model: "test-model", dashboardPort: 4000 });
    expect(output).toContain("DASHBOARD_PORT=4000");
  });

  it("includes LLM_PROVIDER", () => {
    const output = generateEnv({ apiKey: "sk-test", model: "test", provider: "anthropic", dashboardPort: 3100 });
    expect(output).toContain('LLM_PROVIDER="anthropic"');
  });

  it("defaults LLM_PROVIDER to openrouter", () => {
    const output = generateEnv({ apiKey: "sk-test", model: "test", dashboardPort: 3100 });
    expect(output).toContain('LLM_PROVIDER="openrouter"');
  });

  it("includes GATEWAY_PORT", () => {
    const output = generateEnv({ apiKey: "sk-test", model: "test", dashboardPort: 3100, gatewayPort: 9999 });
    expect(output).toContain("GATEWAY_PORT=9999");
  });

  it("includes PUBLIC_URL when provided", () => {
    const output = generateEnv({ apiKey: "sk-test", model: "test", dashboardPort: 3100, publicUrl: "https://mysite.com" });
    expect(output).toContain('PUBLIC_URL="https://mysite.com"');
  });

  it("does not include secrets in comments", () => {
    const output = generateEnv({ apiKey: "sk-secret-key", model: "test", dashboardPort: 3100 });
    const comments = output.split("\n").filter((l: string) => l.startsWith("#"));
    for (const line of comments) {
      expect(line).not.toContain("sk-secret-key");
    }
  });
});
