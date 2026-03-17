# 레퍼런스 UI 동일 구현용 CSS·HTML 분석

다크 테마 라이브 포커 UI 기준. 반투명 패널 + vh 기반 세로 분할.

---

## 1. 전체 구조 (5개 세로 구역)

| 구역 | 높이 | 비고 |
|------|------|------|
| 상단 네비/정보 바 | **5vh** | 고정 |
| 라이브 영상 | **35vh** | 고정 |
| 메인 게임 영역 (플레이어·커뮤니티카드·배팅) | **45vh** | 스크롤 없음, 중요 |
| 내 패 (유저 핸드) | **10vh** | 고정 |
| 게임이력·채팅 패널 | **5vh** (헤더) + **남은 영역** | 후순위, 스크롤 |

**루트 컨테이너**
```css
.game-screen {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  color: #fff;
  font-family: 'Segoe UI', Arial, 'Noto Sans KR', sans-serif;
}
```

---

## 2. 글로벌 스타일

| 항목 | 값 |
|------|-----|
| 배경 | `background-color: #000;` + `background-image: url('/assets/back.png');` `background-repeat: repeat;` 또는 `cover` |
| 패널 공통 | `background: rgba(30, 30, 30, 0.8);` / `rgba(60, 60, 60, 0.7)` |
| 테두리/모서리 | `border-radius: 10px;` (패널), `border: 1px solid rgba(255,255,255,0.2);` |
| 기본 글자 | `color: #fff;` |
| 보조 글자 | `color: #ccc;` / `#aaa` |
| 강조 숫자/금액 | `color: #fff; font-weight: bold;` |
| 패딩/간격 | 10px ~ 20px 일관 적용 |

---

## 3. 상단 네비/정보 바 (5vh)

**HTML 골격**
```html
<header class="nav-top">
  <div class="nav-top__title">
    <span class="nav-top__icon">♦</span>
    <span>TEXAS HOLD'EM LIVE</span>
  </div>
  <div class="nav-top__game">GAME: HIGH STAKES TABLE - BLINDS $50/$100</div>
  <div class="nav-top__user">
    BALANCE: <strong>$25,000.00</strong> | USER: <strong>Player One</strong>
  </div>
  <div class="nav-top__live">
    <span class="nav-top__live-dot"></span> LIVE · VIEWERS: 12,450
  </div>
</header>
```

**CSS**
```css
.nav-top {
  height: 5vh;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px 0 20px;
  background: rgba(0, 0, 0, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  flex-wrap: wrap;
  gap: 8px;
}

.nav-top__title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 1.2em;
  font-weight: bold;
  color: #fff;
}

.nav-top__icon { color: #c41e3a; } /* 다이아몬드 등 */

.nav-top__game {
  font-size: 0.9em;
  color: #ccc;
}

.nav-top__user {
  font-size: 0.9em;
  color: #ccc;
}
.nav-top__user strong { color: #fff; }

.nav-top__live {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8em;
  font-weight: bold;
  color: #fff;
}

.nav-top__live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f00;
  flex-shrink: 0;
}
```

---

## 4. 라이브 영상 (35vh)

**HTML**
```html
<section class="section-video">
  <div class="section-video__wrap">
    <iframe src="..." class="section-video__iframe" title="Live" />
  </div>
</section>
```

**CSS**
```css
.section-video {
  flex: 0 0 35vh;
  min-height: 0;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 0;
}

.section-video__wrap {
  position: absolute;
  inset: 0;
}

.section-video__iframe {
  width: calc(100% - 20px);
  max-width: 900px;
  height: calc(100% - 20px);
  max-height: 400px;
  margin: 0 auto;
  display: block;
  object-fit: cover;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
}
```

---

## 5. 메인 게임 영역 (45vh) — 스크롤 없음

