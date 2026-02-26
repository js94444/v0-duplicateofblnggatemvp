"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

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

const STORAGE_KEY = "blink_lang"

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko")

  // 초기 마운트 시 localStorage에서 언어 설정 복원
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved === "en" || saved === "ko") {
      setLangState(saved)
    }
  }, [])

  const setLang = (newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem(STORAGE_KEY, newLang)
  }

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
