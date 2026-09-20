import { useEffect, useRef } from 'react'

/// Calls `callback` on an interval to keep data fresh (near-live updates without
/// a websocket backend). It only fires while the tab is visible, and also fires
/// immediately when the tab regains focus/visibility so returning to the app
/// shows current data at once. Pass `enabled = false` to pause polling.
export function usePoll(callback: () => void, intervalMs: number, enabled = true): void {
  const saved = useRef(callback)
  useEffect(() => {
    saved.current = callback
  })

  useEffect(() => {
    if (!enabled) return
    const run = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      saved.current()
    }
    const id = window.setInterval(run, intervalMs)
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) saved.current()
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs, enabled])
}
