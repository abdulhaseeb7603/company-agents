#!/bin/sh
set -e

# Run onboard with defaults if not yet configured
if [ ! -f /paperclip/instances/default/config.json ]; then
  echo "First run — running onboard with defaults..."
  paperclipai onboard --yes --data-dir /paperclip
fi

# Start Paperclip
exec paperclipai run --data-dir /paperclip "$@"
