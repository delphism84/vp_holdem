/**
 * Zenith Park BE entry
 * - 바코드 WebSocket (/ws/barcodeserver)
 * - 라이브 홀덤 싱글 루프 (/ws/holdem, HOLDEM_ENABLED 기본 on)
 */

import 'dotenv/config';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { MongoClient } from 'mongodb';
import { setupHoldem } from './holdem/setupHoldem.js';

const ALLOWED_IP = '175.100.59.39';
const DB_NAME = 'zenith_holdem';
const COLLECTION = 'barcodeHistory';
const FLUSH_INTERVAL_MS = 1000;
const PORT = Number(process.env.BARCODE_WS_PORT) || 3080;

const tableSubscribers = new Map();
const barcodeQueue = [];
let mongoClient = null;

async function getDb() {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017');
    await mongoClient.connect();
  }
  return mongoClient.db(DB_NAME);
}

function subscribeTable(tableId, ws) {
  if (!tableSubscribers.has(tableId)) tableSubscribers.set(tableId, new Set());
  tableSubscribers.get(tableId).add(ws);
}

function unsubscribeTable(tableId, ws) {
  const set = tableSubscribers.get(tableId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) tableSubscribers.delete(tableId);
  }
}

function broadcastToTable(tableId, data) {
  const clients = tableSubscribers.get(tableId);
  if (!clients) return;
  const raw = typeof data === 'string' ? data : JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(raw);
  }
}

function enqueue(tableId, senderId, barcode, cardno) {
  barcodeQueue.push({
    tableId,
    senderId,
    barcode,
    cardno,
    time: new Date(),
  });
}

async function flushToDb() {
  if (barcodeQueue.length === 0) return;
  const batch = barcodeQueue.splice(0, barcodeQueue.length);
  try {
    const db = await getDb();
    await db.collection(COLLECTION).insertMany(batch);
  } catch (err) {
    console.error('[barcodeserver] DB insert error:', err.message);
    barcodeQueue.unshift(...batch);
  }
}

setInterval(flushToDb, FLUSH_INTERVAL_MS);

/** @type {Map<import('ws').WebSocket, { tableId?: string, seatIndex?: number, userId?: string }>} */
const holdemClients = new Map();
let holdemCtx = null;

function broadcastHoldemState() {
  const gt = holdemCtx?.gameTable;
  if (!gt) return;
  for (const [ws, meta] of holdemClients) {
    if (ws.readyState !== 1) continue;
    const snap = gt.snapshot({
      viewerSeat: meta.seatIndex,
      viewerUserId: meta.userId,
    });
    try {
      ws.send(JSON.stringify({ type: 'state', ...snap }));
    } catch (_) {}
  }
}

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        barcode: 'barcodeserver',
        holdem: holdemCtx?.gameTable != null,
        holdemStep: holdemCtx?.gameTable?.step ?? null,
      }),
    );
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ZenithPark BE. WS: /ws/barcodeserver, /ws/holdem');
});

/** 같은 HTTP 서버에 path 다른 WS 2개를 붙일 때는 noServer + upgrade 분기 필수 (아니면 첫 WSS가 타 path에 400 반환) */
function wsPathname(url) {
  if (!url) return '/';
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  if (ip !== ALLOWED_IP) {
    ws.close(4003, 'IP not allowed');
    return;
  }

  let subscribedTable = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe' && msg.tableId) {
        if (subscribedTable) unsubscribeTable(subscribedTable, ws);
        subscribedTable = msg.tableId;
        subscribeTable(subscribedTable, ws);
        ws.send(JSON.stringify({ type: 'subscribed', tableId: subscribedTable }));
        return;
      }
      if (msg.type === 'barcode' && msg.tableId != null && msg.barcode != null) {
        const tableId = String(msg.tableId);
        const senderId = ip;
        const barcode = String(msg.barcode);
        const cardno = msg.cardno != null ? String(msg.cardno) : '';
        enqueue(tableId, senderId, barcode, cardno);
        broadcastToTable(tableId, {
          type: 'barcode',
          tableId,
          senderId,
          barcode,
          cardno,
          time: new Date().toISOString(),
        });
      }
    } catch (_) {}
  });

  ws.on('close', () => {
    if (subscribedTable) unsubscribeTable(subscribedTable, ws);
  });
});

const wssHoldem = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const path = wsPathname(request.url);
  if (path === '/ws/barcodeserver') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
    return;
  }
  if (path === '/ws/holdem') {
    wssHoldem.handleUpgrade(request, socket, head, (ws) => {
      wssHoldem.emit('connection', ws, request);
    });
    return;
  }
  socket.destroy();
});

wssHoldem.on('connection', (ws) => {
  holdemClients.set(ws, {});
  ws.send(
    JSON.stringify({
      type: 'hello',
      message:
        'subscribe {tableId, seatIndex?, userId?} → state; deal_ack {kind}; bet {seatIndex,action}; join_seat; leave_seat',
    }),
  );
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const gt = holdemCtx?.gameTable;
      const prev = holdemClients.get(ws) || {};

      if (msg.type === 'subscribe') {
        holdemClients.set(ws, {
          ...prev,
          tableId: msg.tableId != null ? String(msg.tableId) : prev.tableId,
          seatIndex: msg.seatIndex != null ? Number(msg.seatIndex) : prev.seatIndex,
          userId: msg.userId != null ? String(msg.userId) : prev.userId,
        });
        ws.send(
          JSON.stringify({
            type: 'subscribed',
            tableId: msg.tableId ?? prev.tableId ?? null,
            seatIndex: msg.seatIndex ?? prev.seatIndex ?? null,
            userId: msg.userId ?? prev.userId ?? null,
          }),
        );
        broadcastHoldemState();
        return;
      }

      if (!gt) return;
      if (msg.type === 'deal_ack' && msg.kind) {
        gt.ackDeal(String(msg.kind));
      }
      if (msg.type === 'bet' && msg.seatIndex != null && msg.action) {
        gt.submitBet(Number(msg.seatIndex), String(msg.action), msg.amount != null ? Number(msg.amount) : 0);
      }
      if (msg.type === 'join_seat' && msg.seatIndex != null && msg.userId != null && msg.buyIn != null) {
        gt.joinSeat(Number(msg.seatIndex), String(msg.userId), Number(msg.buyIn), { isManual: true });
      }
      if (msg.type === 'leave_seat' && msg.seatIndex != null) {
        gt.leaveSeat(Number(msg.seatIndex));
      }
    } catch (_) {}
  });
  ws.on('close', () => {
    holdemClients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`[zenithpark-be] Barcode WS ws://0.0.0.0:${PORT}/ws/barcodeserver (allowed IP: ${ALLOWED_IP})`);
  console.log(`[zenithpark-be] Holdem WS ws://0.0.0.0:${PORT}/ws/holdem`);
});

holdemCtx = setupHoldem({ getDb }, { onTick: broadcastHoldemState });
