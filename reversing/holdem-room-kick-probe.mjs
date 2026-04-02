/**
 * Holdem Socket.IO 전체 메시지 프로브
 * - socket.onAny: 서버가 보내는 모든 이벤트명·인자 로깅
 * - 클라이언트 번들에 존재하는 emit 전부 순차 호출(ack 기록)
 *
 * 사용:
 *   HOLDEM_ACCESS_TOKEN='<access>' node holdem-room-kick-probe.mjs
 *
 * 환경변수:
 *   HOLDEM_ACCESS_TOKEN (필수)
 *   SOCKET_URL, HOLDEM_CHANNEL, HOLDEM_ROOM, TARGET_NICK
 *   EMIT_TIMEOUT_MS (기본 12000) — emit ack 대기
 *   POST_EMIT_WAIT_MS (기본 20000) — 마지막 emit 후 브로드캐스트 수신 대기
 *   INCLUDE_DESTRUCTIVE (기본 0) — 1이면 `outReq`(본인 방퇴 요청)까지 시도
 */

import { io } from "socket.io-client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "logs");
const TARGET_NICK = process.env.TARGET_NICK ?? "ts_jfjfj";
const ROOM = String(process.env.HOLDEM_ROOM ?? "11");
const CHANNEL = process.env.HOLDEM_CHANNEL ?? "1";
const SOCKET_URL = process.env.SOCKET_URL ?? "http://ctt.rntvhfemrpdla.com:8887";
const TOKEN = process.env.HOLDEM_ACCESS_TOKEN ?? "";
const EMIT_TIMEOUT_MS = Number(process.env.EMIT_TIMEOUT_MS ?? "12000");
const POST_EMIT_WAIT_MS = Number(process.env.POST_EMIT_WAIT_MS ?? "20000");
const INCLUDE_DESTRUCTIVE = process.env.INCLUDE_DESTRUCTIVE === "1";

const ts = () => new Date().toISOString();
let logPath = "";

function log(line) {
  const s = `[${ts()}] ${line}`;
  console.log(s);
  if (logPath) fs.appendFileSync(logPath, s + "\n", "utf8");
}

