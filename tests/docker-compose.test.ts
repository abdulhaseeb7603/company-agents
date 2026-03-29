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

  it("includes hermes-worker service", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services["hermes-worker"]).toBeDefined();
    expect(parsed.services["hermes-worker"].build.dockerfile).toBe("docker/Dockerfile.hermes");
  });

  it("always includes security options on hermes-worker", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    const worker = parsed.services["hermes-worker"];
    expect(worker.security_opt).toContain("no-new-privileges:true");
    expect(worker.cap_drop).toContain("ALL");
    expect(worker.cap_add).toContain("NET_RAW");
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

  it("hermes-worker depends on healthy paperclip", () => {
    const parsed = YAML.parse(generateDockerCompose(baseConfig));
    expect(parsed.services["hermes-worker"].depends_on.paperclip.condition).toBe("service_healthy");
  });
});
