# UI_NEW — 모바일 우선 라이브 카드게임 레이아웃 분석

다크 테마, 검정/짙은 회색 배경, 흰색·빨강·파랑 포인트. **반응형을 매우 자세히** 정의.

---

## 1. 전체 구조 (세로 스택)

| 구역 | 설명 | 높이/비중 | 스크롤 |
|------|------|-----------|--------|
| 상단 헤더 바 | 게임 로고·게임 정보 | 고정 높이 | 없음 |
| 라이브 스트림 | 영상 + LIVE·Viewers 오버레이 | 비중 큼, 비율 유지 | 없음 |
| 플레이어 핸드 영역 | 4×2 그리드, 8명 | 고정, **스크롤 없음·최우선** | 없음 |
| 커뮤니티 카드 | 5장 가로 일렬 | 고정 높이 | 없음 |
| 배팅 컨트롤·POT | POT 금액 + Bet 2x / Cancel + 칩 버튼 | 고정 높이 | 없음 |
| 유저 정보 한 줄 | 잔액·패정보·액션·내 카드 2장 | 고정 높이 | 없음 |
| 하단 패널 | Game History / Chat 탭 + 콘텐츠 | **남은 영역 전부** (후순위) | 콘텐츠만 스크롤 |

---

## 2. 글로벌·반응형 기준

### 2.1 루트 컨테이너

```css
.ui-new {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  max-height: -webkit-fill-available;
  overflow: hidden;
  color: #fff;
  background: #000;
  font-family: 'Noto Sans KR', -apple-system, sans-serif;
}
```

### 2.2 반응형 브레이크포인트

| 이름 | min-width | 용도 |
|------|-----------|------|
| xs | 0 | 기본(모바일 세로) |
| sm | 360px | 작은 폰 |
| md | 414px | 일반 폰 |
| lg | 768px | 태블릿·가로 폰 |
| xl | 1024px | 작은 데스크톱 |
| xxl | 1280px | 데스크톱 |

### 2.3 타이포 스케일 (반응형)

- **제목/강조**: `clamp(0.875rem, 2.5vw, 1.25rem);` (14px~20px)
- **본문**: `clamp(0.75rem, 2vw, 0.9375rem);` (12px~15px)
- **캡션/보조**: `clamp(0.625rem, 1.5vw, 0.75rem);` (10px~12px)
- **큰 숫자(POT 등)**: `clamp(1.125rem, 4vw, 1.75rem);` (18px~28px)

### 2.4 터치 타겟

- 버튼·칩·탭: **최소 44×44px** (iOS HIG). 좁은 화면에서도 유지.
- 카드·플레이어 셀: 최소 터치 영역 40px 이상 권장.

---

## 3. 상단 헤더 바

### 3.1 구조

- **배경**: `#000` (불투명 검정).
- **좌측**: 게임패드 아이콘(흰색) + "Game Logo" 텍스트(흰색).
- **우측**: "Game Info" 텍스트(흰색).
- **레이아웃**: 한 줄, `justify-content: space-between`, 전체 너비.

### 3.2 HTML 골격

```html
<header class="header-bar">
  <div class="header-bar__left">
    <span class="header-bar__icon" aria-hidden="true"><!-- gamepad icon --></span>
    <span class="header-bar__logo">Game Logo</span>
  </div>
  <div class="header-bar__right">
    <span class="header-bar__info">Game Info</span>
  </div>
</header>
```

### 3.3 CSS

```css
.header-bar {
  flex-shrink: 0;
  height: clamp(44px, 6vh, 56px);
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 16px;
  background: #000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-bar__left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.header-bar__icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  /* SVG or icon font */
}

.header-bar__logo {
  font-size: clamp(0.875rem, 2.5vw, 1.125rem);
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-bar__right {
  flex-shrink: 0;
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 50%;
}
```

### 3.4 반응형 상세

| 뷰포트 | 동작 |
|--------|------|
| xs~sm | 패딩 10px 12px, 로고 폰트 14px, 정보 12px, 정보 max-width 45% |
| md~lg | 패딩 12px 16px, 로고 16px, 정보 13px |
| xl~ | 패딩 16px 20px, 로고 18px, 정보 14px |

---

## 4. 라이브 스트림 영역

### 4.1 구조

- **내용**: 임베드 영상(또는 placeholder 이미지). 비율 유지.
- **오버레이 우상단**: 빨간 둥근 사각 뱃지 "LIVE" (흰 대문자).
- **오버레이 우하단**: "Viewers: 1200" (흰색).
- **모서리**: 하단만 `border-radius` (이미지 설명 기준).

