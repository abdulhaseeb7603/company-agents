import { describe, it, expect } from "vitest";
import { generateCaddyfile } from "../src/generators/caddyfile.js";

describe("generateCaddyfile", () => {
  it("generates reverse proxy config for the domain", () => {
    const output = generateCaddyfile("example.com");
    expect(output).toContain("example.com");
    expect(output).toContain("reverse_proxy paperclip:3100");
  });

  it("works with subdomain", () => {
    const output = generateCaddyfile("app.example.com");
    expect(output).toContain("app.example.com");
  });
});
