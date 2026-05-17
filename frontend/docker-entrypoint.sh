#!/bin/sh
set -eu

# Write runtime config from env vars. Overwrites the placeholder shipped in the image.
cat > /app/dist/config.js <<EOF
window.__APP_CONFIG__ = {
  API_URL: "${VITE_API_URL:-}",
  STAGE: "${VITE_STAGE:-}",
  AUTH0_DOMAIN: "${VITE_AUTH0_DOMAIN:-}",
  AUTH0_CLIENT_ID: "${VITE_AUTH0_CLIENT_ID:-}",
  AUTH0_AUDIENCE: "${VITE_AUTH0_AUDIENCE:-}"
};
EOF

exec "$@"
