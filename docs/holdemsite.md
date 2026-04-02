# ZENITH HOLDEM 사이트 — 액세스 키 · Socket.IO 이벤트 정리

> 분석 대상: `http://ctt.rntvhfemrpdla.com/holdeml/` 에서 제공되는 정적 HTML 및 번들 `assets/index-DV9fxe00.js` (클라이언트 공개 코드 기준).  
> 실시간 계층은 **원시 WebSocket URL(`ws://`/`wss://`) 문자열이 아니라 Socket.IO** 가 사용되며, 브라우저 WebSocket은 Socket.IO/Engine.IO 내부 전송으로 쓰입니다.

---

## 1. 액세스 키 (`access` 쿼리 파라미터)

| 항목 | 내용 |
|------|------|
| **이름** | URL 쿼리 `access` |
| **읽는 방식** | `new URLSearchParams(window.location.search).get("access")` — 값이 없으면 `"notAuth"` 등 기본 문자열로 처리되는 흐름이 보입니다. |
| **용도** | Pinia 스토어의 `login(...)` 에 전달되며, 이후 Socket.IO 연결 시 `auth: { token: ... }` 형태로 **소켓 인증**에 사용됩니다. |
| **예시 URL 형태** | `.../holdeml/?access=<토큰 문자열>` |

**주의**: 액세스 값은 URL에 노출되므로(로그, Referer, 공유 링크 등) 유출 위험이 있습니다. 운영·보안 정책에 따라 재발급·만료·HTTPS 필수 등을 검토하는 것이 좋습니다.

---

## 2. Socket.IO 연결 정보

| 항목 | 값 |
|------|-----|
| **연결 URL (클라이언트 하드코딩)** | `http://ctt.rntvhfemrpdla.com:8887` |
| **프로토콜** | Socket.IO (HTTP 기준 주소; 실제 전송은 WS/폴링 협상) |
| **인증** | `io(연결URL, { auth: { token: this.token } })` — 위 `access`에서 온 토큰이 `token`으로 전달되는 구조입니다. |
| **초기화** | `initializeSocket()` 호출 후 `login(access값)` 등으로 세션을 맞추는 코드 흐름이 있습니다. |

번들에 포함된 **로컬 개발용 기본값**(예: `localhost:3000`, `localhost:8080`, `localhost:8000/api/`)은 프로덕션에서 실제로 쓰이지 않을 수 있으나, 빌드 산출물에 문자열로 남아 있습니다.

---

## 3. 서버 → 클라이언트 (`socket.on`)

클라이언트에서 구독하는 이벤트 이름(번들에서 `socket.on("…")` 로 확인된 목록):

| 이벤트명 | 비고(추정) |
|----------|------------|
| `connect` | Socket.IO 표준 |
| `disconnect` | Socket.IO 표준 |
| `message` | 일반 메시지 |
| `lobbyPlayers` | 로비 플레이어 |
| `lobbyRooms` | 로비 방 목록 |
| `roomListsInChannel` | 채널 내 방 리스트 |
| `roomMovePlayers` | 방 이동 관련 플레이어 |
| `roomOutPlayers` | 방 퇴장 플레이어 |
| `betCounter` | 베팅 카운터 |
| `communityUpdate` | 커뮤니티 카드/상태 갱신 |
| `finish` | 라운드/게임 종료 |
| `resultWin` | 승리 결과 |
| `updateJackpot` | 잭팟 갱신 |
| `gameCancel` | 게임 취소 |
| `resRoomOut` | 방 퇴장 응답 |

---

## 4. 클라이언트 → 서버 (`socket.emit`)

클라이언트가 송신하는 이벤트 이름(번들에서 `socket.emit("…")` 로 확인된 목록):

