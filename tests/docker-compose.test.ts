import { describe, it, expect } from "vitest";
import YAML from "yaml";
import { generateDockerCompose } from "../src/generators/docker-compose.js";

describe("generateDockerCompose", () => {
  const baseConfig = {
    dashboardPort: 3100,
    gatewayPort: 42617,
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

  it("includes openclaw service built from Dockerfile", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services.openclaw).toBeDefined();
    expect(parsed.services.openclaw.build.dockerfile).toBe("docker/Dockerfile.openclaw");
  });

  it("openclaw depends on healthy paperclip", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services.openclaw.depends_on.paperclip.condition).toBe("service_healthy");
  });

  it("defines three isolated networks", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.networks.internal).toBeDefined();
    expect(parsed.networks.internal.internal).toBe(true);
    expect(parsed.networks["llm-egress"]).toBeDefined();
    expect(parsed.networks["internet-egress"]).toBeDefined();
  });

  it("assigns services to correct networks", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services.paperclip.networks).toContain("internal");
    expect(parsed.services.paperclip.networks).toContain("llm-egress");
    expect(parsed.services.openclaw.networks).toContain("internal");
    expect(parsed.services.paperclip.network_mode).toBeUndefined();
  });

  it("includes searxng only when enabled", () => {
    const without = YAML.parse(generateDockerCompose(baseConfig));
    expect(without.services.searxng).toBeUndefined();
    const withSearch = YAML.parse(generateDockerCompose({ ...baseConfig, enableSearxng: true }));
    expect(withSearch.services.searxng).toBeDefined();
    expect(withSearch.services.searxng.networks).toContain("internet-egress");
  });

  it("includes caddy only when enabled", () => {
    const without = YAML.parse(generateDockerCompose(baseConfig));
    expect(without.services.caddy).toBeUndefined();
    const withCaddy = YAML.parse(generateDockerCompose({ ...baseConfig, enableCaddy: true }));
    expect(withCaddy.services.caddy).toBeDefined();
  });

  it("has healthcheck on paperclip service", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services.paperclip.healthcheck).toBeDefined();
    expect(parsed.services.paperclip.healthcheck.test).toContain("curl");
  });

  it("exposes dashboard port via port mapping", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services.paperclip.ports).toBeDefined();
    expect(parsed.services.paperclip.ports[0]).toContain("3100");
  });
});
