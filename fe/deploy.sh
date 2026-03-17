#!/bin/sh
# npm run build 후 빌드 결과를 nginx 문서 루트로 복사
# - 로컬 확인: npm run dev
# - 빌드·nginx 반영: npm run deploy (기본값: game.fairshipstore.com이 바라보는 /var/www/fairshipstore)
# - 다른 경로: DEPLOY_DIR=/path npm run deploy
set -e
cd "$(dirname "$0")"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/fairshipstore}"
echo "Building..."
npm run build
echo "Copying dist/ to $DEPLOY_DIR ..."
mkdir -p "$DEPLOY_DIR"
cp -ra dist/. "$DEPLOY_DIR"
echo "Deployed to $DEPLOY_DIR"
