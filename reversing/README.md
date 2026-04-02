# holdem reversing / Socket.IO 프로브

## `holdem-room-kick-probe.mjs`

- **`socket.onAny`**: 서버가 보내는 **모든** 이벤트 이름과 인자를 `logs/holdem-probe-*.log` 에 기록합니다.
- **클라이언트 emit 전부(번들 기준)** 를 `login` → `enterLobby` 이후 순차 호출하고, 각 **ack·에러**를 남깁니다 (`getAntes`, `syncRoom`, `visibility`, `community`, `enterGame`, `joinGame`, `pwConfirm`, `startGame`, `typeBet`, `safeInOut`, `setBuyIn`, 선택 시 `outReq`).

**타인 강퇴**는 공개 프로토콜에 없습니다. `outReq` 는 본인 `outRes`/`movRes` 용이며, `INCLUDE_DESTRUCTIVE=1` 일 때만 시도합니다.

### 실행

```bash
cd /var/zenithpark/reversing
npm install
HOLDEM_ACCESS_TOKEN='URL의_access_값' node holdem-room-kick-probe.mjs
```

선택: `SOCKET_URL`, `HOLDEM_CHANNEL`, `HOLDEM_ROOM`, `TARGET_NICK`, `EMIT_TIMEOUT_MS`, `POST_EMIT_WAIT_MS`, `INCLUDE_DESTRUCTIVE=1`.

토큰은 스크립트가 **로그에 출력하지 않습니다.** 환경·쉘 히스토리에는 남을 수 있습니다.
