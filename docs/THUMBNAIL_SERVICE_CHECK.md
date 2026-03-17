# 썸네일 자동 생성 서비스 점검

## 1. 현재 구조

| 구분 | 위치 | 역할 |
|------|------|------|
| **썸네일 소비** | `fe/src/pages/LobbyPage.tsx` | `https://stream.zenithlucky.com/live/thumb/{streamId}.jpg` 로 `<img>` 요청, 실패 시 `card_back.png` 로 대체 |
| **썸네일 제공** | **이 레포 외부** | `stream.zenithlucky.com` 서버가 `/live/thumb/*.jpg` 를 서빙해야 함 |
| **자동 생성 로직** | **없음** | 이 레포에는 스트림 썸네일을 **생성**하는 스크립트/API 없음. (카드·칩·아바타용 `tools/generate-*.mjs` 는 게임 에셋용) |

즉, **썸네일 자동 생성 서비스는 이 코드베이스에 없고**, 외부 스트림 서버에서 해당 URL 로 이미지를 내려줘야 동작합니다.

---

## 2. URL 점검 결과 (2026-03-11)

| URL | HTTP 상태 | 비고 |
|-----|-----------|------|
| `https://stream.zenithlucky.com/live/thumb/table01_01.jpg` | **404** | 미서빙 |
| `https://stream.zenithlucky.com/live/thumb/table01_02.jpg` | **404** | 미서빙 |
| `https://stream.zenithlucky.com/live/thumb/table01_16.jpg` | **404** | 미서빙 |

- 서버: nginx/1.24.0
- table01_01 ~ table01_16 전부 동일 경로 패턴이면, 현재는 **썸네일이 서빙되지 않는 상태**로 보는 것이 맞음.

---

## 3. 프론트 동작

- **LobbyPage**: 썸네일 요청 실패 시 `onError` 로 `/assets/cards/card_back.png` 로 대체하므로, **404 여도 화면은 깨지지 않고 카드 뒷면으로 표시**됨.
- 사용자 경험만 보면 “썸네일이 안 나오고 기본 이미지로 나온다” 수준.

---

## 4. 조치 제안

1. **stream.zenithlucky.com 서버**
   - `/live/thumb/` 경로에 대해
     - 실제 썸네일 파일을 두고 정적 서빙하거나,
     - 스트림 프레임 캡처 등으로 썸네일을 생성해 주는 서비스로 프록시
   - nginx(또는 해당 서비스)에서 `table01_XX.jpg` 요청 시 200 + 이미지 응답이 나오도록 설정

2. **이 레포에서 썸네일 생성 서비스를 만들 경우**
   - 예: BE 에 `GET /api/thumb/:streamId` 추가 후, 외부 스트림/캡처 API 호출 또는 로컬 생성 후 이미지 반환
   - FE 는 기존처럼 고정 URL 을 쓰거나, 이 API URL 로 바꾸면 됨.

3. **당장 서버 수정이 어려우면**
   - FE 의 404 대체 이미지(card_back) 동작은 유지하고,
   - 썸네일 자동 생성/서빙은 stream 서버 또는 별도 서비스 구현 후 위 URL 이 200 을 반환하도록 맞추면 됨.

---

## 5. 요약

| 항목 | 상태 |
|------|------|
| 썸네일 **자동 생성** 서비스 (이 레포) | ❌ 없음 |
| 썸네일 **URL 서빙** (stream.zenithlucky.com) | ❌ 404, 미동작 |
| 라이브 썸네일 **소비** (LobbyPage) | ✅ URL 요청 + 404 시 카드 뒷면 대체 동작 |

**결론:** 썸네일 자동 생성 서비스는 **구현되어 있지 않고**, 썸네일을 제공할 URL 도 현재 **서빙되지 않음**. 서빙을 켜려면 `stream.zenithlucky.com` 측에서 `/live/thumb/*.jpg` 를 서빙하거나, 이 레포에 썸네일 생성/프록시 API를 추가해 줄 필요가 있음.

---

## 6. 썸네일 자동 생성 서비스 구현 (추가)

- **위치**: `tools/thumb-service/`
- **동작**: SRS API로 퍼블리시 여부 확인 → RTMP 라이브 시 **10초마다**, 미퍼블리시 시 **1분마다** ffmpeg로 한 프레임 캡처 → `THUMB_OUT_DIR`(기본 `/var/www/static/live/thumb`)/`{streamId}.jpg` 저장.
- **실행**: `node thumb-snapshot.mjs` 또는 systemd `rc-thumb-snapshot.service` 사용.
- **상세**: `tools/thumb-service/README.md` 참고.