function ensureLogFile() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const name = `holdem-probe-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
  logPath = path.join(LOG_DIR, name);
  fs.appendFileSync(logPath, `[${ts()}] log file: ${logPath}\n`, "utf8");
}

function summarizePayload(obj, max = 12000) {
  try {
    const j = JSON.stringify(obj);
    return j.length > max ? j.slice(0, max) + `… (${j.length} chars)` : j;
  } catch {
    return String(obj);
  }
}

let socket;

function emitAck(name, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${name} ack timeout (${EMIT_TIMEOUT_MS}ms)`));
    }, EMIT_TIMEOUT_MS);
    try {
      const cb = (res) => {
        clearTimeout(timer);
        resolve(res);
      };
      if (payload !== undefined) socket.emit(name, payload, cb);
      else socket.emit(name, cb);
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

/** 번들에서 확인된 클라이언트→서버 emit (의미 없는 최소값으로 서버 응답·에러만 수집) */
function buildEmitSequence() {
  const ch = CHANNEL;
  const ro = ROOM;
  const seq = [
    { name: "getAntes", payload: { ch }, note: "앤티 목록" },
    { name: "syncRoom", payload: { ch, ro }, note: "방 상태 동기화" },
    { name: "visibility", payload: { ch, ro }, note: "visibility" },
    {
      name: "community",
      payload: { channel: ch, roomNo: ro },
      note: "커뮤니티 카드 요청(번들: channel, roomNo)",
    },
    {
      name: "enterGame",
      payload: { ch, ro, title: "", pw: "", ante: 0 },
      note: "빈 제목/비번으로 enterGame — 게임 중 아니면 에러 예상",
    },
    {
      name: "joinGame",
      payload: { ch, ro, seat: 0 },
      note: "seat 0 참여 시도 — 상태에 따라 에러",
    },
    {
      name: "pwConfirm",
      payload: { ch, ro, pw: "" },
      note: "빈 비번 확인",
    },
    {
      name: "startGame",
      payload: { ch, ro },
      note: "게임 시작 요청 — 권한/상태에 따라 에러",
    },
    {
      name: "typeBet",
      payload: { channel: ch, roomNo: ro, type: 0, amount: 0 },
      note: "베팅 타입 0 금액 0",
    },
    {
      name: "safeInOut",
      payload: { ch, amount: 0, type: 0 },
      note: "세이프 인아웃 0",
    },
    {
      name: "setBuyIn",
      payload: {},
      note: "빈 객체 — 서버가 요구 필드 있으면 에러 메시지로 확인",
    },
  ];
  if (INCLUDE_DESTRUCTIVE) {
    seq.push({
      name: "outReq",
      payload: { ch, ro, ty: "outRes" },
      note: "본인 방 퇴장 예약(outRes) — INCLUDE_DESTRUCTIVE=1 일 때만",
    });
  }
  return seq;
}

function analyzeProtocol() {
  log("--- 프로토콜 요약 (클라이언트 번들) ---");
  log("수신: roomOutPlayers(out[]), roomMovePlayers(mv[]), lobbyRooms, … 서버 브로드캐스트.");
  log("송신 outReq: { ch, ro, ty } 는 본인 outRes|movRes — 타인 닉 지정 불가.");
  log(`INCLUDE_DESTRUCTIVE=${INCLUDE_DESTRUCTIVE} (outReq 포함: ${INCLUDE_DESTRUCTIVE})`);
}

function nickMentioned(obj, nick) {
  if (obj == null || !nick) return false;
  try {
    return JSON.stringify(obj).includes(nick);
  } catch {
    return false;
  }
}

async function runEmitProbes() {
  const sequence = buildEmitSequence();
  log(`--- 클라이언트 emit 순차 시도 (${sequence.length}건) ---`);
  for (const step of sequence) {
    log(`>> emit ${step.name} (${step.note}) payload=${summarizePayload(step.payload, 2000)}`);
    try {
      const ack = await emitAck(step.name, step.payload);
      log(`<< ack ${step.name}: ${summarizePayload(ack, 8000)}`);
      if (nickMentioned(ack, TARGET_NICK)) {
        log(`!! ack 에 TARGET_NICK '${TARGET_NICK}' 문자열 포함`);
      }
      if (ack && typeof ack === "object" && ack.code !== undefined && ack.code !== 0) {
        log(`   (code=${ack.code} 서버 메시지: ${ack.message ?? ""})`);
      }
    } catch (e) {
      log(`!! ${step.name} 실패: ${e.message || e}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function main() {
  ensureLogFile();
  log(`SOCKET_URL=${SOCKET_URL}`);
  log(`CHANNEL=${CHANNEL} ROOM=${ROOM} TARGET_NICK=${TARGET_NICK}`);
  analyzeProtocol();

  if (!TOKEN) {
    log("ERROR: HOLDEM_ACCESS_TOKEN 비어 있음.");
    process.exit(1);
    return;
  }

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    auth: { token: TOKEN },
    reconnection: false,
  });

  socket.onAny((eventName, ...args) => {
    const preview = args.map((a) => summarizePayload(a, 6000)).join(" | ");
    log(`<< [onAny] ${eventName} ${preview}`);
    for (const a of args) {
      if (nickMentioned(a, TARGET_NICK)) {
        log(`!! [onAny] TARGET_NICK '${TARGET_NICK}' 포함`);
      }
    }
  });

  socket.on("connect_error", (err) => {
    log(`connect_error: ${err?.message || err}`);
  });

  socket.on("connect", async () => {
    log(`<< connect socket.id=${socket.id}`);
    try {
      log(">> emit login (토큰은 로그에 출력하지 않음)");
      const loginRes = await emitAck("login", TOKEN);
      log(`<< ack login: ${summarizePayload(loginRes, 4000)}`);
      if (loginRes && loginRes.code !== 0 && loginRes.code !== undefined) {
        log(`login 실패 code=${loginRes.code}`);
        finish(1);
        return;
      }

      log(">> emit enterLobby");
      const lobbyRes = await emitAck("enterLobby", { ch: CHANNEL, buyIn: 0 });
      log(`<< ack enterLobby: ${summarizePayload(lobbyRes, 8000)}`);

      await runEmitProbes();

      log(`--- 추가 브로드캐스트 대기 ${POST_EMIT_WAIT_MS}ms ---`);
      setTimeout(() => finish(0), POST_EMIT_WAIT_MS);
    } catch (e) {
      log(`ERROR: ${e.message || e}`);
      finish(1);
    }
  });
}

function finish(code) {
  try {
    if (socket?.connected) socket.disconnect();
  } catch (_) {}
  log(`exit ${code}`);
  process.exit(code);
}

main().catch((e) => {
  log(`FATAL ${e}`);
  process.exit(1);
});
