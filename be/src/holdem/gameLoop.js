/**
 * 싱글 프로세스 tick 루프: tick_game → sleep(interval)
 * 비동기는 Mongo 로깅 등에만 사용, 게임 상태 전이는 tick_game 안에서만.
 */

export function runHoldemLoop(gameTable, { tickMs, onTick, onError }) {
  let stopped = false;

  async function loop() {
    while (!stopped) {
      const t0 = Date.now();
      try {
        gameTable.tickGame();
        if (onTick) onTick();
      } catch (err) {
        if (onError) onError(err);
        else console.error('[holdem] tick error:', err);
      }
      const elapsed = Date.now() - t0;
      const wait = Math.max(0, tickMs - elapsed);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  void loop();

  return () => {
    stopped = true;
  };
}
