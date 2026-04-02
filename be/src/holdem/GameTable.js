/**
 * 싱글 루프 tick_game 기반 텍사스 홀덤 (최대 9인, 2인 이상 시작)
 * isFlagEmulDeal / isFlagEmulBet 으로 대기 절차 에뮬
 */

import { createDeck, shuffleInPlace, cardToString, bestHandScoreFrom7 } from './poker.js';

/** 디버깅용 스텝 번호 */
export const STEP = {
  WAITING_PLAYERS: 0,
  NEW_HAND: 1,
  WAIT_DEAL_HOLE: 2,
  PREFLOP_BET: 3,
  WAIT_DEAL_FLOP: 4,
  FLOP_BET: 5,
  WAIT_DEAL_TURN: 6,
  TURN_BET: 7,
  WAIT_DEAL_RIVER: 8,
  RIVER_BET: 9,
  SHOWDOWN: 10,
  CLEANUP: 11,
};

const STREET = {
  preflop: 'preflop',
  flop: 'flop',
  turn: 'turn',
  river: 'river',
};

function randomInt(min, max, rng) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickEmulBet(rng) {
  const x = rng();
  if (x < 0.7) return 'call';
  if (x < 0.95) return 'raise';
  return 'fold';
}

/** 에뮬 딜/에뮬 베팅 사이 실시간 대기(ms), config 범위 내 랜덤 */
function emulDelayMs(cfg, rng) {
  return randomInt(cfg.emulDelayMsMin, cfg.emulDelayMsMax, rng);
}

export class GameTable {
  constructor({ tableId, config, logger, rng = Math.random }) {
    this.tableId = tableId;
    this.config = config;
    this.logger = logger;
    this.rng = rng;

    this.step = STEP.WAITING_PLAYERS;
    /** @type {(null | { id: string; seatIndex: number; stack: number; holeCards: any[]; folded: boolean; betStreet: number; isManual: boolean })[]} */
    this.seats = Array(9).fill(null);
    this.buttonSeat = 0;
    this.handSeq = 0;
    this.handId = null;
    this.deck = [];
    this.board = [];
    this.pot = 0;
    this.street = STREET.preflop;
    this.currentBet = 0;
    this.minRaise = config.bigBlind;
    /** 활성 시트 인덱스 순서 (이번 핸드) */
    this.activeOrder = [];
    this.actorCursor = 0;
    this.bettingRoundRaises = 0;
    /** currentBet===0 일 때 체크로 라운드 종료 판단 */
    this.checksInRound = 0;
    /** 에뮬 딜: 이 시각(ms) 이후에만 딜 진행 */
    this.dealReadyAt = null;
    /** 에뮬 베팅: 현재 액터가 행동 가능한 시각(ms) */
    this.emulBetReadyAt = null;
    /** 에뮬 베팅 대기 중인 시트 (액터 변경 시 타이머 리셋) */
    this.emulBetForSeat = null;
    /** 수동 플레이어 배팅 대기 중인 시트/만료시각(ms) */
    this.manualBetForSeat = null;
    this.manualBetDeadlineAt = null;
    this.betWaitTicks = 0;
    /** 비에뮬: 딜러 신호 */
    this.signalDealHole = false;
    this.signalDealFlop = false;
    this.signalDealTurn = false;
    this.signalDealRiver = false;
    /** 비에뮬: seatIndex -> pending bet action */
    this.pendingBetBySeat = new Map();
    this.lastSnapshot = null;
  }

  get seatedCount() {
    return this.seats.filter(Boolean).length;
  }

  get activePlayers() {
    return this.activeOrder
      .map((si) => ({ seatIndex: si, p: this.seats[si] }))
      .filter((x) => x.p && !x.p.folded);
  }

