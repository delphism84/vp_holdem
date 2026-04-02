import { test, expect } from '@playwright/test'

/**
 * 2인(player-1, player-2) · table01 · 동일 핸드 관찰
 * FE WebSocket 연결 후 단계 변화 수집, UI에 연결 오류 문구 없음 검증
 */
test.describe.configure({ mode: 'parallel' })

const TABLE = 'table01'
const STREAM = 'table01_01'

test('2P 동시 접속 · WS 연결 · 1게임 분량 관찰', async ({ browser }) => {
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  const p1 = await ctx1.newPage()
  const p2 = await ctx2.newPage()

  const go = (p: typeof p1, seat: number, userId: string) =>
    p.goto(
      `/game?stream=${STREAM}&seat=${seat}&userId=${userId}&table=${TABLE}`,
      { waitUntil: 'domcontentloaded' },
    )

  await Promise.all([go(p1, 0, 'player-1'), go(p2, 1, 'player-2')])

  const pill1 = p1.locator('.header-bar .ws-pill')
  const pill2 = p2.locator('.header-bar .ws-pill')

  await expect(pill1).toContainText('WS', { timeout: 45_000 })
  await expect(pill2).toContainText('WS', { timeout: 45_000 })

  const banner1 = p1.locator('.game-phase-banner')
  const banner2 = p2.locator('.game-phase-banner')

  await expect(banner1).not.toContainText('WebSocket 연결 실패')
  await expect(banner2).not.toContainText('WebSocket 연결 실패')

  const phases = new Set<string>()
  const collect = async () => {
    const t1 = await banner1.locator('.game-phase-banner__phase').textContent().catch(() => '')
    const t2 = await banner2.locator('.game-phase-banner__phase').textContent().catch(() => '')
    if (t1) phases.add(t1.trim())
    if (t2) phases.add(t2.trim())
  }

  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    await collect()
    if (phases.size >= 4) break
    await p1.waitForTimeout(2000)
  }

  await collect()

  const pre = await p1.locator('.ws-debug-pre').textContent().catch(() => '')
  expect(pre?.length ?? 0).toBeGreaterThan(10)
  expect(await banner1.textContent()).not.toContain('WebSocket 연결 실패')

  console.log('[QA] 수집된 단계 라벨:', [...phases].join(', '))

  await p1.screenshot({ path: 'test-results/qa-p1-end.png', fullPage: true }).catch(() => {})
  await p2.screenshot({ path: 'test-results/qa-p2-end.png', fullPage: true }).catch(() => {})

  await ctx1.close()
  await ctx2.close()
})
