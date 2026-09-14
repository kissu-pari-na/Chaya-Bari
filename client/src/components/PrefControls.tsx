import { useI18n } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import './PrefControls.css'

/**
 * Compact language (Bangla/English) and theme (dark/light) switches shown in
 * the app header. Kept tiny so they sit comfortably alongside the nav.
 */
export function PrefControls() {
  const { lang, setLang, t } = useI18n()
  const { theme, toggle: toggleTheme } = useTheme()

  return (
    <div className="prefs">
      <div className="prefs__lang" role="group" aria-label={t('ভাষা', 'Language')}>
        <button
          type="button"
          className={lang === 'bn' ? 'prefs__lang-btn prefs__lang-btn--active' : 'prefs__lang-btn'}
          aria-pressed={lang === 'bn'}
          onClick={() => setLang('bn')}
        >
          বাংলা
        </button>
        <button
          type="button"
          className={lang === 'en' ? 'prefs__lang-btn prefs__lang-btn--active' : 'prefs__lang-btn'}
          aria-pressed={lang === 'en'}
          onClick={() => setLang('en')}
        >
          EN
        </button>
      </div>
      <button
        type="button"
        className="prefs__theme"
        onClick={toggleTheme}
        aria-label={
          theme === 'dark' ? t('লাইট মোডে যান', 'Switch to light mode') : t('ডার্ক মোডে যান', 'Switch to dark mode')
        }
        title={
          theme === 'dark' ? t('লাইট মোড', 'Light mode') : t('ডার্ক মোড', 'Dark mode')
        }
      >
        <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
      </button>
    </div>
  )
}
