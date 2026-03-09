"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Home, ArrowLeft, User } from "lucide-react"

interface ApprovedItem {
  receipt: string
  visitor_name: string
  visit_start_date: string
  visit_end_date: string
}

export default function ScannerPhonePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const direction = (searchParams.get("direction") === "EXIT" ? "EXIT" : "ENTRY") as "ENTRY" | "EXIT"
  const gate = searchParams.get("gate") ?? "main"
  const [phone, setPhone] = useState("")
  const [list, setList] = useState<ApprovedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    if (!phone.trim()) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/verify/by-phone?phone=${encodeURIComponent(phone.trim())}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "조회 실패")
      setList(json.data || [])
      if (!(json.data?.length)) setError("해당 번호로 오늘 유효한 승인 신청이 없습니다.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 중 오류가 발생했습니다.")
      setList([])
    } finally {
      setLoading(false)
    }
  }

  const selectReceipt = (receipt: string) => {
    router.push(`/verify/${receipt}?t=${Date.now()}&direction=${direction}&gate=${gate}`)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <Link href="/scanner" className="flex items-center gap-2 text-white/60 hover:text-white">
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">출입 인증</span>
        </Link>
        <span className="text-xs text-amber-400 font-bold">
          {direction === "ENTRY" ? "입장" : "퇴장"} · 휴대폰
        </span>
        <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/20 text-white/70 text-sm font-medium hover:bg-white/10">
          <Home size={18} />
          메인
        </Link>
      </header>

      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <label className="block text-sm font-bold text-white/70 mb-2">휴대폰 번호</label>
        <div className="flex gap-2 mb-4">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01012345678"
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder:text-white/30"
          />
          <button
            type="button"
            onClick={search}
            disabled={loading}
            className="px-5 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? "조회 중" : "조회"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}

        {list.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-white/50 mb-2">접수번호를 선택하세요</p>
            {list.map((item) => (
              <button
                key={item.receipt}
                type="button"
                onClick={() => selectReceipt(item.receipt)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-left"
              >
                <User className="w-8 h-8 text-amber-500/70 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{item.visitor_name}</p>
                  <p className="text-sm text-amber-400 font-mono">{item.receipt}</p>
                  <p className="text-xs text-white/50">
                    {item.visit_start_date} ~ {item.visit_end_date}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="px-6 py-4 text-center text-[10px] text-white/20 tracking-widest uppercase border-t border-white/5">
        © BORYEONG LNG Terminal Management System
      </footer>
    </div>
  )
}
