"use client"

import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, XCircle, User, Building2, MapPin, Calendar, Clock, Phone, Home } from "lucide-react"

type VerifyResult = "loading" | "ALLOW" | "DENY"

interface VerifyDataLegacy {
  receipt: string
  applicantName: string
  organization: string
  visitDate: string
  visitTime: string
  accessArea: string
  applicationType?: string
  approvedAt?: string
  validUntil?: string
  alreadyUsed?: boolean
}

interface VerifyDataDirection {
  receipt: string
  visitorName: string
  visitorOrganization: string
  visitPurpose: string
  visitorPhone: string
  contactName: string
  contactMobile: string
  accessArea: string
  lastEntryAt: string | null
  lastExitAt: string | null
}

type VerifyData = VerifyDataLegacy | VerifyDataDirection

function isDirectionData(d: VerifyData): d is VerifyDataDirection {
  return "visitorName" in d && "visitPurpose" in d && "lastEntryAt" in d
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  })
}

export default function VerifyScannerPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const receipt = params.receipt as string
  const directionParam = searchParams.get("direction")
  const gateParam = searchParams.get("gate") ?? "main"
  const [result, setResult] = useState<VerifyResult>("loading")
  const [message, setMessage] = useState("")
  const [data, setData] = useState<VerifyData | null>(null)
  const [direction, setDirection] = useState<"ENTRY" | "EXIT" | null>(null)

  useEffect(() => {
    if (!receipt) return

    let cancelled = false
    const dir = directionParam === "EXIT" ? "EXIT" : directionParam === "ENTRY" ? "ENTRY" : null
    async function run() {
      try {
        setResult("loading")
        const base = `/api/verify/qr/${encodeURIComponent(receipt)}`
        const params = new URLSearchParams()
        if (dir) params.set("direction", dir)
        params.set("gate", gateParam)
        const url = `${base}?${params.toString()}`
        const res = await fetch(url)
        const json = await res.json().catch(() => ({ result: "DENY", message: "응답을 읽을 수 없습니다." }))
        if (cancelled) return

        setResult(json.result === "ALLOW" ? "ALLOW" : "DENY")
        const msg = json.message || (json.result === "ALLOW" ? "출입이 허용됩니다." : "출입이 거부되었습니다.")
        setMessage(json.errorDetail ? `${msg} (${json.errorDetail})` : msg)
        if (json.direction) setDirection(json.direction)
        if (json.data) setData(json.data)
      } catch (e) {
        if (!cancelled) {
          setResult("DENY")
          setMessage("검증 중 오류가 발생했습니다. 네트워크를 확인하거나 다시 시도해주세요.")
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [receipt, searchParams.get("t"), directionParam, gateParam])

  useEffect(() => {
    if (result === "loading") return
    const t = setTimeout(() => router.push(`/scanner/status?gate=${gateParam}`), 3000)
    return () => clearTimeout(t)
  }, [result, router, gateParam])

  if (result === "loading") {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-2 border-amber-500/40 border-t-amber-500 animate-spin" />
        <p className="mt-4 text-sm text-white/50 tracking-widest uppercase">검증 중...</p>
      </div>
    )
  }

  const isAllow = result === "ALLOW"
  const useDirectionLayout = isAllow && data && isDirectionData(data)

  const title = useDirectionLayout && direction
    ? direction === "ENTRY"
      ? "입장 허용"
      : "퇴장 처리 완료"
    : isAllow
    ? "출입 허용"
    : "출입 거절"

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <span className="text-amber-500 text-xs font-black">B</span>
          </div>
          <span className="text-sm font-bold tracking-widest uppercase text-white/50">
            B-LINK · 출입 검증
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className={`w-full max-w-md rounded-3xl border-2 overflow-hidden ${isAllow ? "border-emerald-500/50 bg-emerald-950/30" : "border-red-500/50 bg-red-950/30"}`}>
          <div className={`px-6 py-8 flex flex-col items-center gap-4 ${isAllow ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
            {isAllow ? (
              <CheckCircle2 className="w-20 h-20 text-emerald-400" strokeWidth={2} />
            ) : (
              <XCircle className="w-20 h-20 text-red-400" strokeWidth={2} />
            )}
            <h1 className={`text-2xl font-black tracking-tight ${isAllow ? "text-emerald-400" : "text-red-400"}`}>
              {title}
            </h1>
            <p className="text-center text-white/70 text-sm">{message}</p>
            {isAllow && data && !isDirectionData(data) && (data as VerifyDataLegacy).alreadyUsed && (
              <p className="text-center text-emerald-300/90 text-sm font-medium">
                이미 처리된 출입권입니다. 동일 QR이 이전에 검증되었습니다.
              </p>
            )}
            <p className="text-[11px] text-white/40 tracking-widest uppercase">접수번호 {receipt}</p>
          </div>

          {isAllow && data && useDirectionLayout && (
            <div className="px-6 py-6 space-y-4 border-t border-white/10">
              <Row icon={<User size={16} />} label="방문자" value={data.visitorName} />
              <Row icon={<Building2 size={16} />} label="소속" value={data.visitorOrganization} />
              <Row icon={<MapPin size={16} />} label="방문목적" value={data.visitPurpose} />
              <Row icon={<Phone size={16} />} label="방문자 연락처" value={data.visitorPhone} />
              <Row icon={<User size={16} />} label="담당자 이름" value={data.contactName} />
              <Row icon={<Phone size={16} />} label="담당자 연락처" value={data.contactMobile} />
              <Row icon={<MapPin size={16} />} label="출입구역" value={data.accessArea} />
              <Row icon={<Clock size={16} />} label="입장시간" value={formatDateTime(data.lastEntryAt)} />
              <Row icon={<Clock size={16} />} label="퇴장시간" value={formatDateTime(data.lastExitAt)} />
            </div>
          )}

          {isAllow && data && !useDirectionLayout && (
            <div className="px-6 py-6 space-y-4 border-t border-white/10">
              <Row icon={<User size={16} />} label="방문자" value={(data as VerifyDataLegacy).applicantName} />
              <Row icon={<Building2 size={16} />} label="소속" value={(data as VerifyDataLegacy).organization} />
              <Row icon={<MapPin size={16} />} label="출입 구역" value={(data as VerifyDataLegacy).accessArea} />
              <Row icon={<Calendar size={16} />} label="방문 일자" value={(data as VerifyDataLegacy).visitDate ? new Date((data as VerifyDataLegacy).visitDate).toLocaleDateString("ko-KR") : "-"} />
              <Row icon={<Clock size={16} />} label="방문 시간" value={(data as VerifyDataLegacy).visitTime} />
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-white/40">3초 후 출입 현황 화면으로 자동 이동합니다.</p>
        <Link
          href={`/scanner/status?gate=${gateParam}`}
          className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition-colors"
        >
          <Home size={18} />
          출입 현황 보기
        </Link>
      </main>

      <footer className="px-6 py-4 text-center text-[10px] text-white/20 tracking-widest uppercase border-t border-white/5">
        © BORYEONG LNG Terminal Management System
      </footer>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-amber-500/70 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-white/40 tracking-widest uppercase">{label}</p>
        <p className="text-sm font-semibold text-white/90 truncate">{value || "-"}</p>
      </div>
    </div>
  )
}
