#!/usr/bin/env bash
set -e
npx prisma migrate deploy
npm run db:seed
NODE_OPTIONS="--max-old-space-size=190" npm start &
WEB_PID=$!
NODE_OPTIONS="--max-old-space-size=250" npm run worker:postgres &
WORKER_PID=$!
shutdown(){ kill "$WEB_PID" "$WORKER_PID" 2>/dev/null || true; wait || true; }
trap shutdown SIGTERM SIGINT EXIT
while kill -0 "$WEB_PID" 2>/dev/null && kill -0 "$WORKER_PID" 2>/dev/null; do sleep 3; done
exit 1
