"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import jsQR from "jsqr"
import { ArrowLeft } from "lucide-react"
import { PublicFooter } from "@/components/public/public-footer"

type ScannerState = "idle" | "scanning" | "processing"

function extractReceiptFromUrl(urlOrPath: string): string | null {
  const raw = (urlOrPath || "").trim()
  if (!raw) return null
  let path = raw
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      path = new URL(raw).pathname
    } else if (raw.startsWith("/")) {
      path = raw
    } else {
      path = new URL(raw, "http://dummy").pathname
    }
  } catch {
    path = raw
  }
  const verifyMatch = path.match(/\/verify\/([^/?]+)/)
  if (verifyMatch) {
    const segment = verifyMatch[1]
    if (segment === "qr") return null
    return segment
  }
  const apiMatch = path.match(/\/api\/verify\/qr\/([^/?]+)/)
  if (apiMatch) return apiMatch[1]
  return null
}

export default function ScannerQrPage() {
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<ScannerState>("idle")
  const [error, setError] = useState<string | null>(null)
  const scanningRef = useRef(false)

  useEffect(() => {
    let animationId: number

    async function startCamera() {
      try {
        setError(null)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        streamRef.current = stream
        const video = videoRef.current
        if (!video) {
          setError("비디오 요소를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.")
          return
        }
        video.srcObject = stream
        try {
          await video.play()
        } catch (playErr) {
          console.warn("video.play() failed:", playErr)
        }
        setState("scanning")
        scanningRef.current = true
        requestTick()
      } catch (e) {
        console.error("Camera error:", e)
        setError("카메라를 사용할 수 없습니다. 카메라 권한을 확인해주세요.")
        setState("idle")
      }
    }

    function requestTick() {
      if (!scanningRef.current || !videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationId = requestAnimationFrame(requestTick)
        return
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code && code.data) {
        const receipt = extractReceiptFromUrl(code.data)
        if (receipt) {
          scanningRef.current = false
          setState("processing")
          router.push(`/verify/${receipt}?t=${Date.now()}&direction=${direction}&gate=${gate}`)
          return
        }
      }
      animationId = requestAnimationFrame(requestTick)
    }

    startCamera()
    return () => {
      scanningRef.current = false
      if (animationId) cancelAnimationFrame(animationId)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [router, direction, gate])

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          {/* 좌측: 출입 인증 링크 */}
          <Link
            href="/scanner"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-bold hidden sm:inline">출입 인증</span>
          </Link>

          {/* 가운데: 게이트 + 입장/퇴장 명확하게 표시 */}
          <div className="flex flex-col items-center text-center min-w-0">
            <span className="text-white/50 text-xs font-medium">{gateLabel}</span>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              direction === "ENTRY" ? "text-emerald-400" : "text-blue-400"
            }`}>
              {direction === "ENTRY" ? "입장" : "퇴장"} QR 스캔
            </div>
          </div>

          {/* 우측: 입장↔퇴장 전환 링크 */}
          <Link
            href={`/scanner/qr?direction=${oppositeDirection}&gate=${gate}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all active:scale-95 shrink-0 ${
              direction === "ENTRY" 
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20" 
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            <span className="text-sm font-bold">{oppositeLabel} 스캔</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-base text-center">
            {error}
          </div>
        )}

        {state === "idle" && !error && (
          <div className="flex flex-col items-center gap-6 text-white/50">
            <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
            <p className="text-xl font-bold tracking-widest uppercase">카메라 준비 중...</p>
          </div>
        )}

        {(state === "scanning" || state === "processing") && (
          <>
            <p className="text-3xl font-black text-white mb-3 tracking-tight">
              {state === "scanning" ? "QR 코드를 비춰주세요" : "검증 중..."}
            </p>
            <p className="text-lg text-white/50 text-center mb-4">
              {direction === "ENTRY" ? "입장" : "퇴장"} 처리할 QR 코드를 카메라에 비춰주세요
            </p>
          </>
        )}

        <div
          className={
            state === "idle"
              ? "absolute left-0 top-0 w-px h-px overflow-hidden opacity-0 pointer-events-none"
              : "relative w-full max-w-lg aspect-square rounded-3xl overflow-hidden border-[3px] border-amber-500/50 bg-black mt-4 shadow-2xl shadow-amber-500/10"
          }
        >
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" aria-hidden />
          {state !== "idle" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-72 border-2 border-dashed border-amber-400/60 rounded-2xl animate-pulse" />
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
