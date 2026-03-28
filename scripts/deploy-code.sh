#!/usr/bin/env bash
# Deploy application files only. Never ships SQLite files or .env.
# Usage: ./scripts/deploy-code.sh user@host:/path/to/app
# Requires: ssh, tar (rsync optional on remote for pull-based deploys)

set -euo pipefail

if [[ "${1:-}" == "" ]]; then
  echo "Usage: $0 user@host:remote_dir"
  echo "Example: $0 ubuntu@example.com:/var/www/healthnet"
  exit 1
fi

DEST_SPEC="$1"
# Strip optional trailing slash from host:path
REMOTE="${DEST_SPEC%/}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ARCHIVE="$(mktemp /tmp/healthnet-deploy-XXXXXX.tar.gz)"
cleanup() { rm -f "$ARCHIVE"; }
trap cleanup EXIT

echo "==> Building archive (excluding databases, env, deps)..."
tar czf "$ARCHIVE" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=out \
  --exclude=.git \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.db' \
  --exclude='*.db-journal' \
  --exclude='*.db-wal' \
  --exclude='*.db-shm' \
  --exclude='*.pem' \
  --exclude=data \
  .

echo "==> Uploading to $REMOTE ..."
# remote path after colon
RHOST="${REMOTE%%:*}"
RDIR="${REMOTE#*:}"
ssh -o BatchMode=yes "$RHOST" "mkdir -p '$RDIR'"
scp -q "$ARCHIVE" "$RHOST:/tmp/healthnet-deploy.tgz"
ssh -o BatchMode=yes "$RHOST" "tar xzf /tmp/healthnet-deploy.tgz -C '$RDIR' && rm -f /tmp/healthnet-deploy.tgz"

echo "==> Done. On the server, run (example):"
echo "    cd $RDIR"
echo "    export DATABASE_URL=file:./data/live.db"
echo "    export HEALTHNET_DATABASE_ROLE=live"
echo "    npx prisma migrate deploy"
echo "    npm ci && npm run build"
echo "    pm2 restart healthnet --update-env"