  joinSeat(seatIndex, playerId, buyIn, opts = {}) {
    if (seatIndex < 0 || seatIndex > 8) return false;
    if (this.seats[seatIndex]) return false;
    const isManual = opts?.isManual === true;
    this.seats[seatIndex] = {
      id: String(playerId),
      seatIndex,
      stack: buyIn,
      holeCards: [],
      folded: false,
      betStreet: 0,
      isManual,
    };
    void this.logger.logTransaction({
      kind: 'buyin',
      userId: String(playerId),
      seatIndex,
      delta: buyIn,
      balanceAfter: buyIn,
      handId: null,
      reason: 'join',
    });
    return true;
  }

  leaveSeat(seatIndex) {
    const p = this.seats[seatIndex];
    if (!p) return false;
    const bal = p.stack;
    void this.logger.logTransaction({
      kind: 'cashout',
      userId: p.id,
      seatIndex,
      delta: -bal,
      balanceAfter: 0,
      handId: this.handId,
      reason: 'leave',
    });
    this.seats[seatIndex] = null;
    return true;
  }

  /** 외부: 딜 신호 (비에뮬 딜) */
  ackDeal(kind) {
    if (kind === 'hole') this.signalDealHole = true;
    if (kind === 'flop') this.signalDealFlop = true;
    if (kind === 'turn') this.signalDealTurn = true;
    if (kind === 'river') this.signalDealRiver = true;
  }

  /** 외부: 배팅 (비에뮬) */
  submitBet(seatIndex, action, amount = 0) {
    this.pendingBetBySeat.set(seatIndex, { action, amount });
  }

  /**
   * @param {{ viewerSeat?: number, viewerUserId?: string }} [opts] — 일치 시 해당 시트 홀카드 공개
   */
  snapshot(opts = {}) {
    const viewerSeat = opts.viewerSeat;
    const viewerUserId =
      opts.viewerUserId != null && opts.viewerUserId !== '' ? String(opts.viewerUserId) : null;

    const vp =
      viewerSeat != null && viewerSeat >= 0 && viewerSeat <= 8 ? this.seats[viewerSeat] : null;
    const viewerIsManualPlayer =
      vp &&
      vp.isManual === true &&
      viewerUserId != null &&
      vp.id === viewerUserId;

    return {
      step: this.step,
      phase: this._phaseKey(),
      tableId: this.tableId,
      handId: this.handId,
      buttonSeat: this.buttonSeat,
      board: this.board.map(cardToString),
      pot: this.pot,
      street: this.street,
      currentBet: this.currentBet,
      emulDeal: this.config.isFlagEmulDeal,
      /** 서버 전역 에뮬 배팅 여부 (봇 등) */
      emulBetGlobal: this.config.isFlagEmulBet,
      /**
       * 클라이언트별: join_seat 수동 플레이어 본인 시열만 에뮬 배팅 off 로 표시
       */
      emulBet: viewerIsManualPlayer ? false : this.config.isFlagEmulBet,
      seats: this.seats.map((p, i) => {
        if (!p) return null;
        let hole;
        if (!p.holeCards.length) {
          hole = [];
        } else if (viewerUserId != null && viewerSeat === i && p.id === viewerUserId) {
          hole = p.holeCards.map(cardToString);
        } else {
          hole = ['**', '**'];
        }
        return {
          seatIndex: i,
          id: p.id,
          stack: p.stack,
          betStreet: p.betStreet,
          folded: p.folded,
          hole,
          isManual: p.isManual === true,
        };
      }),
      actorSeat: this._currentActorSeat(),
      /** 비수동 액터: tick 기반 남은 시간 계산용 (클라이언트) */
      betTimeoutTicks: this.config.betTimeoutTicks,
      betWaitTicks: this.betWaitTicks,
      tickMs: this.config.tickMs,
      /** 수동 플레이어 액터: ms 데드라인 */
      manualBetDeadlineAt: this.manualBetDeadlineAt,
      /** 에뮬 배팅 대기 끝 시각(ms) */
      emulBetReadyAt: this.emulBetReadyAt,
    };
  }

