import { createContext, useContext, useEffect, useState } from 'react'
import { te } from './te.js'

const KEY = 'schoolsync-lang'
const Ctx = createContext({ lang: 'en', setLang: () => {}, t: (s) => s })

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(KEY) === 'te' ? 'te' : 'en' } catch { return 'en' }
  })
  useEffect(() => {
    try { localStorage.setItem(KEY, lang) } catch { /* storage can be blocked */ }
    document.documentElement.lang = lang
  }, [lang])
  const t = (s) => (lang === 'te' && te[s]) || s
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
