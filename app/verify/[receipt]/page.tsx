"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, AlertTriangle, QrCode, Loader2 } from "lucide-react"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"

const GATE_LABELS: Record<string, string> = {
  main: "정문",
  pier_1: "1부두",
  pier_2: "2부두",
}

/** public/sounds/ 아래 MP3 파일명과 맞춤 */
const VERIFY_SOUNDS = {
  entry: "/sounds/verify-entry.mp3",
  exit: "/sounds/verify-exit.mp3",
  duplicate: "/sounds/verify-duplicate.mp3",
  failure: "/sounds/verify-failure.mp3",
} as const



interface VerifyResult {
  result: "ALLOW" | "DENY" | "MISMATCH"
  message: string
  visitor_name?: string
  visitor_org?: string
  access_area?: string
  visit_start_date?: string
  visit_end_date?: string
  direction?: string
}

function soundPathForVerifyOutcome(
  outcome: VerifyResult["result"],
  scanDirection: "ENTRY" | "EXIT"
): string {
  if (outcome === "ALLOW") {
    return scanDirection === "ENTRY" ? VERIFY_SOUNDS.entry : VERIFY_SOUNDS.exit
  }
  if (outcome === "MISMATCH") {
    return VERIFY_SOUNDS.duplicate
  }
  return VERIFY_SOUNDS.failure
}




export default function VerifyReceiptPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const receipt = params.receipt as string
  const direction = (searchParams.get("direction") === "EXIT" ? "EXIT" : "ENTRY") as "ENTRY" | "EXIT"
  const gate = searchParams.get("gate") ?? "main"

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(5)
  const isCalledRef = useRef(false)

  useEffect(() => {
    let isCancelled = false

    // React StrictMode 중복 호출 방지 - 즉시 플래그 설정
    if (isCalledRef.current) return
    isCalledRef.current = true

    async function verifyAndRecord() {
      try {
        setLoading(true)
        setError(null)

        // API 호출 - 스캔 기록 저장 및 검증
        const res = await fetch(`/api/qr/verify/${encodeURIComponent(receipt)}?direction=${direction}&gate=${gate}`, {
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        })

        // StrictMode로 인해 컴포넌트가 언마운트된 상태면 결과 반영 안 함
        if (isCancelled) return

        const json = await res.json()

        if (!res.ok) {
          setResult({
            result: "DENY",
            message: json.message || "출입권 검증에 실패했습니다.",
          })
        } else {
          // 입장/퇴장 메시지 설정
          let displayMessage = json.message || ""
          if (json.result === "ALLOW") {
            displayMessage = direction === "ENTRY" ? "입장 처리되었습니다." : "퇴장 처리되었습니다."
          }

          setResult({
            result: json.result || "ALLOW",
            message: displayMessage,
            visitor_name: json.visitor_name,
            visitor_org: json.visitor_org,
            access_area: json.access_area,
            visit_start_date: json.visit_start_date,
            visit_end_date: json.visit_end_date,
            direction: direction,
          })
        }
      } catch (e) {
        if (!isCancelled) {
          setError("검증 중 오류가 발생했습니다.")
          setResult({ result: "DENY", message: "검증 중 오류가 발생했습니다." })
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    if (receipt) {
      verifyAndRecord()
    }

    return () => {
      isCancelled = true
    }
  }, [receipt, direction, gate])


  // 결과 UI 표시 직후 1초 뒤, 입장/퇴장·중복·실패 비프음 재생 (QR·휴대폰 인증 동일 페이지)
  useEffect(() => {
    if (loading || !result) return

    const src = soundPathForVerifyOutcome(result.result, direction)
    const t = window.setTimeout(() => {
      const audio = new Audio(src)
      void audio.play().catch(() => {
        /* 자동 재생 제한·파일 없음 등 */
      })
    }, 1000)

    return () => window.clearTimeout(t)
  }, [loading, result, direction])



  // 3초 후 자동으로 스캐너 페이지로 이동
  useEffect(() => {
    if (loading || !result) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push(`/scanner?gate=${gate}`)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [loading, result, direction, gate, router])

  const gateLabel = GATE_LABELS[gate] ?? "정문"
  const isAllow = result?.result === "ALLOW"
  const isMismatch = result?.result === "MISMATCH"
  const isDeny = result?.result === "DENY"

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader initialScrolled />

      <main className="flex-1 flex flex-col items-center justify-center p-6 pt-24">
        {/* 현재 게이트/방향 표시 */}
        <div className="mb-6 text-center">
          <span className="px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-bold">
            {gateLabel} · {direction === "ENTRY" ? "입장" : "퇴장"}
          </span>
        </div>
        {loading ? (
          <div className="flex flex-col items-center gap-4 text-white/50">
            <Loader2 className="w-16 h-16 animate-spin text-amber-500" />
            <p className="text-lg font-bold">검증 중...</p>
          </div>
        ) : result ? (
          <div className="w-full max-w-md">
            <div className={`rounded-2xl p-8 text-center ${isAllow
              ? "bg-emerald-500/20 border-2 border-emerald-500/50"
              : isMismatch
                ? "bg-transparent border-2 border-yellow-500/50"
                : "bg-red-500/20 border-2 border-red-500/50"
              }`}>
              {isAllow ? (
                <CheckCircle className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
              ) : isMismatch ? (
                <AlertTriangle className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
              ) : (
                <XCircle className="w-20 h-20 text-red-400 mx-auto mb-4" />
              )}

              <h1 className={`text-2xl font-black mb-2 ${isAllow ? "text-emerald-400" : isMismatch ? "text-yellow-400" : "text-red-400"
                }`}>
                {isAllow
                  ? (direction === "ENTRY" ? "입장 허용" : "퇴장 허용")
                  : isMismatch
                    ? "중복 스캔"
                    : "출입 거부"}
              </h1>

              <p className="text-white/70 mb-6">{result.message}</p>

              {(isAllow || isMismatch) && result.visitor_name && (
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
              href={`/scanner?gate=${gate}`}
              className="mt-6 w-full flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border-2 border-amber-500/50 bg-transparent text-amber-400 font-bold text-base hover:bg-amber-500/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <QrCode size={22} />
                인증 선택 화면으로
              </div>
              <span className="text-xs text-amber-400/70">
                {countdown}초 후 자동 이동
              </span>
            </Link>
          </div>
        ) : error ? (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-300">{error}</p>
          </div>
        ) : null}
      </main>

      <PublicFooter />
    </div>
  )
}
