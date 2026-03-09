"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import jsQR from "jsqr"
import { Home, ArrowLeft } from "lucide-react"

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
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
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
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <Link
          href="/scanner"
          className="flex items-center gap-2 text-white/60 hover:text-white"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">출입 인증</span>
        </Link>
        <span className="text-xs text-amber-400 font-bold">
          {direction === "ENTRY" ? "입장" : "퇴장"} · QR
        </span>
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/20 text-white/70 text-sm font-medium hover:bg-white/10"
        >
          <Home size={18} />
          메인
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {state === "idle" && !error && (
          <div className="flex flex-col items-center gap-4 text-white/50">
            <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
            <p className="text-sm tracking-widest uppercase">카메라 준비 중...</p>
          </div>
        )}

        {(state === "scanning" || state === "processing") && (
          <>
            <p className="text-lg font-bold text-white/90 mb-4 tracking-tight">
              {state === "scanning" ? "QR 코드를 비춰주세요" : "검증 중..."}
            </p>
            <p className="mt-4 text-xs text-white/40 text-center">
              {direction === "ENTRY" ? "입장" : "퇴장"} 처리할 QR을 비춰주세요
            </p>
          </>
        )}

        <div
          className={
            state === "idle"
              ? "absolute left-0 top-0 w-px h-px overflow-hidden opacity-0 pointer-events-none"
              : "relative w-full max-w-lg aspect-square rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-black mt-4"
          }
        >
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" aria-hidden />
          {state !== "idle" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-dashed border-amber-400/60 rounded-xl" />
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-[10px] text-white/20 tracking-widest uppercase border-t border-white/5">
        © BORYEONG LNG Terminal Management System
      </footer>
    </div>
  )
}
