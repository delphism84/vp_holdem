/**
 * Zenith Park BE entry
 * Starts barcode WebSocket server
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { MongoClient } from 'mongodb';

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

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'barcodeserver' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Barcode WS server. Connect via WebSocket to /ws/barcodeserver');
});

const wss = new WebSocketServer({ server, path: '/ws/barcodeserver' });

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

server.listen(PORT, () => {
  console.log(`[zenithpark-be] Barcode WS ws://0.0.0.0:${PORT} (allowed IP: ${ALLOWED_IP})`);
});