  _phaseKey() {
    switch (this.step) {
      case STEP.WAITING_PLAYERS:
        return 'waiting_players';
      case STEP.NEW_HAND:
        return 'new_hand';
      case STEP.WAIT_DEAL_HOLE:
        return 'deal_hole';
      case STEP.PREFLOP_BET:
        return 'preflop_bet';
      case STEP.WAIT_DEAL_FLOP:
        return 'deal_flop';
      case STEP.FLOP_BET:
        return 'flop_bet';
      case STEP.WAIT_DEAL_TURN:
        return 'deal_turn';
      case STEP.TURN_BET:
        return 'turn_bet';
      case STEP.WAIT_DEAL_RIVER:
        return 'deal_river';
      case STEP.RIVER_BET:
        return 'river_bet';
      case STEP.SHOWDOWN:
        return 'showdown';
      case STEP.CLEANUP:
        return 'cleanup';
      default:
        return 'unknown';
    }
  }

  _currentActorSeat() {
    const ap = this.activePlayers;
    if (!ap.length) return null;
    const cur = this.activeOrder[this.actorCursor];
    return cur != null ? cur : null;
  }

  _rotateButton() {
    const occ = [];
    for (let i = 0; i < 9; i++) {
      if (this.seats[i]) occ.push(i);
    }
    if (!occ.length) return;
    const idx = occ.indexOf(this.buttonSeat);
    const next = occ[(idx >= 0 ? idx + 1 : 0) % occ.length];
    this.buttonSeat = next;
  }

  _buildActiveOrder() {
    const occ = [];
    for (let i = 0; i < 9; i++) {
      if (this.seats[i] && this.seats[i].stack > 0) occ.push(i);
    }
    occ.sort((a, b) => a - b);
    if (occ.length < 2) {
      this.activeOrder = [];
      return false;
    }
    const btn = this.buttonSeat;
    const start = occ.indexOf(btn) >= 0 ? occ.indexOf(btn) : 0;
    const ordered = [];
    for (let k = 0; k < occ.length; k++) {
      ordered.push(occ[(start + k) % occ.length]);
    }
    this.activeOrder = ordered;
    return true;
  }

  _resetHandState() {
    for (let i = 0; i < 9; i++) {
      const p = this.seats[i];
      if (p) {
        p.holeCards = [];
        p.folded = false;
        p.betStreet = 0;
      }
    }
    this.board = [];
    this.pot = 0;
    this.deck = [];
    this.currentBet = 0;
    this.minRaise = this.config.bigBlind;
    this.bettingRoundRaises = 0;
    this.checksInRound = 0;
    this.signalDealHole = false;
    this.signalDealFlop = false;
    this.signalDealTurn = false;
    this.signalDealRiver = false;
    this.pendingBetBySeat.clear();
    this.dealReadyAt = null;
    this.emulBetReadyAt = null;
    this.emulBetForSeat = null;
    this.manualBetForSeat = null;
    this.manualBetDeadlineAt = null;
  }

  _postBlinds(sbSeat, bbSeat) {
    const sbAmt = Math.min(this.config.smallBlind, this.seats[sbSeat].stack);
    const bbAmt = Math.min(this.config.bigBlind, this.seats[bbSeat].stack);
    this.seats[sbSeat].stack -= sbAmt;
    this.seats[sbSeat].betStreet += sbAmt;
    this.seats[bbSeat].stack -= bbAmt;
    this.seats[bbSeat].betStreet += bbAmt;
    this.currentBet = Math.max(this.seats[sbSeat].betStreet, this.seats[bbSeat].betStreet);
    void this._tx(sbSeat, -sbAmt, 'sb');
    void this._tx(bbSeat, -bbAmt, 'bb');
    void this._betLog(STREET.preflop, sbSeat, 'sb', sbAmt);
    void this._betLog(STREET.preflop, bbSeat, 'bb', bbAmt);
  }

