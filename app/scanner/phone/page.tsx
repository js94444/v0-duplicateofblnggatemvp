"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, User } from "lucide-react"
import { PublicFooter } from "@/components/public/public-footer"
import { getScannerToken } from "@/lib/scanner-auth"

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

  const GATE_LABELS: Record<string, string> = {
    main: "정문",
    pier_1: "제1부두",
    pier_2: "제2부두",
  }
  const gateLabel = GATE_LABELS[gate] ?? "정문"
  const oppositeDirection = direction === "ENTRY" ? "EXIT" : "ENTRY"
  const oppositeLabel = direction === "ENTRY" ? "퇴장" : "입장"
  const [phone, setPhone] = useState("")
  const [list, setList] = useState<ApprovedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 입력을 위해 input 엘리먼트에 직접 접근하기 위한 ref
  const inputRef = useRef<HTMLInputElement>(null)

  // 페이지 진입 시 자동으로 입력창에 포커스를 줘서 키패드를 유도함
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const search = async () => {
    if (!phone.trim()) return
    setError(null)
    setLoading(true)
    try {
      const scannerToken = getScannerToken()
      const res = await fetch(`/api/verify/by-phone?phone=${encodeURIComponent(phone.trim())}&scanner_token=${encodeURIComponent(scannerToken || "")}`)
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

  // 엔터 키 대응 (숫자 패드의 '완료' 또는 '이동' 버튼 클릭 시 바로 조회)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      search()
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          {/* 좌측: 출입 인증 링크 */}
          <Link
            href="/scanner"
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft size={22} />
            <span className="text-2xl sm:text-3xl font-black">출입 인증</span>
          </Link>

          {/* 가운데: 게이트 + 입장/퇴장 명확하게 표시 */}
          <div className="flex flex-col items-center text-center min-w-0">
            <span className="text-white/50 text-xs font-medium">{gateLabel}</span>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${direction === "ENTRY" ? "text-emerald-400" : "text-blue-400"
              }`}>
              {direction === "ENTRY" ? "입장" : "퇴장"} 휴대폰 인증
            </div>
          </div>

          {/* 우측: 입장↔퇴장 전환 링크 */}
          <Link
            href={`/scanner/phone?direction=${oppositeDirection}&gate=${gate}`}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all active:scale-95 shrink-0 ${direction === "ENTRY"
              ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              }`}
          >
            <span className="text-2xl sm:text-3xl font-black">{oppositeLabel} 인증</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        <label className="block text-base font-bold text-white/70 mb-3">휴대폰 번호</label>
        <div className="flex gap-3 mb-6">
          <input
            ref={inputRef}
            type="text"         // tel보다 text + inputMode 조합이 더 확실하게 숫자패드를 띄웁니다
            inputMode="numeric" // 모바일 숫자 키패드 강제
            pattern="[0-9]*"    // iOS 키패드 호환성
            autoFocus           // 페이지 로드 시 자동 포커스
            value={phone}
            onKeyDown={handleKeyDown}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="01012345678"
            className="flex-1 px-4 py-4 rounded-xl bg-white/5 border border-white/20 text-lg text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
          />
          <button
            type="button"
            onClick={search}
            disabled={loading}
            className="px-6 py-4 rounded-xl bg-amber-500 text-black text-lg font-black hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : "조회"}
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
            {list.map((item, index) => (
              <button
                key={item.receipt}
                type="button"
                onClick={() => selectReceipt(item.receipt)}
                className={`w-full flex items-center gap-5 p-5 rounded-2xl border transition-all text-left group ${index === 0
                  ? "border-amber-500/60 bg-amber-500/15 ring-2 ring-amber-500/30"
                  : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-500/30"
                  }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${index === 0 ? "bg-amber-500/30" : "bg-amber-500/10 group-hover:bg-amber-500/20"
                  }`}>
                  <User className="w-6 h-6 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-black text-white truncate mb-0.5">{item.visitor_name}</p>
                  <p className="text-sm text-amber-400 font-mono font-bold">{item.receipt}</p>
                  <p className="text-sm text-amber-400 font-black text-white mt-1.0">
                    기간: {item.visit_start_date} ~ {item.visit_end_date}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
