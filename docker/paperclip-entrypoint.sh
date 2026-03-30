#!/bin/sh
set -e

CONFIG="/paperclip/instances/default/config.json"

# Run Paperclip onboard with defaults if not yet configured
if [ ! -f "$CONFIG" ]; then
  echo "First run — running onboard with defaults..."
  paperclipai onboard --yes --data-dir /paperclip

  # Patch config: bind to all interfaces for Docker network access
  node -e "
    const fs = require('fs');
    const configPath = process.argv[1];
    const c = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    c.server = c.server || {};
    c.server.deploymentMode = 'local_trusted';
    c.server.exposure = 'local';
    c.server.host = '0.0.0.0';
    c.server.port = 3100;
    c.server.allowedHostnames = [
      'localhost', '127.0.0.1', '0.0.0.0',
      'paperclip', 'openclaw'
    ];
    fs.writeFileSync(configPath, JSON.stringify(c, null, 2));
    console.log('Patched config: local_trusted on 0.0.0.0:3100');
  " "$CONFIG"
fi

exec paperclipai run --data-dir /paperclip --no-repair "$@"
