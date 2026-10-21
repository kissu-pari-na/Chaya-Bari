import { useI18n } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import type { ThemeMode } from '../lib/appearance'
import { Segmented } from './Segmented'

const SunIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
const MoonIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
)
const SystemIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
)

/** Light / Dark / System switch. Used in the header and in the palette popover; both stay in sync. */
export function ThemeSwitch({ withText = false }: { withText?: boolean }) {
  const { t } = useI18n()
  const { mode, setMode } = useTheme()
  const opt = (value: ThemeMode, icon: JSX.Element, bn: string, en: string) => ({
    value,
    ariaLabel: t(bn, en),
    label: withText ? (
      <>
        {icon}
        <span>{t(bn, en)}</span>
      </>
    ) : (
      icon
    ),
  })
  return (
    <Segmented<ThemeMode>
      label={t('আলো ও অন্ধকার', 'Light and dark')}
      value={mode}
      onChange={(m, el) => setMode(m, el)}
      options={[
        opt('light', SunIcon, 'লাইট', 'Light'),
        opt('dark', MoonIcon, 'ডার্ক', 'Dark'),
        opt('system', SystemIcon, 'সিস্টেম', 'System'),
      ]}
    />
  )
}