### 4.2 HTML 골격

```html
<section class="live-stream">
  <div class="live-stream__media">
    <iframe class="live-stream__iframe" ... />
  </div>
  <span class="live-stream__badge">LIVE</span>
  <span class="live-stream__viewers">Viewers: 1200</span>
</section>
```

### 4.3 CSS

```css
.live-stream {
  flex: 0 0 auto;
  position: relative;
  width: 100%;
  /* 비율 16:9 유지, 높이는 가용 공간 내에서 */
  aspect-ratio: 16 / 9;
  max-height: 40vh;
  min-height: 160px;
  overflow: hidden;
  border-radius: 0 0 12px 12px;
}

.live-stream__media {
  position: absolute;
  inset: 0;
}

.live-stream__iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  object-fit: cover;
}

.live-stream__badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  background: #c41e3a;
  color: #fff;
  font-size: clamp(0.625rem, 1.8vw, 0.75rem);
  font-weight: 700;
  letter-spacing: 0.05em;
  border-radius: 6px;
}

.live-stream__viewers {
  position: absolute;
  bottom: 10px;
  right: 10px;
  font-size: clamp(0.625rem, 1.8vw, 0.75rem);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}
```

### 4.4 반응형 상세

| 뷰포트 | 동작 |
|--------|------|
| xs | max-height: 35vh, min-height: 140px, badge/viewers 10px |
| sm~md | max-height: 38vh, min-height: 180px |
| lg~ | max-height: 40vh, min-height: 220px. 영상 중앙 정렬·letterboxing 가능 (margin auto) |

- **오버레이**: 뱃지·Viewers는 항상 영상 프레임 대비 동일 위치(우상·우하), `vw` 기반 폰트로 스케일.

---

## 5. 플레이어 핸드 영역 (4×2 그리드)

### 5.1 구조

- **배경**: 짙은 회색/검정.
- **레이아웃**: **4열 × 2행 = 8칸**. 스크롤 없음, 영역 최우선.
- **한 칸**: 둥근 모서리 컨테이너. 플레이어 ID, 금액(예: 103,000), 홀 카드 2장(작은 빨간 카드 placeholder).
- **나머지 7칸**: 동일한 빈 placeholder(다른 플레이어 대기).

### 5.2 HTML 골격

```html
<section class="player-hands">
  <div class="player-hands__grid">
    <div class="player-slot player-slot--filled">
      <span class="player-slot__id">player id</span>
      <span class="player-slot__chips">103,000</span>
      <div class="player-slot__cards">
        <span class="card-placeholder"></span>
        <span class="card-placeholder"></span>
      </div>
    </div>
    <!-- x7 more .player-slot -->
  </div>
</section>
```

### 5.3 CSS

```css
.player-hands {
  flex: 0 0 auto;
  overflow: hidden;
  padding: 8px 10px;
  background: #1a1a1a;
}

.player-hands__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 6px;
  aspect-ratio: 4 / 2;
  max-height: 28vh;
  min-height: 140px;
}

.player-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  background: #2d2d2d;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 0;
}

.player-slot__id {
  font-size: clamp(0.625rem, 1.8vw, 0.75rem);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: center;
}

.player-slot__chips {
  font-size: clamp(0.625rem, 1.5vw, 0.6875rem);
  color: #fff;
  margin-top: 2px;
}

.player-slot__cards {
  display: flex;
  gap: 2px;
  margin-top: 4px;
  justify-content: center;
}

.card-placeholder {
  width: clamp(20px, 5vw, 28px);
  height: clamp(28px, 7vw, 40px);
  border-radius: 4px;
  background: #c41e3a;
  flex-shrink: 0;
}
```

### 5.4 반응형 상세

| 뷰포트 | 그리드 | gap | 카드 크기 | 비고 |
|--------|--------|-----|-----------|------|
| xs (≤359px) | 4×2 유지 | 4px | 20×28px | 폰트 10px, 패딩 4px |
| sm (360~413px) | 4×2 | 6px | 22×32px |  |
| md (414~767px) | 4×2 | 8px | 26×36px | max-height 26vh |
| lg (768px~) | 4×2 | 10px | 28×40px | max-height 28vh, 패딩 12px |

- **극단적 좁음(예: 320px)**: 4×2 유지하되 `grid-template-columns: repeat(4, minmax(0, 1fr));`, 카드 `min-width` 줄이거나 2열로 전환 시 `2×4` 그리드로 변경 가능.
- **2×4 전환 예시** (선택):

