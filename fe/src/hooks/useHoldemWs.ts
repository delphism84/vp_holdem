import { useEffect, useRef, useState, useCallback } from 'react'

export type HoldemSeat = {
  seatIndex: number
  id: string
  stack: number
  betStreet: number
  folded: boolean
  hole: string[]
  /** BE join_seat 플레이어 (수동 배팅) */
  isManual?: boolean
}

export type HoldemState = {
  step?: number
  phase?: string
  tableId?: string
  handId?: string | null
  buttonSeat?: number
  board?: string[]
  pot?: number
  street?: string
  currentBet?: number
  /** 뷰어 기준 에뮬 배팅 여부 (수동 플레이어 본인에게는 false) */
  emulBet?: boolean
  /** 서버 전역 HOLDEM_EMUL_BET */
  emulBetGlobal?: boolean
  emulDeal?: boolean
  seats?: (HoldemSeat | null)[]
  actorSeat?: number | null
  /** tick 기반 배팅 타임아웃 (비수동 액터) */
  betTimeoutTicks?: number
  betWaitTicks?: number
  tickMs?: number
  manualBetDeadlineAt?: number | null
  emulBetReadyAt?: number | null
}

export function defaultHoldemWsUrl(): string {
  const u = import.meta.env.VITE_HOLDEM_WS_URL
  if (u && String(u).trim()) return String(u).trim()
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws/holdem`
}

export function useHoldemWs(opts: {
  wsUrl: string
  tableId: string
  /** 착석 후에만 설정 (없으면 관전·userId만 구독) */
  seatIndex: number | null
  userId: string
  enabled?: boolean
}) {
  const [connected, setConnected] = useState(false)
  const [state, setState] = useState<HoldemState | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number>(0)

  const send = useCallback((obj: Record<string, unknown>) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj))
  }, [])

  useEffect(() => {
    if (opts.enabled === false) return
    let cancelled = false

    function connect() {
      if (cancelled) return
      const ws = new WebSocket(opts.wsUrl)
      wsRef.current = ws
      let opened = false

      ws.onopen = () => {
        opened = true
        setConnected(true)
        setLastError(null)
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            tableId: opts.tableId,
            userId: opts.userId,
            ...(opts.seatIndex != null && opts.seatIndex >= 0 && opts.seatIndex <= 8
              ? { seatIndex: opts.seatIndex }
              : {}),
          }),
        )
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { type?: string } & HoldemState
          if (msg.type === 'state') {
            const { type: _t, ...rest } = msg as { type: string } & HoldemState
            setState(rest)
          }
        } catch {
          /* ignore */
        }
      }

      // 브라우저는 실패 시 error 후 close 순으로 올림 — 메시지 없음. 연결 성공 후에만 의미 있음.
      ws.onerror = () => {
        if (!opened && !cancelled) {
          setLastError('WebSocket 연결 실패 (BE·nginx·URL 확인)')
        }
      }

      ws.onclose = (ev) => {
        setConnected(false)
        wsRef.current = null
        if (cancelled) return
        if (!opened && ev.code !== 1000) {
          setLastError(`WS 종료 code=${ev.code}`)
        }
        reconnectTimer.current = window.setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      cancelled = true
      window.clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [opts.wsUrl, opts.tableId, opts.seatIndex, opts.userId, opts.enabled])

  return { connected, state, lastError, send }
}