| 이벤트명 | 비고(추정) |
|----------|------------|
| `login` | 로그인/세션 수립 |
| `enterLobby` | 로비 입장 |
| `enterGame` | 게임 입장 |
| `joinGame` | 게임 참여 |
| `startGame` | 게임 시작 |
| `syncRoom` | 방 상태 동기화 |
| `community` | 커뮤니티 단계 관련 |
| `typeBet` | 베팅 타입 |
| `setBuyIn` | 바이인 설정 |
| `getAntes` | 앤티 조회 |
| `safeInOut` | 세이프 인/아웃 |
| `outReq` | 퇴장 요청 |
| `pwConfirm` | 비밀번호 확인 |
| `visibility` | 가시성/포커스 등 |

---

## 5. REST API 계열 조사 (클라이언트 + 호스트 스캔)

### 5.1 `holdeml` 프론트 번들 (`index-*.js`)

| 관찰 | 내용 |
|------|------|
| **프로덕션으로 보이는 HTTP API 베이스** | **없음.** `http://ctt.rntvhfemrpdla.com:8887` 는 Socket.IO 용이며, 동일 호스트에 **REST 경로가 하드코딩되어 있지 않음.** |
| **Vue/Pinia 기본 state** | `apiURL: "http://localhost:8000/api/"`, `serverPath`, `serverDomain` 등 **로컬 개발용 문자열**이 1회 등장하나, `apiURL`/`serverPath` **참조는 번들 내 거의 미사용**(게임 동선은 Socket.IO). |
| **`fetch()`** | Vite `modulepreload` 로 **번들·CSS만** 가져오는 용도. `fetch("https://…/api/…")` 형태의 **업무 REST 호출은 검출되지 않음.** |
| **`axios` / XHR** | 해당 번들에서 **사용 흔적 없음**(Phaser·Socket.IO·Vue 런타임 위주). |

정리: 이 클라이언트가 노출하는 **백엔드 연동은 사실상 Socket.IO 이벤트**이며, **공개 REST 엔드포인트 목록은 JS만으로는 유추하기 어렵다.**

### 5.2 동일 호스트 경량 HTTP 확인 (참고)

`User-Agent` 가 브라우저가 아닌 요청은 **루트 `/` 가 403** 등으로 막힐 수 있음(이전 관찰과 동일).  
예시(HEAD/간단 요청, 특정 시점·환경에 따라 달라질 수 있음):

| 요청 | 결과(참고) |
|------|------------|
| `http://ctt.rntvhfemrpdla.com/` | 403 등(봇·UA 정책 가능) |
| `…/api`, `…/api/`, `…/api/v1`, `…/rest`, `…/health` | **404** (IIS 쪽 일반 HTML 404 패턴으로 관측된 사례) |
| `http://ctt.rntvhfemrpdla.com:8887/` | Socket.IO 전용 HTTP; **일반 REST 문서 루트로 쓰이는 흔적 없음**(404 등) |

즉 **공개 문서화된 REST 베이스 URL**은 위 스캔만으로는 확인되지 않았다.

### 5.3 워크스페이스 `zenithpark/be` 와의 관계 (별도 제품)

`/var/zenithpark/be` 는 **Node 백엔드**로, 문서상:

- **MongoDB** DB명 예: `zenith_holdem`
- 실시간: **`/ws/holdem`**, **`/ws/barcodeserver`** (WebSocket)
- 기본 HTTP 포트 예: **3080**

이 스택은 **IIS + `ctt…:8887` Socket.IO 클라이언트와 동일 서비스인지 여부는 이 저장소만으로 단정 불가**하나, **REST가 아니라 WebSocket 중심**으로 적혀 있다. 상세는 `be/README.md` 참고.

---

## 6. 변경 시 참고

- 배포 시 번들 파일명 해시(`index-DV9fxe00.js` 등)가 바뀔 수 있으므로, **이벤트/URL 재확인은 최신 `holdeml/assets/index-*.js` 를 대상으로 grep/파싱**하는 것이 안전합니다.
- 본 문서는 **클라이언트에 노출된 문자열**과 **제한적 HTTP 스캔**만 정리한 것이며, 서버에서 이벤트별 권한·검증·레이트 리밋·내부 REST는 백엔드/게이트웨이 코드를 봐야 합니다.