  async _tx(seatIndex, delta, reason) {
    const p = this.seats[seatIndex];
    await this.logger.logTransaction({
      kind: 'balance',
      userId: p.id,
      seatIndex,
      delta,
      balanceAfter: p.stack,
      handId: this.handId,
      reason,
    });
  }

  async _betLog(street, seatIndex, action, amount) {
    const p = this.seats[seatIndex];
    await this.logger.logBet({
      handId: this.handId,
      street,
      seatIndex,
      userId: p.id,
      action,
      amount,
      potAfter: this.pot,
    });
  }

  _dealHole() {
    for (const si of this.activeOrder) {
      this.seats[si].holeCards = [this.deck.pop(), this.deck.pop()];
    }
  }

  _dealFlop() {
    this.deck.pop();
    this.board.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
  }

  _dealTurn() {
    this.deck.pop();
    this.board.push(this.deck.pop());
  }

  _dealRiver() {
    this.deck.pop();
    this.board.push(this.deck.pop());
  }

  _finalizeStreetToPot() {
    let add = 0;
    for (const si of this.activeOrder) {
      const p = this.seats[si];
      if (!p) continue;
      add += p.betStreet;
      p.betStreet = 0;
    }
    this.pot += add;
    this.currentBet = 0;
    this.minRaise = this.config.bigBlind;
    this.bettingRoundRaises = 0;
    this.checksInRound = 0;
  }

  _firstActorPreflop(sbIdx, bbIdx) {
    const n = this.activeOrder.length;
    if (n === 2) return sbIdx;
    return (bbIdx + 1) % n;
  }

  _initBettingRound(street) {
    this.street = street;
    this.checksInRound = 0;
    const n = this.activeOrder.length;
    const btn = this.buttonSeat;
    const btnPos = this.activeOrder.indexOf(btn);
    const sbPos = n === 2 ? btnPos : (btnPos + 1) % n;
    const bbPos = n === 2 ? (btnPos + 1) % n : (btnPos + 2) % n;
    if (street === STREET.preflop) {
      this.actorCursor = this._firstActorPreflop(sbPos, bbPos);
    } else {
      this.actorCursor = sbPos % n;
    }
    this.betWaitTicks = 0;
    this.emulBetReadyAt = null;
    this.emulBetForSeat = null;
    this.manualBetForSeat = null;
    this.manualBetDeadlineAt = null;
  }

  _toCall(seatIndex) {
    const p = this.seats[seatIndex];
    if (!p || p.folded) return 0;
    return Math.max(0, this.currentBet - p.betStreet);
  }

  _applyFold(seatIndex) {
    this.seats[seatIndex].folded = true;
    void this._betLog(this.street, seatIndex, 'fold', 0);
  }

  _applyCheck(seatIndex) {
    this.checksInRound += 1;
    void this._betLog(this.street, seatIndex, 'check', 0);
  }

  _applyCall(seatIndex) {
    this.checksInRound = 0;
    const p = this.seats[seatIndex];
    const need = this._toCall(seatIndex);
    const pay = Math.min(need, p.stack);
    p.stack -= pay;
    p.betStreet += pay;
    void this._tx(seatIndex, -pay, 'call');
    void this._betLog(this.street, seatIndex, 'call', pay);
  }

  _applyRaise(seatIndex) {
    this.checksInRound = 0;
    const p = this.seats[seatIndex];
    const targetBet = this.currentBet + this.minRaise;
    const chipsNeeded = targetBet - p.betStreet;
    const pay = Math.min(chipsNeeded, p.stack);
    p.stack -= pay;
    p.betStreet += pay;
    if (p.betStreet > this.currentBet) {
      this.currentBet = p.betStreet;
      this.bettingRoundRaises += 1;
    }
    void this._tx(seatIndex, -pay, 'raise');
    void this._betLog(this.street, seatIndex, 'raise', pay);
  }

