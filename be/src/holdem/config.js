/**
 * 라이브 홀덤 게임 루프 설정 (환경변수)
 */
export function loadHoldemConfig() {
  const tickMs = Math.max(20, Number(process.env.HOLDEM_TICK_MS) || 200);
  const tableId = process.env.HOLDEM_TABLE_ID || 'table01';
  /** 기본: 둘 다 on. 끄려면 HOLDEM_EMUL_DEAL=0 또는 false */
  const isFlagEmulDeal = process.env.HOLDEM_EMUL_DEAL !== '0' && process.env.HOLDEM_EMUL_DEAL !== 'false';
  const isFlagEmulBet = process.env.HOLDEM_EMUL_BET !== '0' && process.env.HOLDEM_EMUL_BET !== 'false';
  /** 에뮬 딜/에뮬 베팅 사이 실시간 대기(ms), 기본 1~2초 랜덤 */
  const emulDelayMsMin = Math.max(0, Number(process.env.HOLDEM_EMUL_DELAY_MS_MIN) || 1000);
  const emulDelayMsMax = Math.max(emulDelayMsMin, Number(process.env.HOLDEM_EMUL_DELAY_MS_MAX) || 2000);
  /** @deprecated 틱 기반 딜 대기 — ms 방식 권장 */
  const emulDealTicksMin = Math.max(1, Number(process.env.HOLDEM_EMUL_DEAL_TICKS_MIN) || 2);
  const emulDealTicksMax = Math.max(emulDealTicksMin, Number(process.env.HOLDEM_EMUL_DEAL_TICKS_MAX) || 12);
  /** 비에뮬 배팅 타임아웃 틱 수 */
  const betTimeoutTicks = Math.max(5, Number(process.env.HOLDEM_BET_TIMEOUT_TICKS) || 150);
  /** 수동 플레이어(내 자리) 배팅 제한 시간(ms): 미응답 시 자동 fold */
  const manualBetTimeoutMs = Math.max(1000, Number(process.env.HOLDEM_MANUAL_BET_TIMEOUT_MS) || 10_000);
  const smallBlind = Math.max(1, Number(process.env.HOLDEM_SB) || 10);
  const bigBlind = Math.max(smallBlind, Number(process.env.HOLDEM_BB) || 20);
  const holdemEnabled = process.env.HOLDEM_ENABLED !== '0' && process.env.HOLDEM_ENABLED !== 'false';

  return {
    tickMs,
    tableId,
    isFlagEmulDeal,
    isFlagEmulBet,
    emulDelayMsMin,
    emulDelayMsMax,
    emulDealTicksMin,
    emulDealTicksMax,
    betTimeoutTicks,
    manualBetTimeoutMs,
    smallBlind,
    bigBlind,
    holdemEnabled,
  };
}
