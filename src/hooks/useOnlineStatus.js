import { useState, useEffect } from 'react'
import { useConvex } from 'convex/react'

/**
 * Connectivity signal for safety-critical flows (e.g. POS checkout).
 *
 * Combines the browser's online flag with Convex's websocket state, so we also
 * catch "router is up but the internet is down" (Convex unreachable) — not just
 * the network card going offline. Defensive: any surprise from the Convex API
 * defaults to "connected" so we never wrongly block when actually online.
 *
 * @returns {boolean} true when it's safe to perform a server write
 */
export function useOnlineStatus() {
  const convex = useConvex()
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [convexConnected, setConvexConnected] = useState(true)

  useEffect(() => {
    const on = () => setBrowserOnline(true)
    const off = () => setBrowserOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    if (!convex || typeof convex.connectionState !== 'function') return
    let mounted = true
    const tick = () => {
      let connected = true
      try {
        const st = convex.connectionState()
        if (st && typeof st.isWebSocketConnected === 'boolean') {
          connected = st.isWebSocketConnected
        }
      } catch {
        connected = true // never block on an API surprise
      }
      if (mounted) setConvexConnected((prev) => (prev === connected ? prev : connected))
    }
    tick()
    const id = setInterval(tick, 2500)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [convex])

  return browserOnline && convexConnected
}

export default useOnlineStatus
