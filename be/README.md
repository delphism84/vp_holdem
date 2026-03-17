# Zenith Park BE

Node.js 백엔드. 바코드 WebSocket 서버(`/ws/barcodeserver`) 제공.

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

DB/컬렉션은 앱이 최초 insert 시 자동 생성됩니다. (`zenith_holdem.barcodeHistory`)

## 실행

```bash
cd /var/zenithpark/be
npm install
npm start
# 또는 바코드 서버만: npm run barcode-server
```

- 기본 포트: **3080**
- WebSocket URL: `ws://<host>:3080/ws/barcodeserver`
- 허용 IP: `175.100.59.39` (barcodeserver.js / src/index.js에 하드코딩)

환경변수:

- `MONGO_URI`: MongoDB 연결 문자열 (기본 `mongodb://127.0.0.1:27017`)
- `BARCODE_WS_PORT`: WS 서버 포트 (기본 `3080`)

## 클라이언트 (Agent)

C# .NET 클라이언트 패킷 규격은 **packet.md** 참고.

- 접속 후 `{"type":"subscribe","tableId":"table01"}` 전송 → table01 바코드 이벤트 수신.
- 서버는 수신 바코드를 큐잉 후 1초마다 `barcodeHistory`에 insert.
