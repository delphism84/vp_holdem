import { useMemo, useRef, useEffect, useState, memo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import './GamePageNew.css'
import { useHoldemWs, defaultHoldemWsUrl, type HoldemState } from '../hooks/useHoldemWs'
import { phaseLabelKo } from '../holdem/phases'
import { beCardToAssetId, cardAssetSrc } from '../lib/holdemCards'

const STREAM_PLAYER_BASE = 'https://stream.kingofzeusfin.com/live/player.html'

function isValidStreamId(s: string | null): boolean {
  return !!s && /^table\d{2}_\d{2}$/.test(s)
}

function getStreamPlayerUrl(streamId: string): string {
  const id = isValidStreamId(streamId) ? streamId : DEFAULT_STREAM_ID
  return `${STREAM_PLAYER_BASE}?stream=${id}`
}

const DEFAULT_STREAM_ID = 'table01_01'

const LiveStreamSection = memo(function LiveStreamSection({ streamId }: { streamId: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const srcSetRef = useRef(false)
  const playerUrl = getStreamPlayerUrl(streamId)
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || srcSetRef.current) return
    iframe.src = playerUrl
    srcSetRef.current = true
  }, [playerUrl])
  return (
    <section className="live-stream" data-stream-id={streamId}>
      <div className="live-stream__media">
        <iframe ref={iframeRef} title="Live" className="live-stream__iframe" src={playerUrl} referrerPolicy="no-referrer" allow="autoplay; fullscreen" />
      </div>
      <span className="live-stream__badge">LIVE</span>
      <span className="live-stream__viewers">Viewers: —</span>
    </section>
  )
})

function dealKindFromPhase(phase: string | undefined): 'hole' | 'flop' | 'turn' | 'river' | null {
  if (phase === 'deal_hole') return 'hole'
  if (phase === 'deal_flop') return 'flop'
  if (phase === 'deal_turn') return 'turn'
  if (phase === 'deal_river') return 'river'
  return null
}

function streetLabelKo(street: string | undefined): string {
  const m: Record<string, string> = {
    preflop: '프리플롭',
    flop: '플롭',
    turn: '턴',
    river: '리버',
  }
  return street ? m[street] ?? street : '—'
}

