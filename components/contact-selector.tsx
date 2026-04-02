"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ContactSelectorProps {
  value: string
  onChange: (value: string) => void
  onMobileChange?: (mobile: string) => void
  error?: string
  required?: boolean
}

interface Contact {
  name: string
  department: string
  mobile: string
  display: string
}

export function ContactSelector({ value, onChange, onMobileChange, error }: ContactSelectorProps) {
  const [search, setSearch] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)

        const res = await fetch("/api/contacts", { cache: "no-store" })
        if (!res.ok) throw new Error(`담당자 목록 로드 실패 (HTTP ${res.status})`)

        const data = (await res.json()) as { department: string; name: string }[]
        setContacts(
          data.map((c) => ({
            department: c.department,
            name: c.name,
            mobile: '',
            display: `${c.name}>${c.department}`,
          }))
        )
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e))
        setContacts([])
      } finally {
        setIsLoading(false)
      }
    }
    run()
  }, [])

  const filtered = useMemo(() => {
    const trimmed = search.trim()
    if (trimmed.length === 0) return []
    const q = trimmed.toLowerCase()
    // 이름과 정확히 일치하는 경우만 검색
    return contacts
      .filter((c) => c.name.toLowerCase() === q)
      .slice(0, 30)
  }, [search, contacts])

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const pick = async (contact: Contact) => {
    onChange(contact.display)
    // 서버에서 전화번호 조회 (public에 노출하지 않음)
    if (onMobileChange) {
      try {
        const res = await fetch(`/api/contacts/mobile?name=${encodeURIComponent(contact.name)}`)
        const data = await res.json()
        onMobileChange(data.mobile || '')
      } catch {
        onMobileChange('')
      }
    }
    setSearch("")
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        value={open ? search : (value || "")}
        placeholder={isLoading ? "담당자 목록 불러오는 중..." : "담당자를 검색하세요"}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setOpen(true)
          setSearch(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false)
          if (e.key === "Enter") {
            // 엔터 시 첫 번째 결과 선택
            if (filtered.length > 0) pick(filtered[0])
          }
        }}
        disabled={isLoading}
        className={cn("h-14 bg-black/40 border border-white/10 rounded-xl backdrop-blur-sm text-white transition-all duration-300 focus-visible:ring-0 focus-visible:outline-none focus-visible:!border-amber-500 focus-visible:!bg-black/60 focus-visible:shadow-[0_0_15px_rgba(245,158,11,0.1)] focus-visible:ring-[3px] focus-visible:ring-amber-500/20 placeholder:text-white/60", error && "border-red-400 focus-visible:!border-red-400 focus-visible:ring-0")}
      />

      {/* 드롭다운 */}
      {open && !isLoading && (
        <div className="absolute left-0 right-0 mt-2 max-h-72 overflow-auto rounded-xl border border-white/20 bg-black/95 backdrop-blur-xl shadow-lg z-[9999]">
          {loadError ? (
            <div className="p-3 text-sm text-red-400">{loadError}</div>
          ) : search.trim().length === 0 ? (
            <div className="p-3 text-sm text-white/40">담당자 이름을 정확히 입력하세요</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-white/40">일치하는 담당자가 없습니다.</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.display}
                type="button"
                onClick={() => pick(c)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-amber-500/20 hover:text-amber-500 transition-colors"
              >
                {c.display}
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
