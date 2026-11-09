import { useI18n } from '../lib/i18n.jsx'

// Shows the language you can switch to
export default function LangToggle() {
  const { lang, setLang } = useI18n()
  const next = lang === 'en' ? 'te' : 'en'
  return (
    <button type="button" onClick={() => setLang(next)} lang={next}
      aria-label={next === 'te' ? 'Switch to Telugu' : 'Switch to English'}
      className="bg-white/90 text-board rounded-md px-3 py-1 text-sm font-medium hover:bg-white">
      {next === 'te' ? 'తెలుగు' : 'English'}
    </button>
  )
}