  /**
   * 라운드 종료: (1) currentBet>0 이면 모두 콜/올인 (toCall==0)
   * (2) currentBet==0 이면 체크가 생존 인원수만큼 쌓임
   */
  _tryCompleteBettingRound() {
    const live = this.activePlayers.map((x) => x.seatIndex);
    if (live.length <= 1) return true;
    for (const si of live) {
      const p = this.seats[si];
      const tc = Math.max(0, this.currentBet - p.betStreet);
      if (p.stack > 0 && tc > 0) return false;
    }
    if (this.currentBet > 0) return true;
    return this.checksInRound >= live.length;
  }

  tickGame() {
    const cfg = this.config;
    switch (this.step) {
      case STEP.WAITING_PLAYERS: {
        if (this.seatedCount >= 2) {
          this.step = STEP.NEW_HAND;
        }
        break;
      }
      case STEP.NEW_HAND: {
        this._resetHandState();
        if (!this._buildActiveOrder()) {
          this.step = STEP.WAITING_PLAYERS;
          break;
        }
        this.handSeq += 1;
        this.handId = `${this.tableId}-h${this.handSeq}-${Date.now()}`;
        this.deck = shuffleInPlace(createDeck(), this.rng);
        this._rotateButton();
        this._buildActiveOrder();
        const n = this.activeOrder.length;
        const btn = this.buttonSeat;
        const btnPos = this.activeOrder.indexOf(btn);
        const sbPos = n === 2 ? btnPos : (btnPos + 1) % n;
        const bbPos = n === 2 ? (btnPos + 1) % n : (btnPos + 2) % n;
        const sbSeat = this.activeOrder[sbPos];
        const bbSeat = this.activeOrder[bbPos];
        this._postBlinds(sbSeat, bbSeat);
        this.step = STEP.WAIT_DEAL_HOLE;
        this.dealReadyAt = cfg.isFlagEmulDeal ? Date.now() + emulDelayMs(cfg, this.rng) : null;
        break;
      }
      case STEP.WAIT_DEAL_HOLE: {
        const ready = cfg.isFlagEmulDeal
          ? this.dealReadyAt != null && Date.now() >= this.dealReadyAt
          : this.signalDealHole;
        if (!ready) break;
        this._dealHole();
        this.signalDealHole = false;
        this.dealReadyAt = null;
        this._initBettingRound(STREET.preflop);
        this.step = STEP.PREFLOP_BET;
        break;
      }
      case STEP.PREFLOP_BET:
      case STEP.FLOP_BET:
      case STEP.TURN_BET:
      case STEP.RIVER_BET: {
        this._tickBetting();
        break;
      }
      case STEP.WAIT_DEAL_FLOP: {
        const ready = cfg.isFlagEmulDeal
          ? this.dealReadyAt != null && Date.now() >= this.dealReadyAt
          : this.signalDealFlop;
        if (!ready) break;
        this._dealFlop();
        this.signalDealFlop = false;
        this.dealReadyAt = null;
        this._initBettingRound(STREET.flop);
        this.step = STEP.FLOP_BET;
        break;
      }
      case STEP.WAIT_DEAL_TURN: {
        const ready = cfg.isFlagEmulDeal
          ? this.dealReadyAt != null && Date.now() >= this.dealReadyAt
          : this.signalDealTurn;
        if (!ready) break;
        this._dealTurn();
        this.signalDealTurn = false;
        this.dealReadyAt = null;
        this._initBettingRound(STREET.turn);
        this.step = STEP.TURN_BET;
        break;
      }
      case STEP.WAIT_DEAL_RIVER: {
        const ready = cfg.isFlagEmulDeal
          ? this.dealReadyAt != null && Date.now() >= this.dealReadyAt
          : this.signalDealRiver;
        if (!ready) break;
        this._dealRiver();
        this.signalDealRiver = false;
        this.dealReadyAt = null;
        this._initBettingRound(STREET.river);
        this.step = STEP.RIVER_BET;
        break;
      }
      case STEP.SHOWDOWN: {
        this._showdown();
        this.step = STEP.CLEANUP;
        break;
      }
      case STEP.CLEANUP: {
        this._resetHandState();
        this.step = this.seatedCount >= 2 ? STEP.NEW_HAND : STEP.WAITING_PLAYERS;
        break;
      }
      default:
        break;
    }
    this.lastSnapshot = this.snapshot();
  }