```css
@media (max-width: 340px) {
  .player-hands__grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(4, 1fr);
    aspect-ratio: 2 / 4;
  }
}
```

---

## 6. 커뮤니티 카드 영역

### 6.1 구조

- 5장 동일한 빨간 둥근 사각형 placeholder, 가로 일렬, 간격 균등.
- 플레이어 그리드 바로 아래.

### 6.2 CSS

```css
.community-cards {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: clamp(4px, 1.5vw, 10px);
  padding: 8px 10px;
  background: #1a1a1a;
}

.community-cards .card-placeholder {
  width: clamp(24px, 6vw, 52px);
  height: clamp(34px, 8.5vw, 72px);
  border-radius: 6px;
  background: #c41e3a;
}
```

### 6.3 반응형

- **xs**: 카드 24×34px, gap 4px.
- **md~**: 카드 40×56px ~ 52×72px, gap 8~10px.
- `flex-wrap: nowrap` 유지. 너비 부족 시 카드만 `min-width`로 축소.

---

## 7. 배팅 컨트롤·POT

### 7.1 구조

- **1행**: 좌측 "POT: $1200" (굵은 흰색), 우측 "Bet 2x"(파란 버튼), "Cancel"(회색 버튼).
- **2행**: 회색 원형 칩 7개 가로 배치(칩 단위 또는 프리셋).

### 7.2 HTML 골격

```html
<section class="betting-controls">
  <div class="betting-controls__row1">
    <span class="pot-label">POT: $1200</span>
    <div class="betting-controls__actions">
      <button type="button" class="btn btn--blue">Bet 2x</button>
      <button type="button" class="btn btn--gray">Cancel</button>
    </div>
  </div>
  <div class="betting-controls__chips">
    <button type="button" class="chip" aria-label="chip">...</button>
    <!-- x7 -->
  </div>
</section>
```

### 7.3 CSS

```css
.betting-controls {
  flex-shrink: 0;
  padding: 10px 12px;
  background: #1a1a1a;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.betting-controls__row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.pot-label {
  font-size: clamp(1rem, 3.5vw, 1.5rem);
  font-weight: 700;
  color: #fff;
}

.betting-controls__actions {
  display: flex;
  gap: 8px;
}

.btn {
  min-width: 44px;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  font-weight: 600;
  color: #fff;
  border: none;
  cursor: pointer;
}

.btn--blue {
  background: #2196F3;
}

.btn--gray {
  background: #555;
}

.betting-controls__chips {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  width: clamp(36px, 10vw, 48px);
  height: clamp(36px, 10vw, 48px);
  border-radius: 50%;
  background: #555;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
}
```

### 7.4 반응형

| 뷰포트 | POT 폰트 | 버튼 패딩 | 칩 크기 |
|--------|----------|-----------|---------|
| xs | 16px | 8px 12px | 36px |
| md | 18px | 10px 16px | 40px |
| lg~ | 20~24px | 12px 20px | 44~48px |

- **좁을 때**: row1을 `flex-wrap: wrap`으로 두고, 두 번째 줄에 버튼만 오도록 하거나, 칩 행만 wrap.

---

## 8. 유저 정보 한 줄 (3row)

### 8.1 구조

- **배경**: 짙은 회색(다른 영역과 약간 구분).
- **좌측**: 사람 아이콘(흰색) + "balance" + "12,043,000" (아래 줄 또는 옆).
- **중앙**: "3 CARD" / "129,000 CALL" (패 정보·액션).
- **우측**: 빨간 카드 placeholder 2장(내 홀카드).

### 8.2 HTML 골격

```html
<section class="user-info-row">
  <div class="user-info-row__balance">
    <span class="user-info-row__icon"><!-- person --></span>
    <div>
      <span class="user-info-row__label">balance</span>
      <span class="user-info-row__value">12,043,000</span>
    </div>
  </div>
  <div class="user-info-row__hand">
    <span class="user-info-row__hand-name">3 CARD</span>
    <span class="user-info-row__action">129,000 CALL</span>
  </div>
  <div class="user-info-row__cards">
    <span class="card-placeholder"></span>
    <span class="card-placeholder"></span>
  </div>
</section>
```

### 8.3 CSS

