#!/bin/sh
set -e

# Setup HERMES_HOME directories if not present
HERMES_HOME="${HERMES_HOME:-/opt/data}"
mkdir -p "$HERMES_HOME/memories" "$HERMES_HOME/skills" "$HERMES_HOME/sessions" \
         "$HERMES_HOME/logs" "$HERMES_HOME/hooks" "$HERMES_HOME/cron"

# Seed default SOUL.md if missing
if [ ! -f "$HERMES_HOME/SOUL.md" ]; then
  echo "# Personality" > "$HERMES_HOME/SOUL.md"
  echo "" >> "$HERMES_HOME/SOUL.md"
  echo "You are a professional AI agent working as an employee." >> "$HERMES_HOME/SOUL.md"
fi

# Seed default config.yaml if missing
if [ ! -f "$HERMES_HOME/config.yaml" ]; then
  cat > "$HERMES_HOME/config.yaml" << 'YAML'
model: ${DEFAULT_MODEL:-anthropic/claude-sonnet-4}
provider: openrouter
terminal:
  backend: local
memory:
  memory_enabled: true
  user_profile_enabled: true
YAML
fi

# Run Paperclip onboard with defaults if not yet configured
if [ ! -f /paperclip/instances/default/config.json ]; then
  echo "First run — running onboard with defaults..."
  paperclipai onboard --yes --data-dir /paperclip
fi

# Start Paperclip
exec paperclipai run --data-dir /paperclip "$@"
