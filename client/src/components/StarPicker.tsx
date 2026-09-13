import { useState } from 'react'
import './StarPicker.css'

interface StarPickerProps {
  value: number
  onChange: (rating: number) => void
  ariaLabel?: string
}

/// Interactive 1–5 star selector.
export function StarPicker({ value, onChange, ariaLabel = 'রেটিং' }: StarPickerProps) {
  const [hover, setHover] = useState(0)
  return (
    <span className="starpick" role="radiogroup" aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className={`starpick__star ${(hover || value) >= n ? 'is-on' : ''}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} star`}
          aria-checked={value === n}
          role="radio"
        >
          ★
        </button>
      ))}
    </span>
  )
}
