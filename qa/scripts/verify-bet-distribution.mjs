#!/usr/bin/env node
/**
 * betHistory 에서 call / raise / fold 비율 검수 (에뮬 70/25/5 와 대략 일치)
 * 스몰블라인드/빅블라인드 제외
 */
import { MongoClient } from 'mongodb'

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017'
const clientOpts = { serverSelectionTimeoutMS: 4000 }
const tableId = process.env.QA_TABLE_ID || 'table01'
const minutes = Number(process.env.QA_BET_WINDOW_MIN) || 5

async function main() {
  const client = new MongoClient(uri, clientOpts)
  try {
    await client.connect()
  } catch (e) {
    console.warn('[verify-bets] SKIP: Mongo 연결 불가 —', e.message || e)
    console.warn('  (서버에 Mongo 실행 후 QA_TABLE_ID·MONGO_URI 확인)')
    process.exit(0)
  }
  const db = client.db('zenith_holdem')
  const since = new Date(Date.now() - minutes * 60 * 1000)

  const rows = await db
    .collection('betHistory')
    .find({
      time: { $gte: since },
      tableId,
      action: { $in: ['call', 'raise', 'fold'] },
    })
    .sort({ time: 1 })
    .toArray()

  let call = 0
  let raise = 0
  let fold = 0
  for (const r of rows) {
    if (r.action === 'call') call++
    else if (r.action === 'raise') raise++
    else if (r.action === 'fold') fold++
  }

  const n = call + raise + fold
  console.log(`[verify-bets] tableId=${tableId} window=${minutes}m sample=${n}`)
  console.log(`  call=${call} raise=${raise} fold=${fold}`)

  if (n === 0) {
    console.warn('[verify-bets] WARN: 샘플 없음 — BE·Mongo·테이블 확인')
    await client.close()
    process.exitCode = 0
    return
  }

  const pCall = call / n
  const pRaise = raise / n
  const pFold = fold / n
  console.log(`  비율: call ${(pCall * 100).toFixed(1)}% raise ${(pRaise * 100).toFixed(1)}% fold ${(pFold * 100).toFixed(1)}%`)
  console.log('  기대(에뮬): call ~70% raise ~25% fold ~5%')

  /** 샘플이 작으면 넓게, 크면 좁게 */
  const ok =
    n < 8
      ? true
      : pCall >= 0.45 &&
        pCall <= 0.88 &&
        pRaise >= 0.08 &&
        pRaise <= 0.42 &&
        pFold <= 0.18

  if (!ok && n >= 8) {
    console.error('[verify-bets] FAIL: 비율이 기대 범위를 벗어남 (표본 충분)')
    await client.close()
    process.exit(1)
  }

  console.log('[verify-bets] OK')
  await client.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
