import { useState } from 'react'
import { IconUser, IconClock, IconBet, IconPot, IconRoom, IconBlind, IconCards } from './Icons'
import './GameScreen.css'

const LIVE_STREAM_URL = 'https://stream.kingofzeusfin.com/live/player.html?stream=table12_01'

const CHIP_MAP: Record<number, string> = { 10: 'chip_red', 20: 'chip_blue', 50: 'chip_green', 100: 'chip_gold', 200: 'chip_purple', 500: 'chip_black' }
const CHIP_VALUES = [10, 20, 50, 100, 200, 500] as const

const PLAYERS = [
  { id: 1, name: '홀드하자', bet: '0', timeLeft: 12, status: '대기' as const },
  { id: 2, name: 'sdjka', bet: '1,000', timeLeft: 8, status: '배팅중' as const },
  { id: 3, name: '쓰가리', bet: '0', timeLeft: 15, status: '대기' as const },
  { id: 4, name: '데스티니', bet: '500', timeLeft: 10, status: '배팅중' as const },
  { id: 5, name: '그개시인나', bet: '0', timeLeft: 0, status: '폴드' as const },
  { id: 6, name: '에어링앗', bet: '2,000', timeLeft: 5, status: '배팅중' as const },
  { id: 7, name: '플레이어7', bet: '0', timeLeft: 12, status: '대기' as const },
  { id: 8, name: '플레이어8', bet: '500', timeLeft: 3, status: '배팅중' as const },
]

type TabId = 'game' | 'history' | 'chat'

export default function GameScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('game')

  return (
    <div className="game-screen">
      <div className="game-screen__bg" aria-hidden="true" />

      <header className="nav-top">
        <div className="nav-top__logo">
          <img src="/assets/logo/zp.png" alt="Zenith Park" />
        </div>
        <div className="nav-top__info">
          <span className="nav-top__text">10-2K 똑! 등1 - 114572998-11</span>
        </div>
        <div className="nav-top__right">
          <span className="nav-top__text">0</span>
        </div>
      </header>

      <section className="section-video">
        <div className="section-video__wrap">
          <iframe src={LIVE_STREAM_URL} title="라이브 홀덤" className="section-video__iframe" allow="autoplay; fullscreen" />
        </div>
        <div className="section-video__live">
          <span className="section-video__live-badge">LIVE</span>
          <span className="section-video__viewers">1.8</span>
        </div>
      </section>

      {/* 가운데(우선) + 하단 탭(남은 영역 후순위) */}
      <div className="main-wrap">
        {/* 가운데: 배팅/플레이어 카드 영역 - 스크롤 없음 */}
        <section className="section-game">
          <div className="info-row">
            <span className="info-item"><IconBlind /> <span>10-2K</span></span>
            <span className="info-item"><IconRoom /> <span>룸1 · 114571298-11</span></span>
            <span className="info-item"><IconBet /> <span>베팅 0</span></span>
          </div>

          {/* 플레이어 4×2 */}
          <div className="players-grid">
            {PLAYERS.map((p) => (
              <div key={p.id} className="player-panel">
                <div className="player-panel__row player-panel__head">
                  <span className="player-panel__id"><IconUser /> <span>{p.name}</span></span>
                  <span className="player-panel__meta"><IconClock /> <span>{p.timeLeft}s</span> <IconBet /> <span>{p.status}</span></span>
                </div>
                <div className="player-panel__row player-panel__bet">{p.bet}</div>
                <div className="player-panel__row player-panel__cards">
                  <img src="/assets/cards/card_back.png" alt="" />
                  <img src="/assets/cards/card_back.png" alt="" />
                </div>
              </div>
            ))}
          </div>

          {/* Row 3: 내 플레이어 정보 한 줄 (잔액, 마지막 배팅, 총배팅, 패정보, 족보) */}
          <div className="my-info-row">
            <span className="my-info__item"><strong>잔액</strong> 124,500</span>
            <span className="my-info__item"><strong>마지막 배팅</strong> 500</span>
            <span className="my-info__item"><strong>총배팅</strong> 2,500</span>
            <span className="my-info__item"><strong>패</strong> ♠A ♥K</span>
            <span className="my-info__item"><strong>족보</strong> 탑페어</span>
          </div>

          <div className="flop-row">
            {[0, 1, 2, 3, 4].map((i) => (
              <img key={i} src="/assets/cards/card_back.png" alt="" />
            ))}
          </div>

          <div className="pot-row">
            <IconPot />
            <span>POT</span>
            <span className="pot-row__amount">57,000</span>
          </div>

          <div className="chips-row">
            {CHIP_VALUES.map((v) => (
              <button key={v} type="button" className="chip-btn" aria-label={`${v}`}>
                <img src={`/assets/chips/${CHIP_MAP[v]}.png`} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </button>
            ))}
          </div>

          <div className="actions-row">
            <button type="button" className="btn btn--primary">2배 배팅</button>
            <button type="button" className="btn btn--primary">배팅 취소</button>
          </div>

          {/* 내 패 (가운데 영역 안에 포함) */}
          <div className="section-my-hand">
            <IconCards />
            <span className="section-my-hand__label">내패</span>
            <img src="/assets/cards/card_back.png" alt="" />
            <img src="/assets/cards/card_back.png" alt="" />
          </div>
        </section>

        {/* 하단: 게임이력/채팅 판넬 - 남은 영역 사용 (후순위) */}
        <section className={`section-tab ${activeTab !== 'game' ? 'is-visible' : ''}`}>
          {activeTab === 'history' && (
            <div className="tab-content tab-content--history">
              <div className="history-grid">
                {Array.from({ length: 16 * 16 }).map((_, i) => (
                  <div key={i} className="history-cell" />
                ))}
              </div>
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="tab-content tab-content--chat">
              <div className="tab-chat__messages">
                <div>[rochono] 폴드라자낭</div>
                <div>[user2] 콜</div>
              </div>
              <div className="tab-chat__input">
                <input type="text" placeholder="메시지 입력" className="input" />
                <button type="button" className="btn btn--primary">전송</button>
              </div>
            </div>
          )}
        </section>
      </div>

      <nav className="nav-bottom">
        <button type="button" className={`nav-bottom__btn ${activeTab === 'history' ? 'is-active' : ''}`} onClick={() => setActiveTab(activeTab === 'history' ? 'game' : 'history')}>게임이력</button>
        <button type="button" className={`nav-bottom__btn ${activeTab === 'chat' ? 'is-active' : ''}`} onClick={() => setActiveTab(activeTab === 'chat' ? 'game' : 'chat')}>채팅</button>
      </nav>

      <div className="orientation-msg" aria-hidden="true">세로로 돌려주세요</div>
    </div>
  )
}
