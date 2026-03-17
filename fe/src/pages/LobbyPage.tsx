import { Link } from 'react-router-dom'
import './LobbyPage.css'

const THUMB_BASE = 'https://stream.fairshipstore.com/live/thumb'

/** table01_01, table02_01, ... table16_01 썸네일 16개 */
const STREAM_IDS = Array.from({ length: 16 }, (_, i) =>
  `table${String(i + 1).padStart(2, '0')}_01`
)

/** 게임 목록 아이템 (스트림 ID, 참여자, 총배팅, 최소배팅, 게임종료 여부) */
const GAMES = STREAM_IDS.map((streamId, i) => ({
  streamId,
  participants: 4 + (i % 5),
  totalBet: [120000, 57000, 89000, 210000, 45000][i % 5],
  minBet: [10000, 5000, 20000, 10000, 5000][i % 5],
  isEnded: i % 6 === 0,
}))

function Thumbnail({ streamId }: { streamId: string }) {
  const thumbUrl = `${THUMB_BASE}/${streamId}.jpg`
  return (
    <div className="lobby-card__thumb-wrap">
      <img
        src={thumbUrl}
        alt=""
        className="lobby-card__thumb"
        onError={(e) => {
          const el = e.currentTarget
          el.onerror = null
          el.style.display = 'none'
        }}
      />
    </div>
  )
}

export default function LobbyPage() {
  return (
    <div className="lobby">
      <header className="lobby-appbar">
        <div className="lobby-appbar__left">
          <Link to="/" className="lobby-appbar__logo-link">
            <img src="/assets/logo/zp.png" alt="Zenith Park" className="lobby-appbar__logo" />
          </Link>
        </div>
        <div className="lobby-appbar__right">
          <button type="button" className="lobby-appbar__icon-btn" aria-label="설정">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.44.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </button>
          <div className="lobby-appbar__user">
            <span className="lobby-appbar__badge">Lv.3</span>
            <span className="lobby-appbar__name">Guest</span>
            <span className="lobby-appbar__avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </span>
          </div>
        </div>
      </header>

      <main className="lobby-main">
        <ul className="lobby-grid">
          {GAMES.map((game) => (
            <li key={game.streamId} className="lobby-card">
              <Link to={`/game?stream=${game.streamId}`} className="lobby-card__link">
                <Thumbnail streamId={game.streamId} />
                <div className="lobby-card__info">
                  <div className="lobby-card__meta">
                    <span className="lobby-card__meta-item" title="참여자">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                      {game.participants}
                    </span>
                    <span className="lobby-card__meta-item" title="총 배팅금">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                      {(game.totalBet / 1000).toFixed(0)}K
                    </span>
                    <span className="lobby-card__meta-item" title="최소 배팅">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                      {(game.minBet / 1000).toFixed(0)}K
                    </span>
                    {game.isEnded && (
                      <span className="lobby-card__meta-item lobby-card__meta-item--ended" title="게임 종료">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        종료
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
