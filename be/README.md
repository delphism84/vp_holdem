# Zenith Park BE

Node.js 백엔드.

- 바코드 WebSocket: **`/ws/barcodeserver`**
- 라이브 홀덤(싱글 루프 `tick_game`): **`/ws/holdem`**

## MongoDB 설치 (로컬)

DB명: **zenith_holdem**

### Docker (권장)

```bash
cd /var/zenithpark/be
docker compose up -d
# mongodb://127.0.0.1:27017
```

### 수동 설치 (Ubuntu)

- [MongoDB Community 설치 가이드](https://www.mongodb.com/docs/manual/administration/install-on-linux/) 참고.
- Ubuntu 22.04: `jammy` 저장소 사용.

DB/컬렉션은 앱이 최초 insert 시 자동 생성됩니다.

| 컬렉션 | 용도 |
|--------|------|
| `barcodeHistory` | 바코드 스캔 로그 (기존) |
| `roundHistory` | 핸드/쇼다운/팟 결과 로그 |
| `betHistory` | 스트리트별 액션 로그 |
| `transaction` | 잔액 변동(바이인, 블라인드, 팟 등) |

## 실행

```bash
cd /var/zenithpark/be
npm install
npm start
# 또는 바코드 서버만: npm run barcode-server
```

- 기본 포트: **3080**
- 바코드 WebSocket: `ws://<host>:3080/ws/barcodeserver` (허용 IP: `175.100.59.39`, `src/index.js`에 하드코딩)
- 홀덤 WebSocket: `ws://<host>:3080/ws/holdem` (IP 제한 없음)

### 홀덤 게임 루프

- **싱글 프로세스**에서 `tick_game(interval)` → `setTimeout`으로 주기 반복.
- 텍사스 홀덤: **최대 9시트**, **2인 이상**일 때 핸드 시작.
- `HOLDEM_EMUL_DEAL=1`(기본): 딜 전 **실시간(ms) 랜덤 대기** 후 에뮬(기본 1~2초).
- `HOLDEM_EMUL_BET=1`(기본): 각 액터마다 **실시간(ms) 랜덤 대기** 후 **70% call / 25% raise / 5% fold** 에뮬.
- 비에뮬 시: 클라이언트가 `deal_ack`, `bet` 메시지로 신호/배팅 전달.

환경변수 (홀덤):

| 변수 | 기본 | 설명 |
|------|------|------|
| `HOLDEM_ENABLED` | on | `0`/`false`면 홀덤 루프 비활성 |
| `HOLDEM_TICK_MS` | `200` | 틱 간격(ms) |
| `HOLDEM_TABLE_ID` | `table01` | 테이블 ID (로그에 포함) |
| `HOLDEM_EMUL_DEAL` | on | `0`이면 딜은 `deal_ack` 필요 |
| `HOLDEM_EMUL_BET` | on | `0`이면 배팅은 `bet` 또는 타임아웃 |
| `HOLDEM_EMUL_DELAY_MS_MIN` / `MAX` | `1000` / `2000` | 에뮬 딜·에뮬 베팅 사이 실시간 대기(ms) |
| `HOLDEM_EMUL_DEAL_TICKS_MIN` / `MAX` | (미사용) | 예전 틱 기반 딜 대기 — 현재는 ms 설정 사용 |
| `HOLDEM_BET_TIMEOUT_TICKS` | `150` | 비에뮬 배팅 타임아웃(틱) |
| `HOLDEM_SB` / `HOLDEM_BB` | `10` / `20` | 스몰/빅 블라인드 |
| `HOLDEM_SEED_PLAYERS` | `2` | 부팅 시 자동 착석 인원(0~9) |
| `HOLDEM_SEED_BUYIN` | `10000` | 시드 칩 |

공통:

- `MONGO_URI`: MongoDB 연결 문자열 (기본 `mongodb://127.0.0.1:27017`)
- `BARCODE_WS_PORT`: HTTP/WS 포트 (기본 `3080`)

### 홀덤 WebSocket 메시지 (JSON)

- `deal_ack`: `{ "type":"deal_ack", "kind":"hole"|"flop"|"turn"|"river" }`
- `bet`: `{ "type":"bet", "seatIndex":0, "action":"fold"|"check"|"call"|"raise", "amount":0 }`
- `join_seat`: `{ "type":"join_seat", "seatIndex":0, "userId":"u1", "buyIn":10000 }`
- `leave_seat`: `{ "type":"leave_seat", "seatIndex":0 }`

서버는 틱마다 `{ "type":"state", ... }` 스냅샷을 브로드캐스트합니다.

## 클라이언트 (Agent)

C# .NET 클라이언트 패킷 규격은 **packet.md** 참고.

- 접속 후 `{"type":"subscribe","tableId":"table01"}` 전송 → table01 바코드 이벤트 수신.
- 서버는 수신 바코드를 큐잉 후 1초마다 `barcodeHistory`에 insert.
