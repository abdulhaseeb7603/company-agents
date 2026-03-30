import YAML from "yaml";

interface ComposeConfig {
  dashboardPort: number;
  internetTools: string[];
  enableSearxng: boolean;
  enableCaddy: boolean;
}

export function generateDockerCompose(config: ComposeConfig): string {
  const services: Record<string, unknown> = {
    paperclip: {
      image: "company-agents-paperclip",
      build: {
        context: ".",
        dockerfile: "docker/Dockerfile.paperclip",
      },
      network_mode: "host",
      environment: [
        "PAPERCLIP_HOME=/paperclip",
        "ANTHROPIC_API_KEY=${LLM_API_KEY:-}",
      ],
      volumes: ["paperclip-data:/paperclip"],
      healthcheck: {
        test: ["CMD", "curl", "-sf", "http://127.0.0.1:3100/api/health"],
        interval: "10s",
        timeout: "5s",
        retries: 5,
      },
    },
    openclaw: {
      build: {
        context: ".",
        dockerfile: "docker/Dockerfile.openclaw",
      },
      network_mode: "host",
      restart: "unless-stopped",
      environment: [
        "OPENCLAW_PROVIDER=${LLM_PROVIDER:-openrouter}",
        "OPENROUTER_API_KEY=${LLM_API_KEY}",
        "OPENCLAW_MODEL=${DEFAULT_MODEL:-anthropic/claude-sonnet-4}",
        "OPENCLAW_GATEWAY_PORT=42617",
      ],
      volumes: ["openclaw-data:/openclaw-data"],
      command: ["gateway", "run", "--port", "42617"],
      depends_on: {
        paperclip: { condition: "service_healthy" },
      },
    },
  };

  if (config.enableSearxng) {
    services.searxng = {
      image: "searxng/searxng:latest",
      network_mode: "host",
    };
  }

  if (config.enableCaddy) {
    services.caddy = {
      image: "caddy:2-alpine",
      profiles: ["production"],
      network_mode: "host",
      volumes: [
        "./Caddyfile:/etc/caddy/Caddyfile",
        "caddy-data:/data",
      ],
    };
  }

  const compose = {
    services,
    volumes: {
      "paperclip-data": null,
      "openclaw-data": null,
      ...(config.enableCaddy ? { "caddy-data": null } : {}),
    },
  };

  return YAML.stringify(compose, { lineWidth: 0 });
}
