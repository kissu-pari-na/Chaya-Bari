import { useRef, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { formatBdt } from '../lib/format'
import { useI18n } from '../context/LanguageContext'
import type { PaymentMode } from '../types/order'
import './Pay.css'

interface PayModePickerProps {
  value: PaymentMode
  onChange: (mode: PaymentMode) => void
  /// The order total, to check against the pay-later headroom.
  total: number
  /// How much the customer can pay later right now; null = guest (no wallet).
  payLaterAvailable: number | null
  /// Wallet credit that pay first would use automatically.
  credit?: number
  disabled?: boolean
}

/// Pay first · Pay later · Cash on delivery, as a keyboard-friendly radiogroup.
/// Pay later is offered only to signed-in customers and only when the order
/// fits within their limit (the server re-checks).
export function PayModePicker({ value, onChange, total, payLaterAvailable, credit = 0, disabled }: PayModePickerProps) {
  const { t } = useI18n()
  const group = useRef<HTMLDivElement>(null)
  const payLaterFits = payLaterAvailable != null && total <= payLaterAvailable

  const options: { mode: PaymentMode; icon: string; title: string; desc: string; enabled: boolean }[] = [
    {
      mode: 'PAY_FIRST',
      icon: '💳',
      title: t('আগে পেমেন্ট', 'Pay first'),
      desc:
        credit >= total && total > 0
          ? t(`ওয়ালেট জমা থেকে ${formatBdt(total)} কাটা হবে — সাথে সাথে নিশ্চিত।`, `Paid from your ${formatBdt(credit)} credit — confirmed at once.`)
          : t('বিকাশ/নগদ/ব্যাংকে পাঠিয়ে TrxID দিন। যাচাইয়ের পর নিশ্চিত।', 'Send by bKash/Nagad/bank and submit the TrxID. Confirmed once verified.'),
      enabled: true,
    },
    {
      mode: 'PAY_LATER',
      icon: '🗓️',
      title: t('পরে পেমেন্ট', 'Pay later'),
      desc:
        payLaterAvailable == null
          ? t('গুগল দিয়ে সাইন ইন করলে পাবেন।', 'Sign in with Google to use it.')
          : payLaterFits
            ? t(`ওয়ালেটে যোগ হবে (সীমা বাকি ${formatBdt(payLaterAvailable)})।`, `Added to your wallet (${formatBdt(payLaterAvailable)} available).`)
            : t(`এই অর্ডারের জন্য সীমা যথেষ্ট নয় (বাকি ${formatBdt(payLaterAvailable)})।`, `Not enough limit for this order (${formatBdt(payLaterAvailable)} available).`),
      enabled: payLaterFits,
    },
    {
      mode: 'COD',
      icon: '💵',
      title: t('ক্যাশ অন ডেলিভারি', 'Cash on delivery'),
      desc: t('খাবার হাতে পেয়ে নগদে পরিশোধ করুন।', 'Pay in cash when your food arrives.'),
      enabled: true,
    },
  ]

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const enabled = options.filter((o) => o.enabled)
    const idx = enabled.findIndex((o) => o.mode === value)
    const next = enabled[(idx + dir + enabled.length) % enabled.length]
    onChange(next.mode)
    group.current?.querySelector<HTMLElement>(`[data-mode="${next.mode}"]`)?.focus()
  }

  return (
    <div className="pay-modes" role="radiogroup" aria-label={t('পেমেন্ট পদ্ধতি', 'Payment method')} ref={group} onKeyDown={onKey}>
      {options.map((o) => (
        <button
          key={o.mode}
          type="button"
          role="radio"
          data-mode={o.mode}
          aria-checked={value === o.mode}
          tabIndex={value === o.mode ? 0 : -1}
          className="pay-mode"
          disabled={disabled || !o.enabled}
          onClick={() => onChange(o.mode)}
        >
          <span className="pay-mode__title">
            <span aria-hidden="true">{o.icon}</span>
            {o.title}
          </span>
          <span className="pay-mode__desc">
            {o.desc}
            {o.mode === 'PAY_LATER' && payLaterAvailable == null && (
              <>
                {' '}
                <Link to="/login" onClick={(e) => e.stopPropagation()}>
                  {t('সাইন ইন', 'Sign in')}
                </Link>
              </>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
