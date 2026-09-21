import { useEffect, useRef } from 'react'

/**
 * Calls `onLoadMore` when a sentinel element scrolls into view. Attach the
 * returned ref to a node placed at the end of the list. Firing is gated on
 * `enabled` (typically: more items remain AND not already loading) so it never
 * requests past the end or double-fires while a fetch is in flight.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>(
  onLoadMore: () => void,
  enabled: boolean,
) {
  const sentinel = useRef<T | null>(null)
  const saved = useRef(onLoadMore)
  useEffect(() => {
    saved.current = onLoadMore
  })

  useEffect(() => {
    const node = sentinel.current
    if (!node || !enabled) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) saved.current()
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled])

  return sentinel
}
