import { useEffect, useState, type ReactNode } from 'react'
import { LanguageContext as Context, useLanguage, type Language } from './languageContext'
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem('each-language') === 'th' ? 'th' : 'en' } catch { return 'en' }
  })
  useEffect(() => { document.documentElement.lang = language; try { localStorage.setItem('each-language', language) } catch { /* preference is optional */ } }, [language])
  return <Context.Provider value={{ language, setLanguage, t: (en, th) => language === 'th' ? th : en }}>{children}</Context.Provider>
}
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage()
  return <div className="flex gap-px" aria-label="Language / ภาษา">
    <button type="button" lang="th" aria-pressed={language === 'th'} onClick={() => setLanguage('th')} className={`min-h-[44px] min-w-[44px] border px-3 ${language === 'th' ? 'border-ink bg-panel font-semibold' : 'border-line bg-panel'}`}>ไทย</button>
    <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')} className={`min-h-[44px] min-w-[44px] border px-3 ${language === 'en' ? 'border-ink bg-panel font-semibold' : 'border-line bg-panel'}`}>EN</button>
  </div>
}
