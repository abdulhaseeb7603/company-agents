import YAML from "yaml";

interface ComposeConfig {
  dashboardPort: number;
  gatewayPort: number;
  internetTools: string[];
  enableSearxng: boolean;
  enableCaddy: boolean;
}

export function generateDockerCompose(config: ComposeConfig): string {
  const dp = config.dashboardPort;
  const gp = config.gatewayPort;

  const services: Record<string, unknown> = {
    paperclip: {
      image: "company-agents-paperclip",
      build: {
        context: ".",
        dockerfile: "docker/Dockerfile.paperclip",
      },
      networks: ["internal", "llm-egress"],
      ports: [`\${DASHBOARD_PORT:-${dp}}:${dp}`],
      environment: [
        "PAPERCLIP_HOME=/paperclip",
        "ANTHROPIC_API_KEY=${LLM_API_KEY:-}",
      ],
      volumes: ["paperclip-data:/paperclip"],
      healthcheck: {
        test: ["CMD", "curl", "-sf", `http://127.0.0.1:${dp}/api/health`],
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
      networks: ["internal", "llm-egress"],
      restart: "unless-stopped",
      environment: [
        "OPENCLAW_PROVIDER=${LLM_PROVIDER:-openrouter}",
        "OPENROUTER_API_KEY=${LLM_API_KEY}",
        `OPENCLAW_MODEL=\${DEFAULT_MODEL:-anthropic/claude-sonnet-4}`,
        `OPENCLAW_GATEWAY_PORT=${gp}`,
      ],
      volumes: ["openclaw-data:/openclaw-data"],
      command: ["gateway", "run", "--port", String(gp), "--host", "0.0.0.0"],
      depends_on: {
        paperclip: { condition: "service_healthy" },
      },
    },
  };

  if (config.enableSearxng) {
    services.searxng = {
      image: "searxng/searxng:latest",
      networks: ["internal", "internet-egress"],
      ports: ["8888:8888"],
    };
  }

  if (config.enableCaddy) {
    services.caddy = {
      image: "caddy:2-alpine",
      profiles: ["production"],
      networks: ["internal"],
      ports: ["80:80", "443:443"],
      volumes: [
        "./Caddyfile:/etc/caddy/Caddyfile",
        "caddy-data:/data",
      ],
    };
  }

  const compose: Record<string, unknown> = {
    services,
    networks: {
      internal: {
        internal: true,
        driver: "bridge",
      },
      "llm-egress": {
        driver: "bridge",
      },
      "internet-egress": {
        driver: "bridge",
      },
    },
    volumes: {
      "paperclip-data": null,
      "openclaw-data": null,
      ...(config.enableCaddy ? { "caddy-data": null } : {}),
    },
  };

  return YAML.stringify(compose, { lineWidth: 0 });
}
