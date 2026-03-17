# Barcode WebSocket Protocol (Client Agent – C# .NET)

바코드 서버와 통신하는 **Client Agent**(C# .NET)용 패킷 규격입니다.

---

## 1. 연결 정보

| 항목 | 값 |
|------|-----|
| **URL** | `ws://<host>:<port>/ws/barcodeserver` |
| **기본 포트** | `3080` (환경변수 `BARCODE_WS_PORT`로 변경 가능) |
| **인증** | 서버에서 **클라이언트 IP**로만 수신 허용 (현재 허용 IP: `175.100.59.39`) |

- 프로토콜: WebSocket (텍스트 프레임, UTF-8 JSON)
- 모든 메시지는 **JSON 객체** 한 줄 (줄바꿈 없음)

---

## 2. Agent → Server (클라이언트가 보내는 메시지)

### 2.1 테이블 구독 (접속 후 필수)

Agent 접속 직후 **table01** 수신을 위해 구독 요청을 보냅니다.

```json
{"type":"subscribe","tableId":"table01"}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | string | O | `"subscribe"` |
| tableId | string | O | 구독할 테이블 ID. Agent용: `"table01"` |

**응답 (서버 → Agent):**

```json
{"type":"subscribed","tableId":"table01"}
```

이후 해당 테이블로 들어오는 바코드 이벤트를 수신합니다.

---

### 2.2 바코드 전송 (스캔 데이터 올릴 때)

바코드 스캔 결과를 서버로 보낼 때 사용합니다. (Agent가 스캔을 보내는 역할이면 사용)

```json
{"type":"barcode","tableId":"table01","barcode":"1234567890123","cardno":"C001"}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| type | string | O | `"barcode"` |
| tableId | string | O | 테이블 ID (예: `"table01"`) |
| barcode | string | O | 바코드 값 |
| cardno | string | X | 카드 번호 (없으면 빈 문자열로 저장) |

- 서버는 보낸 클라이언트 IP를 `senderId`로 저장합니다.
- 서버는 1초마다 큐를 DB `barcodeHistory`에 insert 후 플러시합니다.

---

## 3. Server → Agent (서버가 보내는 메시지)

### 3.1 구독 확인

구독 요청에 대한 응답.

```json
{"type":"subscribed","tableId":"table01"}
```

### 3.2 바코드 이벤트 (브로드캐스트)

해당 테이블에 바코드가 등록될 때마다 구독한 모든 클라이언트에 전송됩니다.

```json
{
  "type": "barcode",
  "tableId": "table01",
  "senderId": "175.100.59.39",
  "barcode": "1234567890123",
  "cardno": "C001",
  "time": "2025-03-10T12:34:56.789Z"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| type | string | `"barcode"` |
| tableId | string | 테이블 ID |
| senderId | string | 바코드를 보낸 클라이언트 IP |
| barcode | string | 바코드 값 |
| cardno | string | 카드 번호 |
| time | string | 이벤트 시각 (ISO 8601, UTC) |

---

## 4. DB 저장 (barcodeHistory)

서버가 1초마다 큐를 플러시할 때 아래 스키마로 MongoDB에 insert합니다.

- **DB 이름:** `zenith_holdem`
- **컬렉션:** `barcodeHistory`

| 필드 | 타입 | 설명 |
|------|------|------|
| tableId | string | 테이블 ID |
| senderId | string | 전송 클라이언트 IP |
| barcode | string | 바코드 값 |
| cardno | string | 카드 번호 |
| time | Date | 시각 (UTC 0 기준) |

---

## 5. C# .NET 클라이언트 예시 (Agent)

- NuGet: **ClientWebSocket** (`System.Net.WebSockets`) 또는 **WebSocketSharp** 등 사용 가능.
- 접속 후 **1. 구독** → **2. 수신 루프** 순서로 구현하면 됩니다.

### 5.1 접속 및 table01 구독

```csharp
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

var ws = new ClientWebSocket();
await ws.ConnectAsync(new Uri("ws://175.100.59.39:3080/ws/barcodeserver"), CancellationToken.None);

// table01 구독
var subscribe = JsonSerializer.Serialize(new { type = "subscribe", tableId = "table01" });
await ws.SendAsync(Encoding.UTF8.GetBytes(subscribe), WebSocketMessageType.Text, true, CancellationToken.None);
```

### 5.2 수신 루프 (바코드 이벤트 처리)

```csharp
var buffer = new byte[4096];
while (ws.State == WebSocketState.Open)
{
    var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
    if (result.MessageType != WebSocketMessageType.Text) continue;

    var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
    var doc = JsonDocument.Parse(json);
    var type = doc.RootElement.GetProperty("type").GetString();

    if (type == "subscribed")
        Console.WriteLine($"Subscribed: {doc.RootElement.GetProperty("tableId").GetString()}");
    else if (type == "barcode")
    {
        var tableId = doc.RootElement.GetProperty("tableId").GetString();
        var barcode = doc.RootElement.GetProperty("barcode").GetString();
        var cardno = doc.RootElement.TryGetProperty("cardno", out var c) ? c.GetString() : "";
        var time = doc.RootElement.GetProperty("time").GetString();
        // TODO: 테이블/카드 처리
    }
}
```

### 5.3 바코드 전송 (선택)

Agent가 스캔 데이터를 서버로 올리는 경우:

```csharp
var barcodeMsg = JsonSerializer.Serialize(new {
    type = "barcode",
    tableId = "table01",
    barcode = "1234567890123",
    cardno = "C001"
});
await ws.SendAsync(Encoding.UTF8.GetBytes(barcodeMsg), WebSocketMessageType.Text, true, CancellationToken.None);
```

---

## 6. 에러/종료

- **IP 미허용:** 서버가 `4003` close code로 연결을 끊습니다. (현재 허용: `175.100.59.39`만)
- **잘못된 JSON / 미지의 type:** 서버는 해당 메시지를 무시합니다.

---

## 7. 요약

| 구분 | 내용 |
|------|------|
| **Endpoint** | `ws://<host>:3080/ws/barcodeserver` |
| **Agent 접속 후** | `{"type":"subscribe","tableId":"table01"}` 전송 → table01 이벤트 수신 |
| **수신 데이터** | `type: "barcode"` + tableId, senderId, barcode, cardno, time |
| **DB** | `zenith_holdem.barcodeHistory` (tableId, senderId, barcode, cardno, time, 1초마다 insert) |