  _tickBetting() {
    const cfg = this.config;
    const live = this.activePlayers;
    if (live.length <= 1) {
      this._finalizeStreetToPot();
      this._awardPotSingle();
      this.step = STEP.CLEANUP;
      return;
    }
    if (this._tryCompleteBettingRound()) {
      this._streetAdvance();
      return;
    }
    const seat = this.activeOrder[this.actorCursor];
    const p = this.seats[seat];
    if (!p || p.folded || p.stack === 0) {
      this.actorCursor = (this.actorCursor + 1) % this.activeOrder.length;
      return;
    }

    // 직접 로그인 플레이어(isManual): 10초(기본) 내 미응답 시 자동 fold.
    if (p.isManual) {
      if (this.manualBetForSeat !== seat) {
        this.manualBetForSeat = seat;
        this.manualBetDeadlineAt = Date.now() + cfg.manualBetTimeoutMs;
      }
      const pending = this.pendingBetBySeat.get(seat);
      if (pending) {
        this.pendingBetBySeat.delete(seat);
        this._applyPlayerBet(seat, pending.action, pending.amount);
        this.manualBetForSeat = null;
        this.manualBetDeadlineAt = null;
        this._advanceActorAfterAction();
        return;
      }
      if (this.manualBetDeadlineAt != null && Date.now() >= this.manualBetDeadlineAt) {
        this._applyFold(seat);
        this.manualBetForSeat = null;
        this.manualBetDeadlineAt = null;
        this._advanceActorAfterAction();
      }
      return;
    }

    // 직접 로그인 플레이어(isManual) 외 플레이어는 기존 정책 사용.
    if (cfg.isFlagEmulBet && !p.isManual) {
      if (this.emulBetForSeat !== seat) {
        this.emulBetForSeat = seat;
        this.emulBetReadyAt = Date.now() + emulDelayMs(cfg, this.rng);
      }
      if (Date.now() < this.emulBetReadyAt) return;
      this.emulBetReadyAt = null;
      this.emulBetForSeat = null;
      const act = pickEmulBet(this.rng);
      const tc = this._toCall(seat);
      if (act === 'fold' && tc === 0) {
        this._applyCheck(seat);
      } else if (act === 'fold') {
        this._applyFold(seat);
      } else if (act === 'call' || act === 'raise') {
        if (tc === 0 && act === 'call') this._applyCheck(seat);
        else if (tc === 0 && act === 'raise') this._applyRaise(seat);
        else if (act === 'call') this._applyCall(seat);
        else this._applyRaise(seat);
      }
      this._advanceActorAfterAction();
      return;
    }

    this.betWaitTicks += 1;
    const pending = this.pendingBetBySeat.get(seat);
    if (pending) {
      this.pendingBetBySeat.delete(seat);
      this._applyPlayerBet(seat, pending.action, pending.amount);
      this.betWaitTicks = 0;
      this._advanceActorAfterAction();
      return;
    }
    if (this.betWaitTicks >= cfg.betTimeoutTicks) {
      const tc = this._toCall(seat);
      if (tc > 0) this._applyFold(seat);
      else this._applyCheck(seat);
      this.betWaitTicks = 0;
      this._advanceActorAfterAction();
    }
  }

