import { loadHoldemConfig } from './config.js';
import { createMongoLogger } from './mongoLog.js';
import { GameTable } from './GameTable.js';
import { runHoldemLoop } from './gameLoop.js';

/**
 * @param {{ getDb: () => Promise<import('mongodb').Db> }} deps
 * @param {{ onTick?: () => void }} opts — 틱마다 호출 (클라이언트별 WS 브로드캐스트 등)
 */
export function setupHoldem(deps, opts = {}) {
  const config = loadHoldemConfig();
  if (!config.holdemEnabled) {
    return { stop: () => {}, gameTable: null, config };
  }

  const logger = createMongoLogger({ getDb: deps.getDb, tableId: config.tableId });
  const gameTable = new GameTable({
    tableId: config.tableId,
    config,
    logger,
  });

  const seed = Number(process.env.HOLDEM_SEED_PLAYERS) || 2;
  const buyIn = Math.max(100, Number(process.env.HOLDEM_SEED_BUYIN) || 10000);
  for (let i = 0; i < Math.min(9, seed); i++) {
    gameTable.joinSeat(i, `player-${i + 1}`, buyIn, { isManual: false });
  }

  const stop = runHoldemLoop(gameTable, {
    tickMs: config.tickMs,
    onTick: () => {
      if (opts.onTick) opts.onTick();
    },
  });

  console.log(
    `[holdem] loop started table=${config.tableId} tick=${config.tickMs}ms emulDeal=${config.isFlagEmulDeal} emulBet=${config.isFlagEmulBet}`,
  );

  return { stop, gameTable, config };
}
