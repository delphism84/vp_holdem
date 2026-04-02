#!/bin/sh
# FE Playwright 검수 + Mongo betHistory 비율 검수
set -e
cd "$(dirname "$0")"
export QA_BASE_URL="${QA_BASE_URL:-https://game.kingofzeusfin.com}"
export MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017}"

mkdir -p test-results
npm install --silent 2>/dev/null || npm install
npx playwright install chromium

echo "=== Playwright (2P FE) QA_BASE_URL=$QA_BASE_URL ==="
npx playwright test

echo "=== Mongo betHistory 분포 검수 ==="
node scripts/verify-bet-distribution.mjs

echo "=== QA 완료 ==="
