import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export interface SegOption<T extends string> {
  value: T
  label: ReactNode
  /** Accessible name when the label is an icon. */
  ariaLabel?: string
  title?: string
}

interface SegmentedProps<T extends string> {
  options: SegOption<T>[]
  value: T
  onChange: (value: T, el: HTMLButtonElement) => void
  /** Group label for assistive tech. */
  label: string
  className?: string
}

/**
 * A segmented control (language, theme…) whose selected "thumb" slides to the
 * active option with transform + width (design.md §6). Buttons expose
 * aria-pressed; the group is a labelled role="group".
 */
export function Segmented<T extends string>({ options, value, onChange, label, className }: SegmentedProps<T>) {
  const wrap = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => {
      const active = el.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (active) setThumb({ x: active.offsetLeft, w: active.offsetWidth })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [value, options.length])

  return (
    <div ref={wrap} className={className ? `seg ${className}` : 'seg'} role="group" aria-label={label}>
      {thumb && (
        <span
          className="seg__thumb"
          aria-hidden="true"
          style={{ width: thumb.w, transform: `translateX(${thumb.x - 3}px)`, left: 3 }}
        />
      )}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="seg__btn"
          aria-pressed={o.value === value}
          aria-label={o.ariaLabel}
          title={o.title ?? o.ariaLabel}
          onClick={(e) => onChange(o.value, e.currentTarget)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
