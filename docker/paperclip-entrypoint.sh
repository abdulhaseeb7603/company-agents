#!/bin/sh
set -e

CONFIG="/paperclip/instances/default/config.json"

# Run Paperclip onboard with defaults if not yet configured
if [ ! -f "$CONFIG" ]; then
  echo "First run — running onboard with defaults..."
  paperclipai onboard --yes --data-dir /paperclip

  # Patch config for Docker: local_trusted + loopback binding
  node -e "
    const fs = require('fs');
    const c = JSON.parse(fs.readFileSync('$CONFIG', 'utf8'));
    c.server.deploymentMode = 'local_trusted';
    c.server.exposure = 'local';
    c.server.host = '127.0.0.1';
    c.server.port = 3100;
    fs.writeFileSync('$CONFIG', JSON.stringify(c, null, 2));
    console.log('Patched config: local_trusted on 127.0.0.1:3100');
  "
fi

# Start Paperclip
exec paperclipai run --data-dir /paperclip "$@"