**HTML 골격**
```html
<section class="section-game">
  <!-- Row 1: 게임 상태 -->
  <div class="game-state-row">
    <span>CURRENT HAND: #324</span>
    <span>STAGE: FLOP</span>
    <span>DEALER: Chloe</span>
    <span>LAST ACTION: Player 3 RAISES $200</span>
  </div>

  <!-- Row 2: 플레이어 블록 + 커뮤니티 카드 + POT -->
  <div class="game-center">
    <div class="players-wrap">
      <!-- 8명: 4×2 그리드 또는 oval 배치 -->
      <div class="player-block">...</div>
      <!-- x8 -->
    </div>
    <div class="community-cards">
      <img class="card" /> x5
    </div>
    <div class="pot-display">POT: $1,250</div>
  </div>

  <!-- Row 3: 칩 버튼 + 액션 버튼 + 슬라이더 -->
  <div class="betting-actions">
    <div class="chip-buttons">
      <button class="chip-btn" data-value="50">$50</button>
      <button class="chip-btn" data-value="100">$100</button>
      <!-- $500, $1000, $5000 -->
    </div>
    <button class="action-btn">FOLD</button>
    <button class="action-btn">CALL</button>
    <button class="action-btn">RAISE</button>
    <input type="range" class="raise-slider" />
  </div>
</section>
```

**CSS 요약**
```css
.section-game {
  flex: 0 0 45vh;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 15px;
  background: rgba(30, 30, 30, 0.8);
  border-radius: 10px;
  margin: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.game-state-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-bottom: 15px;
  font-size: 0.9em;
  color: #fff;
  flex-wrap: wrap;
  gap: 10px;
}

.game-state-row span:not(:first-child) {
  border-left: 1px solid rgba(255, 255, 255, 0.3);
  padding-left: 15px;
  margin-left: 5px;
}

/* 플레이어 4×2 그리드 */
.players-wrap {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.player-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 10px;
  background: rgba(60, 60, 60, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.player-block__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #888;
  margin-bottom: 5px;
}

.player-block__name { font-size: 0.9em; color: #fff; }
.player-block__balance { font-size: 0.8em; color: #ccc; }
.player-block__action {
  margin-top: 5px;
  padding: 3px 8px;
  border-radius: 5px;
  background: rgba(90, 90, 90, 0.8);
  font-size: 0.8em;
  color: #fff;
}

.community-cards {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin: 10px 0;
}

.community-cards .card {
  width: 60px;
  height: 90px;
  border: 1px solid #eee;
  border-radius: 5px;
  object-fit: cover;
}

.pot-display {
  font-size: 1.8em;
  font-weight: bold;
  color: #fff;
  text-align: center;
  margin-top: 10px;
}

.chip-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin: 15px 0 10px;
}

.chip-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-weight: bold;
  font-size: 0.9em;
  cursor: pointer;
  border: none;
}
/* 칩별 색: $50 #4CAF50, $100 #2196F3, $500 #9C27B0, $1000 #FFC107, $5000 #FF9800 */

.action-btn {
  padding: 10px 20px;
  border-radius: 8px;
  background: rgba(90, 90, 90, 0.8);
  color: #fff;
  font-weight: bold;
  border: none;
  cursor: pointer;
  margin: 0 5px;
}

.raise-slider {
  width: 200px;
  margin-top: 10px;
}
```

---

## 6. 내 패 (10vh)

**HTML**
```html
<section class="section-my-hand">
  <div class="section-my-hand__label">
    <span class="section-my-hand__icon">🂠</span>
    <span>내패</span>
  </div>
  <div class="section-my-hand__detail">
    <span>잔액 <strong>124,500</strong></span>
    <span>마지막 배팅 <strong>500</strong></span>
    <span>총배팅 <strong>2,500</strong></span>
    <span>패 <strong>♠A ♥K</strong></span>
    <span>족보 <strong>탑페어</strong></span>
  </div>
  <div class="section-my-hand__cards">
    <img class="hole-card" /> <img class="hole-card" />
  </div>
</section>
```

