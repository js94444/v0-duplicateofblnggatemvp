"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, ArrowLeft, QrCode, Loader2 } from "lucide-react"

const GATE_LABELS: Record<string, string> = {
  main: "정문",
  pier_1: "1부두",
  pier_2: "2부두",
}

interface VerifyResult {
  result: "ALLOW" | "DENY"
  message: string
  visitor_name?: string
  visitor_org?: string
  access_area?: string
  visit_start_date?: string
  visit_end_date?: string
  direction?: string
}

export default function VerifyReceiptPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const receipt = params.receipt as string
  const direction = (searchParams.get("direction") === "EXIT" ? "EXIT" : "ENTRY") as "ENTRY" | "EXIT"
  const gate = searchParams.get("gate") ?? "main"

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verifyAndRecord() {
      try {
        setLoading(true)
        setError(null)
        
        // API 호출 - 스캔 기록 저장 및 검증
        const res = await fetch(`/api/qr/verify/${receipt}?direction=${direction}&gate=${gate}`, {
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        })
        
        const json = await res.json()
        console.log("[v0] Verify API response:", json)
        
        if (!res.ok) {
          setResult({
            result: "DENY",
            message: json.message || "출입권 검증에 실패했습니다.",
          })
        } else {
          setResult({
            result: json.result || "ALLOW",
            message: json.message || "처리되었습니다.",
            visitor_name: json.visitor_name,
            visitor_org: json.visitor_org,
            access_area: json.access_area,
            visit_start_date: json.visit_start_date,
            visit_end_date: json.visit_end_date,
            direction: direction,
          })
        }
      } catch (e) {
        console.error("[v0] Verify error:", e)
        setError("검증 중 오류가 발생했습니다.")
        setResult({ result: "DENY", message: "검증 중 오류가 발생했습니다." })
      } finally {
        setLoading(false)
      }
    }

    if (receipt) {
      verifyAndRecord()
    }
  }, [receipt, direction, gate])

  const gateLabel = GATE_LABELS[gate] ?? "정문"
  const isAllow = result?.result === "ALLOW"

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <Link
          href={`/scanner/qr?direction=${direction}&gate=${gate}`}
          className="flex items-center gap-2 text-white/60 hover:text-white"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">스캐너</span>
        </Link>
        <span className="text-xs text-amber-400 font-bold">
          {gateLabel} · {direction === "ENTRY" ? "입장" : "퇴장"}
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {loading ? (
          <div className="flex flex-col items-center gap-4 text-white/50">
            <Loader2 className="w-16 h-16 animate-spin text-amber-500" />
            <p className="text-lg font-bold">검증 중...</p>
          </div>
        ) : result ? (
          <div className="w-full max-w-md">
            <div className={`rounded-2xl p-8 text-center ${
              isAllow 
                ? "bg-emerald-500/20 border-2 border-emerald-500/50" 
                : "bg-red-500/20 border-2 border-red-500/50"
            }`}>
              {isAllow ? (
                <CheckCircle className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
              ) : (
                <XCircle className="w-20 h-20 text-red-400 mx-auto mb-4" />
              )}
              
              <h1 className={`text-2xl font-black mb-2 ${isAllow ? "text-emerald-400" : "text-red-400"}`}>
                {isAllow ? (direction === "ENTRY" ? "입장 허용" : "퇴장 허용") : "출입 거부"}
              </h1>
              
              <p className="text-white/70 mb-6">{result.message}</p>
              
              {isAllow && result.visitor_name && (
                <div className="bg-black/30 rounded-xl p-4 text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/50 text-sm">방문자</span>
                    <span className="text-white font-bold">{result.visitor_name}</span>
                  </div>
                  {result.visitor_org && (
                    <div className="flex justify-between">
                      <span className="text-white/50 text-sm">소속</span>
                      <span className="text-white">{result.visitor_org}</span>
                    </div>
                  )}
                  {result.access_area && (
                    <div className="flex justify-between">
                      <span className="text-white/50 text-sm">출입지역</span>
                      <span className="text-white">{result.access_area}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              href={`/scanner/qr?direction=${direction}&gate=${gate}`}
              className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-amber-500/50 bg-amber-500/20 text-amber-400 font-bold text-base hover:bg-amber-500/30 transition-colors"
            >
              <QrCode size={22} />
              다음 QR 스캔하기
            </Link>
          </div>
        ) : error ? (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-300">{error}</p>
          </div>
        ) : null}
      </main>

      <footer className="px-6 py-4 text-center text-[10px] text-white/20 tracking-widest uppercase border-t border-white/5">
        © BORYEONG LNG Terminal Management System
      </footer>
    </div>
  )
}
