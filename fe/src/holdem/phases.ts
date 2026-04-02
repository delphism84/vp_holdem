/** BE GameTable._phaseKey() 와 동일 키 */
export const PHASE_LABEL_KO: Record<string, string> = {
  waiting_players: '인원 대기 (2명 이상 필요)',
  new_hand: '새 핸드',
  deal_hole: '홀 카드 딜링',
  preflop_bet: '프리플롭 · 배팅',
  deal_flop: '플롭 딜링',
  flop_bet: '플롭 · 배팅',
  deal_turn: '턴 딜링',
  turn_bet: '턴 · 배팅',
  deal_river: '리버 딜링',
  river_bet: '리버 · 배팅',
  showdown: '쇼다운',
  cleanup: '핸드 정리',
  unknown: '…',
}

export function phaseLabelKo(phase: string | undefined): string {
  if (!phase) return '연결 중…'
  return PHASE_LABEL_KO[phase] ?? phase
}