  _applyPlayerBet(seat, action, amount) {
    const tc = this._toCall(seat);
    if (action === 'fold') {
      if (tc === 0) this._applyCheck(seat);
      else this._applyFold(seat);
      return;
    }
    if (action === 'check' && tc === 0) {
      this._applyCheck(seat);
      return;
    }
    if (action === 'call') {
      if (tc === 0) this._applyCheck(seat);
      else this._applyCall(seat);
      return;
    }
    if (action === 'raise') {
      this._applyRaise(seat);
    }
  }

  _advanceActorAfterAction() {
    if (this._tryCompleteBettingRound()) {
      this._streetAdvance();
      return;
    }
    const n = this.activeOrder.length;
    for (let i = 0; i < n; i++) {
      this.actorCursor = (this.actorCursor + 1) % n;
      const seat = this.activeOrder[this.actorCursor];
      const p = this.seats[seat];
      if (p && !p.folded && p.stack >= 0) {
        const tc = this._toCall(seat);
        if (p.stack > 0 || tc > 0) break;
      }
    }
  }

  _streetAdvance() {
    this._finalizeStreetToPot();
    const notFolded = this.activePlayers;
    if (notFolded.length <= 1) {
      this._awardPotSingle();
      this.step = STEP.CLEANUP;
      return;
    }
    if (this.street === STREET.preflop) {
      this.step = STEP.WAIT_DEAL_FLOP;
      this.dealReadyAt = this.config.isFlagEmulDeal
        ? Date.now() + emulDelayMs(this.config, this.rng)
        : null;
      return;
    }
    if (this.street === STREET.flop) {
      this.step = STEP.WAIT_DEAL_TURN;
      this.dealReadyAt = this.config.isFlagEmulDeal
        ? Date.now() + emulDelayMs(this.config, this.rng)
        : null;
      return;
    }
    if (this.street === STREET.turn) {
      this.step = STEP.WAIT_DEAL_RIVER;
      this.dealReadyAt = this.config.isFlagEmulDeal
        ? Date.now() + emulDelayMs(this.config, this.rng)
        : null;
      return;
    }
    if (this.street === STREET.river) {
      this.step = STEP.SHOWDOWN;
    }
  }

  _awardPotSingle() {
    const alive = this.activePlayers.map((x) => x.seatIndex);
    if (alive.length !== 1) return;
    const si = alive[0];
    const won = this.pot;
    this.seats[si].stack += won;
    void this.logger.logRound({
      kind: 'pot_award',
      handId: this.handId,
      reason: 'fold',
      winners: [{ seatIndex: si, userId: this.seats[si].id, amount: this.pot }],
      board: this.board.map(cardToString),
      pot: won,
    });
    void this._tx(si, won, 'pot_win');
    this.pot = 0;
  }

  _showdown() {
    const contenders = this.activePlayers.map((x) => x.seatIndex);
    const scores = contenders.map((si) => {
      const p = this.seats[si];
      const cards7 = [...p.holeCards, ...this.board];
      return { si, score: bestHandScoreFrom7(cards7) };
    });
    const best = Math.max(...scores.map((s) => s.score));
    const win = scores.filter((s) => s.score === best).map((s) => s.si);
    const potTotal = this.pot;
    const base = Math.floor(potTotal / win.length);
    let remainder = potTotal - base * win.length;
    for (let i = 0; i < win.length; i++) {
      const si = win[i];
      const add = base + (i === win.length - 1 ? remainder : 0);
      this.seats[si].stack += add;
      void this._tx(si, add, 'showdown');
    }
    void this.logger.logRound({
      kind: 'showdown',
      handId: this.handId,
      winners: win.map((si, i) => ({
        seatIndex: si,
        userId: this.seats[si].id,
        amount: base + (i === win.length - 1 ? remainder : 0),
      })),
      board: this.board.map(cardToString),
      pot: potTotal,
    });
    this.pot = 0;
  }
}
