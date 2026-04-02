/**
 * 52장 덱 + 7장 중 최선 5장 홀덤 핸드 평가 (단일 프로세스용)
 */

const RANKS = '23456789TJQKA';

export function parseCard(s) {
  const str = String(s).trim();
  if (str.length < 2) return null;
  const r = str[0];
  const suit = str[1].toLowerCase();
  const ri = RANKS.indexOf(r.toUpperCase());
  if (ri < 0) return null;
  const si = 'cdhs'.indexOf(suit);
  if (si < 0) return null;
  return { rank: ri + 2, suit: si, id: si * 13 + ri };
}

export function cardToString(c) {
  const r = RANKS[c.rank - 2];
  const s = 'cdhs'[c.suit];
  return `${r}${s}`;
}

export function createDeck() {
  const deck = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 2; r <= 14; r++) {
      deck.push({ rank: r, suit: s, id: s * 13 + (r - 2) });
    }
  }
  return deck;
}

export function shuffleInPlace(deck, rng = Math.random) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function combinations5(arr7) {
  const out = [];
  const n = 7;
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let c = b + 1; c < n; c++) {
        for (let d = c + 1; d < n; d++) {
          for (let e = d + 1; e < n; e++) {
            out.push([arr7[a], arr7[b], arr7[c], arr7[d], arr7[e]]);
          }
        }
      }
    }
  }
  return out;
}

function straightHigh5(ranksSortedDesc) {
  const u = [...new Set(ranksSortedDesc)].sort((a, b) => b - a);
  if (u.length < 5) return 0;
  for (let i = 0; i <= u.length - 5; i++) {
    let ok = true;
    for (let k = 1; k < 5; k++) {
      if (u[i + k - 1] - u[i + k] !== 1) {
        ok = false;
        break;
      }
    }
    if (ok) return u[i];
  }
  if (u.includes(14) && u.includes(5) && u.includes(4) && u.includes(3) && u.includes(2)) return 5;
  return 0;
}

/** 정확히 5장 */
function score5(cards) {
  const ranks = cards.map((c) => c.rank).sort((x, y) => y - x);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const sh = straightHigh5(ranks);
  const isStraight = sh > 0;

  const rankCounts = new Map();
  for (const r of ranks) rankCounts.set(r, (rankCounts.get(r) || 0) + 1);
  const byCount = [...rankCounts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  if (isStraight && isFlush) {
    return 8000000 + sh * 1000;
  }
  if (byCount[0][1] === 4) {
    const quad = byCount[0][0];
    const kicker = ranks.find((r) => r !== quad);
    return 7000000 + quad * 1000 + kicker;
  }
  if (byCount[0][1] === 3 && byCount[1][1] === 2) {
    return 6000000 + byCount[0][0] * 1000 + byCount[1][0];
  }
  if (isFlush) {
    return 5000000 + encodeKickers(ranks);
  }
  if (isStraight) {
    return 4000000 + sh * 1000;
  }
  if (byCount[0][1] === 3) {
    const t = byCount[0][0];
    const kickers = ranks.filter((r) => r !== t).slice(0, 2);
    return 3000000 + t * 10000 + encodeKickers(kickers);
  }
  if (byCount[0][1] === 2 && byCount[1][1] === 2) {
    const p1 = Math.max(byCount[0][0], byCount[1][0]);
    const p2 = Math.min(byCount[0][0], byCount[1][0]);
    const kicker = ranks.find((r) => r !== p1 && r !== p2);
    return 2000000 + p1 * 10000 + p2 * 100 + kicker;
  }
  if (byCount[0][1] === 2) {
    const p = byCount[0][0];
    const kickers = ranks.filter((r) => r !== p);
    return 1000000 + p * 100000 + encodeKickers(kickers);
  }
  return encodeKickers(ranks);
}

function encodeKickers(ranksDesc) {
  let s = 0;
  for (let i = 0; i < Math.min(5, ranksDesc.length); i++) {
    s = s * 20 + ranksDesc[i];
  }
  return s;
}

export function bestHandScoreFrom7(cards7) {
  let best = -1;
  for (const five of combinations5(cards7)) {
    const sc = score5(five);
    if (sc > best) best = sc;
  }
  return best;
}
