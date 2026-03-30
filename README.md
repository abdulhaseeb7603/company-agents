# Company Agents

Deploy a team of AI agents that run your business. One command. No config files.

Company Agents sets up a fully autonomous AI workforce — with org charts, budgets, goals, persistent memory, and internet access — running on your own machine or VPS.

Built on [Paperclip](https://github.com/paperclipai/paperclip) (38K stars) for orchestration and [ZeroClaw](https://github.com/openagen/zeroclaw) for agent execution.

---

## Quick Start

```bash
npx create-company-agents
```

That's it. The wizard handles everything else.

---

## What Happens When You Run It

**Step 1** — The wizard asks 4 questions:

```
? Where will you deploy?          → Local Docker
? Choose your LLM provider:       → OpenRouter / Anthropic / OpenAI
? Enter your API key:             → sk-...
? Choose a company template:      → Content Agency (5 agents)
```

**Step 2** — It automatically:
- Generates Docker Compose config
- Creates agent identities and personalities
- Starts Paperclip (dashboard + orchestration)
- Starts ZeroClaw (agent runtime, 8.8MB Rust binary)
- Seeds your company: agents, goals, budgets, tasks
- Prints your dashboard URL

**Step 3** — Open `http://localhost:3100` and watch your agents work.

---

## Prerequisites

- **Docker** — [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js 20+** — [Install Node.js](https://nodejs.org/)
- **An API key** from [OpenRouter](https://openrouter.ai/), [Anthropic](https://console.anthropic.com/), or [OpenAI](https://platform.openai.com/)

---

## Company Templates

Pick a pre-built team or create your own.

### Content Agency (5 agents)

| Agent | Role | Heartbeat |
|-------|------|-----------|
| Creative Director | Manages team, reviews all output | Weekdays 9am |
| Content Writer | Blog posts, articles, long-form | Weekdays 9am, 2pm |
| Social Manager | Social media posts, scheduling | Daily 8am |
| SEO Analyst | Keyword research, optimization | Weekdays 10am |
| Visual Designer | Graphics, banners, visual assets | Weekdays 9am |

### Research Firm (4 agents)

| Agent | Role | Heartbeat |
|-------|------|-----------|
| Research Director | Assigns research tasks, reviews | Weekdays 9am |
| Research Analyst | Deep-dive analysis, reports | Weekdays 9am, 3pm |
| Data Scientist | Data analysis, visualization | Weekdays 10am |
| Report Writer | Compiles findings into reports | Weekdays 2pm |

### Lead Generation (4 agents)

| Agent | Role | Heartbeat |
|-------|------|-----------|
| Sales Director | Strategy, pipeline management | Weekdays 9am |
| Outreach Specialist | Prospecting, cold outreach | Weekdays 9am, 1pm |
| CRM Manager | Lead tracking, follow-ups | Daily 8am |
| Copywriter | Email copy, landing pages | Weekdays 10am |

---

## CLI Commands

After setup, manage your company from the terminal:

```bash
company-agents status            # Container health + agent overview
company-agents list <companyId>  # List all agents
company-agents logs <agent>      # See what an agent has been doing
company-agents add <companyId>   # Hire a new agent (interactive)
company-agents remove <slug>     # Fire an agent
company-agents doctor            # System health check
company-agents deploy            # Push to VPS with auto-SSL
company-agents update            # Pull latest images, restart
company-agents destroy           # Tear everything down
```

---

## How It Works

```
┌─────────────────────────────────────────────────┐
│              Docker (your machine)                │
│                                                   │
│  ┌─────────────┐       WebSocket       ┌────────┐│
│  │  Paperclip  │◄─────────────────────►│ZeroClaw││
│  │  Port 3100  │  openclaw-gateway      │Port    ││
│  │             │  adapter               │42617   ││
│  │ - Dashboard │                        │        ││
│  │ - Org chart │  1. Heartbeat fires    │- Agent ││
│  │ - Budgets   │  2. Task sent via WS   │  brain ││
│  │ - Goals     │  3. Agent executes     │- Memory││
│  │ - Issues    │  4. Result returned    │- Tools ││
│  └─────────────┘                        └────────┘│
└─────────────────────────────────────────────────┘
```

**Paperclip** is the control plane — it manages who does what, when, and tracks spending.

**ZeroClaw** is the execution engine — it runs agents with persistent memory, tool use, and LLM calls.

They communicate via WebSocket through the OpenClaw Gateway protocol.

### The Heartbeat Cycle

1. Paperclip checks the agent's cron schedule (e.g., weekdays 9am)
2. Finds the highest-priority unfinished task for that agent
3. Sends the task to ZeroClaw via WebSocket
4. ZeroClaw loads the agent's identity + memory, calls the LLM, uses tools
5. Result streams back to Paperclip, logged on the issue
6. Budget is deducted based on token usage
7. Agent memory is persisted for next session

---

## What Each Agent Gets

Every agent has its own workspace:

```
agents/<slug>/.zeroclaw/
├── config.toml                # LLM model, provider, gateway config
└── workspace/
    ├── IDENTITY.md            # Name, role, organization
    ├── SOUL.md                # Personality, behavior, communication style
    ├── MEMORY.md              # Persistent memory (grows over time)
    └── USER.md                # User preferences (grows over time)
```

- **IDENTITY.md** — "I am Content Writer at Content Agency"
- **SOUL.md** — "I write in a professional but engaging tone. I always cite sources."
- **MEMORY.md** — Agent remembers context across sessions
- **Budget** — Each agent has a spending cap. Manager agents review subordinate spend
- **Heartbeat** — Cron schedule for when the agent checks in and works
- **Goals** — Tracked in the Paperclip dashboard with progress updates

---

## Agent Capabilities

### Built-in Tools
- Shell execution (sandboxed)
- File read/write
- Git operations
- HTTP requests
- Browser automation (Playwright)
- Screenshots
- Persistent memory (SQLite-backed hybrid vector + keyword search)

### Internet Access (optional per agent)
- **Jina Reader** — Read any web page as clean text
- **xreach** — Twitter/X reading via cookie auth
- **yt-dlp** — YouTube transcripts from any video
- **SearXNG** — Self-hosted private search engine
- **DuckDuckGo** — Free web search (always available)

### LLM Providers
- **OpenRouter** — 200+ models, pay-per-token
- **Anthropic** — Claude directly
- **OpenAI** — GPT models directly

---

## Security

- **3 isolated Docker networks**: `internal` (agents ↔ orchestrator only), `llm-egress` (LLM API calls), `internet-egress` (only agents with internet tools)
- **Non-root containers** — both Paperclip and ZeroClaw run as unprivileged users
- **Workspace sandboxing** — ZeroClaw blocks access to 14 system directories and dotfiles
- **Budget caps** — no agent can overspend its allocation
- **No data leaves your machine** — everything runs locally, API keys stay in your `.env`

---

## Deploy to VPS

```bash
company-agents deploy
```

Prompts for SSH credentials and domain name, then:
1. Copies your project to the remote server
2. Starts Docker with Caddy for automatic HTTPS
3. Your dashboard is live at `https://yourdomain.com`

---

## Persona Translator

Import any of the **144 agent templates** from [agency-agents](https://github.com/msitarzewski/agency-agents) (65K stars) and automatically convert them to ZeroClaw format:

```
agency-agents template          →  ZeroClaw workspace
─────────────────────────────      ──────────────────
Your Identity & Memory          →  IDENTITY.md
Your Core Mission               →  SOUL.md (Your Role)
Your Workflow Process            →  SOUL.md (How You Work)
Your Technical Deliverables      →  SOUL.md (What You Deliver)
Your Communication Style         →  SOUL.md (Communication Style)
Critical Rules You Must Follow   →  SOUL.md (What to Avoid)
```

---

## Project Structure

```
create-company-agents/
├── src/
│   ├── index.ts                 # CLI entry point (Commander.js)
│   ├── schemas.ts               # Zod schemas for validation
│   ├── types.ts                 # TypeScript interfaces
│   ├── commands/
│   │   ├── init.ts              # Setup wizard
│   │   ├── status.ts            # Container + agent health
│   │   ├── list.ts              # List agents
│   │   ├── add.ts               # Add new agent (interactive)
│   │   ├── remove.ts            # Remove agent
│   │   ├── logs.ts              # Agent logs
│   │   ├── doctor.ts            # System diagnostics
│   │   ├── deploy.ts            # VPS deployment
│   │   ├── update.ts            # Pull + restart
│   │   └── destroy.ts           # Teardown
│   ├── generators/
│   │   ├── docker-compose.ts    # Docker Compose YAML generator
│   │   ├── hermes-home.ts       # Agent workspace generator
│   │   ├── env.ts               # .env file generator
│   │   └── caddyfile.ts         # Caddy reverse proxy config
│   ├── paperclip/
│   │   ├── client.ts            # Paperclip REST API client
│   │   └── seeder.ts            # Company + agent seeder
│   └── persona/
│       └── translator.ts        # agency-agents → ZeroClaw converter
├── docker/
│   ├── Dockerfile.paperclip     # Paperclip + OpenClaw adapter
│   └── Dockerfile.zeroclaw      # ZeroClaw binary (7MB)
├── templates/                   # Pre-built company YAML templates
├── personas/                    # Agent personality files
├── tests/                       # 58 tests (Vitest)
└── package.json
```

---

## Development

```bash
git clone https://github.com/abdulhaseeb7603/company-agents.git
cd company-agents
pnpm install
pnpm test          # 58 tests
pnpm build         # TypeScript → dist/
```

---

## Built With

| Project | Stars | Role |
|---------|-------|------|
| [Paperclip](https://github.com/paperclipai/paperclip) | 38K | Agent orchestration, dashboard, budgets, governance |
| [ZeroClaw](https://github.com/openagen/zeroclaw) | 1.6K | Agent runtime, memory, tools, gateway (8.8MB Rust binary) |
| [agency-agents](https://github.com/msitarzewski/agency-agents) | 65K | 144 agent persona templates |

---

## License

MIT
