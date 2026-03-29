import { describe, it, expect, vi } from "vitest";
import { checkDocker, checkPort } from "../src/commands/doctor.js";

vi.mock("shelljs", () => ({
  default: {
    exec: vi.fn((cmd: string) => {
      if (cmd === "docker --version") {
        return { code: 0, stdout: "Docker version 24.0.0, build abc123" };
      }
      return { code: 1, stdout: "", stderr: "not found" };
    }),
  },
}));

describe("doctor", () => {
  it("checkDocker returns ok when docker is installed", () => {
    const result = checkDocker();
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Docker version");
  });

  it("checkPort returns not reachable for closed port", async () => {
    const result = await checkPort(19999);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not reachable");
  });
});
