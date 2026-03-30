import { describe, it, expect } from "vitest";
import YAML from "yaml";
import { generateDockerCompose } from "../src/generators/docker-compose.js";

describe("generateDockerCompose", () => {
  const baseConfig = {
    dashboardPort: 3100,
    internetTools: [] as string[],
    enableSearxng: false,
    enableCaddy: false,
  };

  it("generates valid YAML", () => {
    const output = generateDockerCompose(baseConfig);
    const parsed = YAML.parse(output);
    expect(parsed).toBeDefined();
    expect(parsed.services).toBeDefined();
  });

  it("includes paperclip service", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services.paperclip).toBeDefined();
    expect(parsed.services.paperclip.build.dockerfile).toBe("docker/Dockerfile.paperclip");
  });

  it("includes zeroclaw service built from Dockerfile", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services.zeroclaw).toBeDefined();
    expect(parsed.services.zeroclaw.build.dockerfile).toBe("docker/Dockerfile.zeroclaw");
    expect(parsed.services.zeroclaw.command).toContain("daemon");
  });

  it("zeroclaw depends on healthy paperclip", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services.zeroclaw.depends_on.paperclip.condition).toBe("service_healthy");
  });

  it("defines three networks", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.networks.internal).toBeDefined();
    expect(parsed.networks.internal.internal).toBe(true);
    expect(parsed.networks["llm-egress"]).toBeDefined();
    expect(parsed.networks["internet-egress"]).toBeDefined();
  });

  it("includes searxng only when enabled", () => {
    const without = YAML.parse(generateDockerCompose(baseConfig));
    expect(without.services.searxng).toBeUndefined();
    const withSearch = YAML.parse(generateDockerCompose({ ...baseConfig, enableSearxng: true }));
    expect(withSearch.services.searxng).toBeDefined();
    expect(withSearch.services.searxng.profiles).toContain("search");
  });

  it("includes caddy only when enabled", () => {
    const without = YAML.parse(generateDockerCompose(baseConfig));
    expect(without.services.caddy).toBeUndefined();
    const withCaddy = YAML.parse(generateDockerCompose({ ...baseConfig, enableCaddy: true }));
    expect(withCaddy.services.caddy).toBeDefined();
    expect(withCaddy.services.caddy.profiles).toContain("production");
  });

  it("uses DASHBOARD_PORT env var with default", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services.paperclip.ports[0]).toContain("${DASHBOARD_PORT:-3100}");
  });

  it("has healthcheck on paperclip service", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services.paperclip.healthcheck).toBeDefined();
    expect(parsed.services.paperclip.healthcheck.test).toContain("curl");
  });
});
