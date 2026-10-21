import { useI18n } from '../context/LanguageContext'
import type { Lang } from '../lib/i18n'
import { PalettePicker } from './PalettePicker'
import { Segmented } from './Segmented'
import { ThemeSwitch } from './ThemeSwitch'
import './PrefControls.css'

/**
 * Header preferences: the always-visible language switch (Bangla/English),
 * the light/dark/system switch (moved into the palette popover below 560px),
 * and the colour-palette picker.
 */
export function PrefControls() {
  const { lang, setLang, t } = useI18n()

  return (
    <div className="prefs">
      <Segmented<Lang>
        label={t('ভাষা', 'Language')}
        value={lang}
        onChange={(l) => setLang(l)}
        options={[
          { value: 'bn', label: 'বাংলা' },
          { value: 'en', label: 'EN' },
        ]}
      />
      <span className="prefs__theme">
        <ThemeSwitch />
      </span>
      <PalettePicker />
    </div>
  )
}