```css
.user-info-row {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 10px 12px;
  background: #252525;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 52px;
}

.user-info-row__balance {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.user-info-row__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.user-info-row__label {
  display: block;
  font-size: clamp(0.5625rem, 1.5vw, 0.6875rem);
  color: rgba(255,255,255,0.7);
}

.user-info-row__value {
  display: block;
  font-size: clamp(0.75rem, 2vw, 0.9375rem);
  font-weight: 600;
  color: #fff;
}

.user-info-row__hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-size: clamp(0.625rem, 1.8vw, 0.75rem);
  color: #fff;
}

.user-info-row__cards {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.user-info-row__cards .card-placeholder {
  width: clamp(32px, 8vw, 48px);
  height: clamp(44px, 11vw, 66px);
  border-radius: 6px;
  background: #c41e3a;
}
```

### 8.4 반응형

| 뷰포트 | 동작 |
|--------|------|
| xs | 한 줄 유지, 폰트·카드 최소치. value 12px, 카드 32×44px |
| sm~md | value 14px, 카드 36×50px |
| lg~ | 패딩 12px 16px, 카드 44×62px ~ 48×66px |

- **극단적 좁음**: `flex-wrap: wrap`으로 2줄 허용. 1줄: balance+hand, 2줄: cards만 가운데.

---

## 9. 하단 패널 (Game History / Chat)

### 9.1 구조

- **배경**: 짙은 회색/검정.
- **탭**: "Game History"(활성), "Chat" — 가로 배치.
- **콘텐츠**: 탭 아래 넓은 영역이 **남은 세로 공간 전부** 사용. 스크롤은 콘텐츠 영역만.

### 9.2 HTML 골격

```html
<section class="bottom-panel">
  <div class="bottom-panel__tabs">
    <button type="button" class="panel-tab is-active">Game History</button>
    <button type="button" class="panel-tab">Chat</button>
  </div>
  <div class="bottom-panel__content">
    <!-- 16×16 그리드 또는 채팅 목록 + 입력 -->
  </div>
</section>
```

### 9.3 CSS

```css
.bottom-panel {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  border-radius: 12px 12px 0 0;
  margin: 0 8px 0 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.bottom-panel__tabs {
  flex-shrink: 0;
  display: flex;
  min-height: 44px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-tab {
  flex: 1;
  padding: 12px 8px;
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  background: transparent;
  border: none;
  cursor: pointer;
}

.panel-tab.is-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.bottom-panel__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
  -webkit-overflow-scrolling: touch;
}
```

### 9.4 반응형

| 뷰포트 | 탭 높이 | 콘텐츠 패딩 | 비고 |
|--------|---------|-------------|------|
| xs~sm | 44px | 6px | 터치 44px 유지 |
| md~ | 48px | 10px |  |
| lg~ | 52px | 12px |  |

- **게임 이력 그리드(16×16)**: 셀은 `min-width`/`min-height`로 너무 작아지지 않게. `grid-template-columns: repeat(16, minmax(0, 1fr));` + `gap: 2px` 유지.
- **채팅**: 메시지 영역 `flex: 1; overflow-y: auto;`, 입력창은 `flex-shrink: 0`, 버튼 최소 44px.

---

## 10. 미디어 쿼리 요약 (한곳에)

```css
/* xs: default (0~359px) */
/* sm */
@media (min-width: 360px) { ... }
/* md */
@media (min-width: 414px) { ... }
/* lg */
@media (min-width: 768px) { ... }
/* xl */
@media (min-width: 1024px) { ... }
/* xxl */
@media (min-width: 1280px) { ... }

/* 극소 폰 (플레이어 그리드 2×4 전환) */
@media (max-width: 340px) {
  .player-hands__grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(4, 1fr);
  }
}
```

---

## 11. 색상·에셋 정리

| 용도 | 값 |
|------|-----|
| 배경 전체 | `#000` |
| 패널/카드 영역 | `#1a1a1a`, `#252525`, `#2d2d2d` |
| 텍스트 기본 | `#fff` |
| 텍스트 보조 | `rgba(255,255,255,0.6~0.7)` |
| 포인트(빨강) | `#c41e3a` (카드 placeholder, LIVE 뱃지) |
| 버튼 파랑 | `#2196F3` |
| 버튼 회색 | `#555` |
| 테두리 | `rgba(255,255,255,0.06~0.1)` |

- 카드·칩: 실제 이미지 사용 시 `/assets/cards/`, `/assets/chips/` 경로 통일.
- 아이콘: 게임패드·사람 등 SVG 또는 아이콘 폰트, `currentColor`로 흰색 연동.

---

이 문서대로 구현하면 이미지와 동일한 구조와 반응형 동작을 맞출 수 있다.
