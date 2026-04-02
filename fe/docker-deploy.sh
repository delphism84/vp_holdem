#!/bin/sh
# Docker 이미지 빌드 → /var/zenithpark/fe/dist 로 내보내기 → 호스트 nginx reload
# 기존 nginx server 블록은 수정하지 않음 (root 는 이미 /var/zenithpark/fe/dist)
set -e
cd "$(dirname "$0")"
echo "[docker-deploy] building zenithpark-fe..."
docker compose build --no-cache
echo "[docker-deploy] exporting dist to /var/zenithpark/fe/dist ..."
docker compose run --rm zenithpark-fe
if command -v systemctl >/dev/null 2>&1; then
  echo "[docker-deploy] reloading nginx..."
  sudo nginx -t && sudo systemctl reload nginx
fi
echo "[docker-deploy] done."
