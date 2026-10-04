import { createContext, useContext } from 'react'
export type Language = 'th' | 'en'
export const LanguageContext = createContext({ language: 'en' as Language, setLanguage: (_: Language) => {}, t: (en: string, _th: string) => en })
export const useLanguage = () => useContext(LanguageContext)