/** 좁은 슬롯용 칩 축약 (8230 → 8.2K) */
function formatChipShort(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

function CardImg({ code, variant = 'full' }: { code: string; variant?: 'full' | 'half' }) {
  if (code === '**' || !code) {
    return <div className={`card-img card-img--back ${variant === 'half' ? 'card-img--half' : ''}`} aria-hidden />
  }
  const id = beCardToAssetId(code)
  return (
    <img
      src={cardAssetSrc(id)}
      alt=""
      className={`card-img ${variant === 'half' ? 'card-img--half' : ''}`}
      onError={(e) => {
        const img = e.currentTarget
        if (img.src.includes('/assets/cards/card_back.webp')) return
        img.src = '/assets/cards/card_back.webp'
      }}
    />
  )
}

const DEFAULT_BUYIN = 10_000

function parseSeatFromParams(sp: URLSearchParams): number | null {
  const raw = sp.get('seat')
  if (raw === null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 && n <= 8 ? n : null
}

/**
 * 상단 8 슬롯: 고정 시트 1~8이 아니라 테이블 주변 8칸.
 * 착석 시 본인 기준 시계 방향(내 다음 시트부터), 관전 시 버튼 다음 시트부터 8칸.
 */
function panelSeatOrder(seatedSeat: number | null, buttonSeat: number | null | undefined): number[] {
  if (seatedSeat != null) {
    return Array.from({ length: 8 }, (_, i) => (seatedSeat + 1 + i) % 9)
  }
  if (buttonSeat != null && buttonSeat >= 0 && buttonSeat <= 8) {
    return Array.from({ length: 8 }, (_, i) => (buttonSeat + 1 + i) % 9)
  }
  return [0, 1, 2, 3, 4, 5, 6, 7]
}

function isBettingPhaseKey(phase: string | undefined): boolean {
  return (
    phase === 'preflop_bet' || phase === 'flop_bet' || phase === 'turn_bet' || phase === 'river_bet'
  )
}

/** 현재 액터 기준 남은 배팅 시간(초), 배팅 스텝이 아니면 null */
function bettingSecondsLeft(state: HoldemState | null, now: number): number | null {
  if (!state || !isBettingPhaseKey(state.phase)) return null
  const as = state.actorSeat
  if (as == null || as < 0 || as > 8) return null
  const actor = state.seats?.[as]
  if (!actor) return null
  if (actor.isManual === true && state.manualBetDeadlineAt != null) {
    return Math.max(0, (state.manualBetDeadlineAt - now) / 1000)
  }
  if (actor.isManual !== true && state.emulBetReadyAt != null) {
    return Math.max(0, (state.emulBetReadyAt - now) / 1000)
  }
  const bt = state.betTimeoutTicks ?? 150
  const bw = state.betWaitTicks ?? 0
  const tms = state.tickMs ?? 200
  return Math.max(0, ((bt - bw) * tms) / 1000)
}

export default function GamePageNew() {
  const [wsLogOpen, setWsLogOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const streamId = isValidStreamId(searchParams.get('stream')) ? searchParams.get('stream')! : DEFAULT_STREAM_ID

  const tableId =
    searchParams.get('table') ||
    (import.meta.env.VITE_HOLDEM_TABLE_ID as string | undefined) ||
    'table01'
  const userId = searchParams.get('userId')?.trim() || 'player-1'
  const buyIn = Math.max(100, Number(searchParams.get('buyIn') ?? '') || DEFAULT_BUYIN)

  /** 착석 좌석 (버튼 선택 또는 URL ?seat= / 서버 동기화) */
  const [seatedSeat, setSeatedSeat] = useState<number | null>(() => parseSeatFromParams(searchParams))

  const wsUrl = useMemo(() => defaultHoldemWsUrl(), [])
  const { connected, state, lastError, send } = useHoldemWs({
    wsUrl,
    tableId,
    seatIndex: seatedSeat,
    userId,
    enabled: true,
  })

  /** 로컬에 좌석 없을 때: 서버에 수동 착석만 있으면 동기화 */
  useEffect(() => {
    if (!state?.seats || seatedSeat != null) return
    const idx = state.seats.findIndex((s) => s && s.id === userId && s.isManual === true)
    if (idx >= 0) {
      setSeatedSeat(idx)
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('seat', String(idx))
          return p
        },
        { replace: true },
      )
    }
  }, [state?.seats, userId, seatedSeat, setSearchParams])

  const phase = state?.phase
  const dealKind = dealKindFromPhase(phase)
  const seats = state?.seats ?? Array(9).fill(null)
  const board = state?.board ?? []
  const pot = state?.pot ?? 0
  const actorSeat = state?.actorSeat ?? null
  const occupiedSeatIndexes = seats
    .map((seat: any, idx: number) => (seat ? idx : null))
    .filter((idx: number | null): idx is number => idx != null)
  const buttonSeat = state?.buttonSeat
  let sbSeat: number | null = null
  let bbSeat: number | null = null
  if (occupiedSeatIndexes.length >= 2 && buttonSeat != null) {
    const btnPos = occupiedSeatIndexes.indexOf(buttonSeat)
    if (btnPos >= 0) {
      const n = occupiedSeatIndexes.length
      const sbPos = n === 2 ? btnPos : (btnPos + 1) % n
      const bbPos = n === 2 ? (btnPos + 1) % n : (btnPos + 2) % n
      sbSeat = occupiedSeatIndexes[sbPos] ?? null
      bbSeat = occupiedSeatIndexes[bbPos] ?? null
    }
  }
  const mySeat = seatedSeat != null ? seats[seatedSeat] : null
  const toCall =
    mySeat && state?.currentBet != null ? Math.max(0, state.currentBet - mySeat.betStreet) : 0

  const isBettingPhase =
    phase === 'preflop_bet' ||
    phase === 'flop_bet' ||
    phase === 'turn_bet' ||
    phase === 'river_bet'

  const [betClock, setBetClock] = useState(0)
  useEffect(() => {
    if (!isBettingPhase) return
    const id = window.setInterval(() => setBetClock((c) => c + 1), 100)
    return () => clearInterval(id)
  }, [isBettingPhase, state?.actorSeat, state?.phase])

  const bettingSeconds = useMemo(() => bettingSecondsLeft(state, Date.now()), [state, betClock])

  const showMyActions =
    state &&
    seatedSeat != null &&
    !state.emulBet &&
    isBettingPhase &&
    actorSeat === seatedSeat &&
    mySeat &&
    !mySeat.folded

  const showDealAck = state && seatedSeat != null && !state.emulDeal && dealKind != null

  const communitySlots = useMemo(() => {
    const b = [...board]
    while (b.length < 5) b.push('')
    return b.slice(0, 5)
  }, [board])

  const callOrCheckLabel = toCall > 0 ? 'CALL' : 'CHECK'
  const totalBetAmount = (state?.pot ?? 0) + seats.reduce((acc: number, s: any) => acc + (s?.betStreet ?? 0), 0)
  const myBetAmount = mySeat?.betStreet ?? 0
  const otherSeatIndexes = useMemo(
    () => panelSeatOrder(seatedSeat, state?.buttonSeat ?? null),
    [seatedSeat, state?.buttonSeat],
  )
  const panelSlots = useMemo(() => {
    return Array.from({ length: 9 }, (_, slotIdx) => {
      if (slotIdx === 7) return { kind: 'pot' as const, seatIndex: null as number | null }
      const otherIdx = slotIdx < 7 ? slotIdx : slotIdx - 1
      return { kind: 'seat' as const, seatIndex: otherSeatIndexes[otherIdx] ?? null }
    })
  }, [otherSeatIndexes])

  function handlePickSeat(si: number) {
    send({ type: 'join_seat', seatIndex: si, userId, buyIn })
    setSeatedSeat(si)
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('seat', String(si))
        return p
      },
      { replace: true },
    )
  }

  function handleLeaveSeat() {
    if (seatedSeat == null) return
    send({ type: 'leave_seat', seatIndex: seatedSeat })
    setSeatedSeat(null)
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('seat')
        return p
      },
      { replace: true },
    )
  }

  const serverBettingHint = !state
    ? '—'
    : state.emulBet && state.emulDeal
      ? 'Server deal & betting (emulated)'
      : state.emulBet
        ? 'Server betting (emulated)'
        : state.emulDeal
          ? 'Server deal (emulated)'
          : 'Live'

  return (
    <div className="ui-new">
      <header className="header-bar">
        <div className="header-bar__left">
          <button
            type="button"
            className="header-bar__logo-btn"
            onClick={() => setWsLogOpen((v) => !v)}
            aria-pressed={wsLogOpen}
            aria-label={wsLogOpen ? '상태 로그 패널 닫기' : '상태 로그 패널 열기'}
            title="상태 로그 (WS)"
          >
            <img src="/assets/logo/zp.png" alt="" className="header-bar__logo-img" />
          </button>
        </div>
        <div className="header-bar__right">
          <span className="ws-pill" data-connected={connected}>
            {connected ? 'WS' : '…'}
          </span>
          <Link to="/" className="header-bar__lobby-btn" aria-label="로비">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
            <span>LOBBY</span>
          </Link>
        </div>
      </header>

      <div className="game-phase-banner">
        <span className="game-phase-banner__phase">{phaseLabelKo(phase)}</span>
        <span className="game-phase-banner__meta">
          {state?.handId ? ` · ${state.handId}` : ''}
          {lastError ? ` · ${lastError}` : ''}
        </span>
      </div>

      <div className="ui-new__scroll">
        <LiveStreamSection streamId={streamId} />

        <section className="player-hands" aria-label="플레이어 3×3">
          <div className="player-hands__grid player-hands__grid--3x3">
            {panelSlots.map((panel, i) => {
              if (panel.kind === 'pot') {
                return (
                  <div key={`pot-${i}`} className="player-slot player-slot--pot">
                    <div className="pot-slot">
                      <div className="pot-slot__line">
                        <span className="pot-slot__icon">💰</span>
                        <span>총 배팅금 {formatChipShort(totalBetAmount)}</span>
                      </div>
                      <div className="pot-slot__line">
                        <span className="pot-slot__icon">👤</span>
                        <span>내 배팅금 {formatChipShort(myBetAmount)}</span>
                      </div>
                    </div>
                  </div>
                )
              }
              const si = panel.seatIndex
              const s = si != null ? seats[si] : null
              const isActor = si != null && actorSeat === si
              const blindBadge = si == null ? null : sbSeat === si ? 'SB' : bbSeat === si ? 'BB' : null
              const slotClass = s
                ? s.folded
                  ? 'fold'
                  : isActor
                    ? 'turn'
                    : 'waiting'
                : 'default'
              const badge = !s ? 'EMPTY' : s.folded ? 'FOLD' : isActor ? 'ACT' : 'WAIT'
              return (
                <div
                  key={i}
                  className={`player-slot player-slot--${slotClass}${si == null ? ' player-slot--no-seat' : ''}${si != null && !s ? ' player-slot--empty-seat' : ''}`}
                >
                  <div className="player-slot__layout">
                    <div className="player-slot__head">
                      <span
                        className="player-slot__id"
                        title={s ? `${s.id} · 테이블 #${si != null ? si + 1 : '—'}` : si != null ? `빈 자리 (테이블 #${si + 1})` : ''}
                      >
                        {s ? s.id : si != null ? '빈 자리' : '—'}
                      </span>
                      <div className="player-slot__badges">
                        <span className={`player-slot__badge player-slot__badge--${badge.toLowerCase()}`}>{badge}</span>
                        {blindBadge ? (
                          <span className={`player-slot__blind player-slot__blind--${blindBadge.toLowerCase()}`}>{blindBadge}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="player-slot__cards">
                      {seatedSeat == null && !s && si != null ? (
                        <button
                          type="button"
                          className="player-slot__seat-btn"
                          disabled={!connected}
                          onClick={() => handlePickSeat(si)}
                          aria-label={`테이블 ${si + 1}번 좌석 착석`}
                        >
                          #{si + 1}
                        </button>
                      ) : s?.hole?.length ? (
                        s.hole.map((c: string, j: number) => <CardImg key={j} code={c} />)
                      ) : (
                        <>
                          <div className="card-img card-img--back" />
                          <div className="card-img card-img--back" />
                        </>
                      )}
                    </div>
                    <div className="player-slot__betline">
                      베팅금 {s ? formatChipShort(s.betStreet) : '—'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="game-status-bar" aria-label="상태">
          <div className="game-status-bar__row">
            <span className="game-status-bar__item">
              <span className="game-status-bar__label">To call</span>{' '}
              <span className="game-status-bar__value">{formatChipShort(toCall)}</span>
            </span>
            <span className="game-status-bar__item game-status-bar__item--pot">
              <span className="game-status-bar__label">Pot</span>{' '}
              <span className="game-status-bar__value">{formatChipShort(pot)}</span>
            </span>
            <span className="game-status-bar__hint" title={serverBettingHint}>
              {serverBettingHint}
            </span>
          </div>
        </section>

        <section className="community-cards community-cards--compact" aria-label="보드">
          <div className="community-cards__row">
            <div className="flop-info flop-info--left">
              <span className="flop-info__item">
                <span className="flop-info__icon">ST</span> {streetLabelKo(state?.street)}
              </span>
            </div>
            <div className="community-cards__cards community-cards__cards--half">
              {communitySlots.map((c, i) =>
                c ? <CardImg key={i} code={c} variant="half" /> : <div key={i} className="card-img card-img--back card-img--half" />,
              )}
            </div>
            <div className="flop-info flop-info--right">
              <span className="flop-info__item">
                <span className="flop-info__icon">BTN</span> {state?.buttonSeat ?? '—'}
              </span>
            </div>
          </div>
        </section>

        {showDealAck && dealKind && (
          <section className="deal-ack-bar">
            <button type="button" className="btn btn--blue" onClick={() => send({ type: 'deal_ack', kind: dealKind })}>
              딜러 신호 ({dealKind})
            </button>
          </section>
        )}
      </div>

      <div className="ui-new__dock">
        <section className="user-info-row" aria-label="내 정보">
          <div className="user-info-row__cards">
            {mySeat?.hole?.length ? (
              mySeat.hole.map((c: string, i: number) => <CardImg key={i} code={c} />)
            ) : (
              <>
                <div className="card-img card-img--back" />
                <div className="card-img card-img--back" />
              </>
            )}
          </div>
          <div className="user-info-row__bet-timer" aria-live="polite">
            <span className="user-info-row__bet-timer-label">배팅</span>
            <span className="user-info-row__bet-timer-value">
              {isBettingPhase && bettingSeconds != null ? `${bettingSeconds.toFixed(1)}s` : '—'}
            </span>
            {isBettingPhase && actorSeat != null && (
              <span className="user-info-row__bet-timer-actor" title="현재 액터">
                → {seats[actorSeat]?.id ?? `·${actorSeat + 1}`}
              </span>
            )}
          </div>
          <div className="user-info-row__balance">
            <span className="user-info-row__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </span>
            <div className="user-info-row__balance-text">
              <span className="user-info-row__label">seat {seatedSeat != null ? seatedSeat : '—'}</span>
              <span className="user-info-row__value">{mySeat ? mySeat.stack.toLocaleString() : '—'}</span>
            </div>
          </div>
          <div className="user-info-row__hand">
            <span className="user-info-row__hand-name">{userId}</span>
            <span className="user-info-row__action" title={wsUrl}>
              {connected ? '●' : '○'}
            </span>
            {seatedSeat != null && (
              <button type="button" className="user-info-row__exit" onClick={handleLeaveSeat} aria-label="일어나기">
                EXIT
              </button>
            )}
          </div>
        </section>

        <section className="betting-controls">
          <div className="betting-controls__row1">
            <div className="betting-controls__actions betting-controls__actions--full" role="toolbar" aria-label="Betting">
              {showMyActions ? (
                <>
                  <button
                    type="button"
                    className="btn btn--fold"
                    onClick={() => send({ type: 'bet', seatIndex: seatedSeat!, action: 'fold' })}
                  >
                    FOLD
                  </button>
                  <button
                    type="button"
                    className="btn btn--call"
                    onClick={() => send({ type: 'bet', seatIndex: seatedSeat!, action: toCall > 0 ? 'call' : 'check' })}
                  >
                    {callOrCheckLabel}
                  </button>
                  <button type="button" className="btn btn--raise" onClick={() => send({ type: 'bet', seatIndex: seatedSeat!, action: 'raise' })}>
                    RAISE
                  </button>
                </>
              ) : (
                <span className="betting-controls__hint">
                  {seatedSeat == null
                    ? '좌석을 선택해 착석하세요'
                    : state?.emulBet
                      ? 'Server betting (emulated)'
                      : 'Wait for your turn'}
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      {wsLogOpen && (
        <section className="bottom-panel bottom-panel--ws" aria-label="상태 로그">
          <div className="bottom-panel__content bottom-panel__content--json">
            <pre className="ws-debug-pre">{state ? JSON.stringify(state, null, 2) : 'state 수신 대기…'}</pre>
          </div>
        </section>
      )}
    </div>
  )
}
