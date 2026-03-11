"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, User } from "lucide-react"
import { PublicFooter } from "@/components/public/public-footer"

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
      {/* 헤더: QR 스캔 페이지와 동일한 3단 중앙 정렬 레이아웃 및 폰트 크기 적용 */}
      <header className="px-6 py-6 border-b border-white/10 grid grid-cols-3 items-center">
        <div className="flex justify-start">
          <Link
            href="/scanner"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
            <span className="text-lg font-semibold">출입 인증</span>
          </Link>
        </div>

        <div className="flex justify-center whitespace-nowrap">
          <span className="text-xl font-black text-amber-400 tracking-tight">
            {direction === "ENTRY" ? "입장" : "퇴장"} · 휴대전화 번호 조회
          </span>
        </div>

        {/* 우측 밸런스를 위한 빈 공간 */}
        <div className="flex justify-end" />
      </header>

      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        {/* 라벨 및 입력부 크기 한 단계 확대 */}
        <label className="block text-base font-bold text-white/70 mb-3">휴대폰 번호</label>
        <div className="flex gap-3 mb-6">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01012345678"
            className="flex-1 px-4 py-4 rounded-xl bg-white/5 border border-white/20 text-lg text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
          />
          <button
            type="button"
            onClick={search}
            disabled={loading}
            className="px-6 py-4 rounded-xl bg-amber-500 text-black text-lg font-black hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "조회 중" : "조회"}
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-base text-red-400 text-center">{error}</p>
          </div>
        )}

        {list.length > 0 && (
          <div className="space-y-3">
            <p className="text-base text-white/50 mb-3 font-medium">조회 결과에서 이름을 선택하세요</p>
            {list.map((item) => (
              <button
                key={item.receipt}
                type="button"
                onClick={() => selectReceipt(item.receipt)}
                className="w-full flex items-center gap-5 p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-500/30 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <User className="w-6 h-6 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-black text-white truncate mb-0.5">{item.visitor_name}</p>
                  <p className="text-sm text-amber-400 font-mono font-bold">{item.receipt}</p>
                  <p className="text-xs text-white/40 mt-1">
                    기간: {item.visit_start_date} ~ {item.visit_end_date}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* 공용 푸터 적용 */}
      <PublicFooter />
    </div>
  )
}