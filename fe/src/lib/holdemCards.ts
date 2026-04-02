/**
 * BE poker cardToString (예: Ah, Tc) → FE 카드 에셋 id (HA, C10)
 */
export function beCardToAssetId(be: string): string {
  if (!be || be.length < 2) return 'SA'
  const suit = be.slice(-1).toLowerCase()
  const rankPart = be.slice(0, -1)
  const rank = rankPart === 'T' ? '10' : rankPart
  const sm: Record<string, string> = { c: 'C', d: 'D', h: 'H', s: 'S' }
  const S = sm[suit] || 'S'
  return S + rank
}

export function cardAssetSrc(assetId: string): string {
  return `/assets/cards/${assetId}.webp`
}
