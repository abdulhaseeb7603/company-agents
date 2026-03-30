#!/bin/sh
set -e

# Auto-onboard on first run if no config exists
if [ ! -f "$HOME/.openclaw/openclaw.json" ]; then
  openclaw onboard \
    --non-interactive \
    --accept-risk \
    --auth-choice "${AUTH_CHOICE:-openrouter-api-key}" \
    --openrouter-api-key "${OPENROUTER_API_KEY:-}" \
    --gateway-port "${OPENCLAW_GATEWAY_PORT:-42617}" \
    --skip-health 2>/dev/null || true

  if [ ! -f "$HOME/.openclaw/openclaw.json" ]; then
    echo "ERROR: openclaw onboard failed and no config was created."
    echo "Check your API key and provider settings."
    exit 1
  fi
fi

exec openclaw "$@"