**CSS**
```css
.section-my-hand {
  flex: 0 0 10vh;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background: rgba(30, 30, 30, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0 0 10px 10px;
  margin: 0 10px 0 10px;
}

.section-my-hand__label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.2em;
  font-weight: bold;
  color: #fff;
}

.section-my-hand__detail {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  font-size: 0.85em;
  color: #ccc;
}
.section-my-hand__detail strong { color: #fff; }

.section-my-hand__cards {
  display: flex;
  gap: 5px;
}

.section-my-hand .hole-card {
  width: 80px;
  height: 120px;
  border: 1px solid #eee;
  border-radius: 5px;
  object-fit: cover;
}
```

---

## 7. 게임이력·채팅 패널 (5vh 헤더 + 남은 영역)

**HTML**
```html
<section class="section-panel">
  <div class="section-panel__tabs">
    <button class="panel-tab is-active">GAME HISTORY</button>
    <button class="panel-tab">CHAT</button>
  </div>
  <div class="section-panel__content">
    <!-- 탭별 콘텐츠 -->
    <div class="panel-history">
      <div class="history-grid">...</div>
    </div>
    <div class="panel-chat">
      <div class="chat-messages">...</div>
      <div class="chat-input-wrap">
        <input type="text" placeholder="Message" />
        <button>SEND</button>
      </div>
    </div>
  </div>
</section>
```

**CSS**
```css
.section-panel {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgba(30, 30, 30, 0.8);
  border-radius: 10px;
  margin: 0 10px 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.section-panel__tabs {
  flex: 0 0 5vh;
  min-height: 44px;
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.panel-tab {
  flex: 1;
  padding: 10px;
  background: transparent;
  color: #ccc;
  font-size: 1em;
  font-weight: bold;
  border: none;
  cursor: pointer;
}
.panel-tab.is-active { color: #fff; background: rgba(255,255,255,0.05); }

.section-panel__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px;
}

.panel-history .history-grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  grid-template-rows: repeat(16, 1fr);
  gap: 2px;
  font-size: 0.7em;
  color: #ccc;
}

.chat-messages {
  overflow-y: auto;
  flex: 1;
  font-size: 0.8em;
  color: #ccc;
  line-height: 1.4;
  margin-bottom: 10px;
}

.chat-input-wrap {
  display: flex;
  gap: 5px;
}
.chat-input-wrap input {
  flex: 1;
  padding: 8px;
  border: 1px solid #555;
  border-radius: 5px;
  background: #333;
  color: #fff;
}
.chat-input-wrap button {
  padding: 8px 15px;
  background: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
```

---

## 8. 칩 버튼 색상 (레퍼런스)

| 금액 | 배경색 |
|------|--------|
| $50 | `#4CAF50` |
| $100 | `#2196F3` |
| $500 | `#9C27B0` |
| $1000 | `#FFC107` |
| $5000 | `#FF9800` |

---

## 9. 구현 시 참고

- **반응형**: vh + `width: 100%`, `max-width`, `flex-wrap`, `grid`로 가로 대응.
- **에셋**: 아바타, 카드, 칩은 PNG/SVG. `/assets/cards/`, `/assets/chips/` 등 경로 통일.
- **플레이어 배치**: 레퍼런스는 oval 가능성 있음. 4×2로 할 경우 `grid-template-columns: repeat(4, 1fr);` + `repeat(2, 1fr)` 사용.
- **내 패 상세**: 10vh 안에 잔액·마지막 배팅·총배팅·패정보·족보 한 줄 또는 두 줄로 배치.
- **슬라이더**: `input[type="range"]` + `-webkit-slider-thumb` / `-webkit-slider-runnable-track` 커스텀.

이 분석을 기준으로 컴포넌트와 CSS를 맞추면 레퍼런스 UI와 동일하게 구현할 수 있다.
