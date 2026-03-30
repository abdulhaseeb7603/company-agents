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
      ports: [`\${DASHBOARD_PORT:-${config.dashboardPort}}:3100`],
      environment: [
        "HOST=0.0.0.0",
        "PAPERCLIP_HOME=/paperclip",
        "PAPERCLIP_DEPLOYMENT_MODE=authenticated",
        "PAPERCLIP_PUBLIC_URL=${PUBLIC_URL:-http://localhost:3100}",
        "ANTHROPIC_API_KEY=${LLM_API_KEY:-}",
      ],
      volumes: ["paperclip-data:/paperclip"],
      healthcheck: {
        test: ["CMD", "curl", "-sf", "http://localhost:3100/api/health"],
        interval: "10s",
        timeout: "5s",
        retries: 5,
      },
      networks: ["internal"],
    },
    zeroclaw: {
      build: {
        context: ".",
        dockerfile: "docker/Dockerfile.zeroclaw",
      },
      restart: "unless-stopped",
      environment: [
        "PROVIDER=${LLM_PROVIDER:-openrouter}",
        "API_KEY=${LLM_API_KEY}",
        "ZEROCLAW_MODEL=${DEFAULT_MODEL:-anthropic/claude-sonnet-4}",
        "ZEROCLAW_GATEWAY_PORT=42617",
      ],
      volumes: ["zeroclaw-data:/root/.zeroclaw"],
      command: ["daemon"],
      depends_on: {
        paperclip: { condition: "service_healthy" },
      },
      networks: ["internal", "llm-egress", "internet-egress"],
    },
  };

  if (config.enableSearxng) {
    services.searxng = {
      image: "searxng/searxng:latest",
      profiles: ["search"],
      networks: ["internal", "internet-egress"],
    };
  }

  if (config.enableCaddy) {
    services.caddy = {
      image: "caddy:2-alpine",
      profiles: ["production"],
      ports: ["80:80", "443:443"],
      volumes: [
        "./Caddyfile:/etc/caddy/Caddyfile",
        "caddy-data:/data",
      ],
      networks: ["internal"],
    };
  }

  const compose = {
    services,
    networks: {
      internal: { internal: true },
      "llm-egress": { driver: "bridge" },
      "internet-egress": { driver: "bridge" },
    },
    volumes: {
      "paperclip-data": null,
      "zeroclaw-data": null,
      ...(config.enableCaddy ? { "caddy-data": null } : {}),
    },
  };

  return YAML.stringify(compose, { lineWidth: 0 });
}
