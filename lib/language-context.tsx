"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Lang = "ko" | "en"

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (ko: string, en: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ko",
  setLang: () => {},
  t: (ko) => ko,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ko")

  const t = (ko: string, en: string) => (lang === "ko" ? ko : en)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
