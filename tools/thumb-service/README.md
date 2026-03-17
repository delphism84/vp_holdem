# 스트림 썸네일 자동 생성 서비스

SRS HTTP API로 퍼블리시 여부를 확인하고, **RTMP 라이브 시 10초마다**, **미퍼블리시 시 1분마다** ffmpeg로 한 프레임을 캡처해 `live/thumb/{streamId}.jpg`에 저장합니다.

## 요구사항

- Node.js 18+
- ffmpeg (RTMP 입력 지원)
- SRS 서버가 동작 중 (HTTP API 1985, RTMP 1935)

## 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `SRS_API_URL` | `http://127.0.0.1:1985` | SRS HTTP API 주소 |
| `THUMB_OUT_DIR` | `/var/www/static/live/thumb` | 썸네일 jpg 저장 디렉터리 |
| `RTMP_BASE` | `rtmp://127.0.0.1:1935/live` | RTMP URL 접두사 |
| `INTERVAL_LIVE_SEC` | `10` | 라이브일 때 캡처 간격(초) |
| `INTERVAL_FALLBACK_SEC` | `60` | 미퍼블리시일 때 캡처 간격(초) |
| `STREAM_IDS` | table01_01~16 | 쉼표 구분 스트림 ID (비우면 table01_01~16) |
| `CAPTURE_TIMEOUT_MS` | `8000` | ffmpeg 캡처 타임아웃(ms) |

## 실행

```bash
cd tools/thumb-service
npm start
# 또는
node thumb-snapshot.mjs
```

## 스트림 서버에 설치 (systemd)

1. 썸네일 스크립트를 SRS 스크립트 디렉터리로 복사:

   ```bash
   cp thumb-snapshot.mjs /var/www/@rc-streamserver/srs/srs-server-6.0-b0/trunk/scripts/
   ```

2. 썸네일 출력 디렉터리 생성:

   ```bash
   mkdir -p /var/www/static/live/thumb
   ```

3. systemd 유닛 설치:

   ```bash
   sudo cp rc-thumb-snapshot.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now rc-thumb-snapshot.service
   ```

4. **웹 서버(nginx 등)**에서 `https://stream.fairshipstore.com/live/thumb/` 를 위 디렉터리로 서빙하도록 설정:

   ```nginx
   location /live/thumb/ {
       alias /var/www/static/live/thumb/;
       add_header Cache-Control "public, max-age=5";
   }
   ```

## 백업 참고 (srs-backup)

- `cleanup-srs-thumbs`: 예전에는 `thumbs` 디렉터리 7일 이상 jpg 삭제. 현재 서비스는 `thumb` 디렉터리를 사용하므로, 필요 시 cron에서 `thumb` 경로로 정리 스크립트를 수정해 사용하면 됨.
