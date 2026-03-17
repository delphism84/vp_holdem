#!/usr/bin/env bash
# 포트 5173 사용 프로세스 종료 후 npm run dev 실행
set -e
PORT=5173
cd "$(dirname "$0")"

echo "Checking port ${PORT}..."
if command -v lsof &>/dev/null; then
  PIDS=$(lsof -ti :${PORT} 2>/dev/null || true)
elif command -v fuser &>/dev/null; then
  FUSER_OUT=$(fuser ${PORT}/tcp 2>/dev/null || true)
  PIDS=$(echo "$FUSER_OUT" | tr ' ' '\n' | grep -E '^[0-9]+$' || true)
else
  PIDS=""
fi

if [ -n "$PIDS" ]; then
  echo "Killing process(es) on port ${PORT}: $PIDS"
  for pid in $PIDS; do
    kill -9 "$pid" 2>/dev/null || true
  done
  sleep 1
else
  echo "No process found on port ${PORT}."
fi

echo "Starting npm run dev..."
exec npm run dev
