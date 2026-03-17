import { useState, useMemo, useRef, useEffect, memo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import './GamePageNew.css'

const STREAM_PLAYER_BASE = 'https://stream.fairshipstore.com/live/player.html'

/** streamId 검증: tableNN_MM 형식 (예: table01_04, table06_01) */
function isValidStreamId(s: string | null): boolean {
  return !!s && /^table\d{2}_\d{2}$/.test(s)
}

function getStreamPlayerUrl(streamId: string): string {
  const id = isValidStreamId(streamId) ? streamId : DEFAULT_STREAM_ID
  return `${STREAM_PLAYER_BASE}?stream=${id}`
}

const DEFAULT_STREAM_ID = 'table01_01'

/** 영상 영역만 분리·메모이제이션 — 부모 리렌더 시 iframe이 재생성되지 않도록 */
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
      <span className="live-stream__viewers">Viewers: 1200</span>
    </section>
  )
})

type PanelTab = 'history' | 'chat'
type PlayerSlotState = 'turn' | 'fold' | 'waiting' | 'default'

/** 카드 suit+rank (tools/output/cards: S,H,D,C + A,2..10,J,Q,K → SA.webp 등) */
const SUITS = ['S', 'H', 'D', 'C']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const CARD_IDS = SUITS.flatMap((s) => RANKS.map((r) => s + r))

function cardSrc(id: string): string {
  return `/assets/cards/${id}.webp`
}

/** 랜덤 n장 뽑기 (중복 허용) */
function pickRandomCards(n: number): string[] {
  const out: string[] = []
  for (let i = 0; i < n; i++) out.push(CARD_IDS[Math.floor(Math.random() * CARD_IDS.length)])
  return out
}

/** AI 생성 칩 이미지 (tools: npm run chips:ai && npm run copy-assets) */
const CHIP_VALUES = [
  { value: 10, src: '/assets/chips/chip_10.png', label: '10' },
  { value: 100, src: '/assets/chips/chip_100.png', label: '100' },
  { value: 500, src: '/assets/chips/chip_500.png', label: '500' },
  { value: 1000, src: '/assets/chips/chip_1k.png', label: '1k' },
  { value: 5000, src: '/assets/chips/chip_5k.png', label: '5k' },
  { value: 10000, src: '/assets/chips/chip_10k.png', label: '10k' },
  { value: 50000, src: '/assets/chips/chip_50k.png', label: '50k' },
]

const PLAYER_SLOTS: { state: PlayerSlotState; id: string; chips: string; timerSec?: number }[] = [
  { state: 'turn', id: 'player 1', chips: '103,000', timerSec: 15 },
  { state: 'fold', id: '—', chips: '—' },
  { state: 'waiting', id: 'player 3', chips: '50,000' },
  { state: 'default', id: '—', chips: '—' },
  { state: 'default', id: '—', chips: '—' },
  { state: 'default', id: '—', chips: '—' },
  { state: 'default', id: '—', chips: '—' },
  { state: 'default', id: '—', chips: '—' },
]

function parseStreamId(s: string | null): string {
  if (isValidStreamId(s)) return s!
  return DEFAULT_STREAM_ID
}

export default function GamePageNew() {
  const [searchParams] = useSearchParams()
  const streamId = parseStreamId(searchParams.get('stream'))
  const [panelTab, setPanelTab] = useState<PanelTab>('history')

  const randomCards = useMemo(() => {
    const player = Array.from({ length: 8 }, () => pickRandomCards(2))
    const community = pickRandomCards(5)
    const user = pickRandomCards(2)
    return { player, community, user }
  }, [])

  return (
    <div className="ui-new">
      <header className="header-bar">
        <div className="header-bar__left">
          <img src="/assets/logo/zp.png" alt="Game Logo" className="header-bar__logo-img" />
        </div>
        <div className="header-bar__right">
          <Link to="/" className="header-bar__lobby-btn" aria-label="로비">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
            <span>LOBBY</span>
          </Link>
        </div>
      </header>

      <LiveStreamSection streamId={streamId} />

      <section className="player-hands">
        <div className="player-hands__grid">
          {PLAYER_SLOTS.map((slot, i) => (
            <div key={i} className={`player-slot player-slot--${slot.state}`}>
              {slot.timerSec != null && (
                <span className="player-slot__timer">{slot.timerSec}s</span>
              )}
              <div className="player-slot__head">
                <span className="player-slot__id">{slot.id}</span>
                <span className="player-slot__chips">{slot.chips}</span>
              </div>
              <div className="player-slot__cards">
                <img src={cardSrc(randomCards.player[i][0])} alt="" className="card-img" />
                <img src={cardSrc(randomCards.player[i][1])} alt="" className="card-img" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="community-cards">
        <div className="community-cards__row">
          <div className="flop-info flop-info--left">
            <span className="flop-info__item"><span className="flop-info__icon">POT</span> 1,200</span>
            <span className="flop-info__item"><span className="flop-info__icon">OUTS</span> 9</span>
          </div>
          <div className="community-cards__cards">
            {randomCards.community.map((id, i) => (
              <img key={i} src={cardSrc(id)} alt="" className="card-img" />
            ))}
          </div>
          <div className="flop-info flop-info--right">
            <span className="flop-info__item"><span className="flop-info__icon">EQ%</span> 35%</span>
          </div>
        </div>
      </section>

      <section className="betting-controls">
        <div className="betting-controls__row1">
          <span className="pot-label">POT: $1200</span>
          <div className="betting-controls__actions">
            <button type="button" className="btn btn--blue">Bet 2x</button>
            <button type="button" className="btn btn--gray">Cancel</button>
          </div>
        </div>
        <div className="betting-controls__chips">
          {CHIP_VALUES.map((c) => (
            <button key={c.value} type="button" className="chip chip--img" aria-label={`chip ${c.label}`}>
              <img src={c.src} alt="" className="chip__img" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            </button>
          ))}
        </div>
      </section>

      <section className="user-info-row">
        <div className="user-info-row__top">
          <div className="user-info-row__cards">
            <img src={cardSrc(randomCards.user[0])} alt="" className="card-img" />
            <img src={cardSrc(randomCards.user[1])} alt="" className="card-img" />
          </div>
        </div>
        <div className="user-info-row__bottom">
          <div className="user-info-row__balance">
            <span className="user-info-row__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </span>
            <div>
              <span className="user-info-row__label">balance</span>
              <span className="user-info-row__value">12,043,000</span>
            </div>
          </div>
          <div className="user-info-row__hand">
            <span className="user-info-row__hand-name">3 CARD</span>
            <span className="user-info-row__action">129,000 CALL</span>
          </div>
        </div>
      </section>

      <section className="bottom-panel">
        <div className="bottom-panel__tabs">
          <button type="button" className={`panel-tab ${panelTab === 'history' ? 'is-active' : ''}`} onClick={() => setPanelTab('history')}>Game History</button>
          <button type="button" className={`panel-tab ${panelTab === 'chat' ? 'is-active' : ''}`} onClick={() => setPanelTab('chat')}>Chat</button>
        </div>
        <div className="bottom-panel__content">
          {panelTab === 'history' && (
            <div className="history-grid">
              {Array.from({ length: 16 * 16 }).map((_, i) => (
                <div key={i} className="history-cell" />
              ))}
            </div>
          )}
          {panelTab === 'chat' && (
            <div className="chat-panel">
              <div className="chat-panel__messages">
                <div>Player 1: Nice hand!</div>
                <div>Dealer: Next hand in 10 seconds.</div>
              </div>
              <div className="chat-panel__input">
                <input type="text" placeholder="Message" />
                <button type="button">SEND</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
