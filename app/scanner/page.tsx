"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Smartphone, LogIn, LogOut, Lock } from "lucide-react"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"
import { saveScannerToken, isScannerAuthenticated, clearScannerToken } from "@/lib/scanner-auth"

type AuthMethod = "qr" | "phone" | null
type Direction = "ENTRY" | "EXIT"
type Gate = "main" | "pier_1" | "pier_2"

const GATE_LABELS: Record<Gate, string> = { main: "정문", pier_1: "1부두", pier_2: "2부두" }

export default function ScannerMainPage() {
  const router = useRouter()
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null)
  const [gate, setGate] = useState<Gate>("main")
  const [scannerAuthed, setScannerAuthed] = useState(false)
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [pinLoading, setPinLoading] = useState(false)

  useEffect(() => {
    setScannerAuthed(isScannerAuthenticated())
  }, [])

  const handlePinSubmit = async () => {
    if (!pin.trim()) return
    setPinLoading(true)
    setPinError("")
    try {
      const res = await fetch("/api/scanner/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (data.success) {
        saveScannerToken(data.token)
        setScannerAuthed(true)
        setPin("")
      } else {
        setPinError(data.message || "인증 실패")
      }
    } catch {
      setPinError("서버 연결에 실패했습니다.")
    } finally {
      setPinLoading(false)
    }
  }

  const handleLogout = () => {
    clearScannerToken()
    setScannerAuthed(false)
  }

  const handleDirection = (direction: Direction) => {
    if (authMethod === "qr") {
      router.push(`/scanner/qr?direction=${direction}&gate=${gate}`)
    } else if (authMethod === "phone") {
      router.push(`/scanner/phone?direction=${direction}&gate=${gate}`)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader initialScrolled />

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full pt-6">
        {!scannerAuthed ? (
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <Lock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h1 className="text-3xl font-black text-white mb-2">스캐너 인증</h1>
              <p className="text-white/50 text-sm">출입 스캐너 사용을 위해 PIN을 입력해주세요</p>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                maxLength={10}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                placeholder="PIN 입력"
                className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-center text-2xl tracking-[0.5em] placeholder:text-white/30 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:border-amber-500/50"
              />
              {pinError && (
                <p className="text-red-400 text-sm text-center">{pinError}</p>
              )}
              <button
                type="button"
                onClick={handlePinSubmit}
                disabled={pinLoading || !pin.trim()}
                className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold text-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pinLoading ? "인증 중..." : "인증하기"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full flex justify-end mb-2">
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                스캐너 인증 해제
              </button>
            </div>

            <h1 className={`text-4xl font-black mb-8 ${authMethod === null ? "text-white" : "text-black"}`}>출입 권한 인증 방식 선택</h1>

            {authMethod === null ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <button
                  type="button"
                  onClick={() => setAuthMethod("qr")}
                  className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/60 transition-colors"
                >
                  <QrCode className="w-14 h-14 text-amber-400" />
                  <span className="text-2xl font-bold text-white">QR 코드 <br />인증</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod("phone")}
                  className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-colors"
                >
                  <Smartphone className="w-14 h-14 text-white/70" />
                  <span className="text-2xl font-bold text-white">휴대폰번호 <br />인증</span>
                </button>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <button
                    type="button"
                    onClick={() => handleDirection("ENTRY")}
                    className="flex flex-col items-center gap-4 py-16 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all"
                  >
                    <LogIn className="w-16 h-16 text-emerald-400" />
                    <span className="text-3xl font-black text-emerald-400">입장</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirection("EXIT")}
                    className="flex flex-col items-center gap-4 py-16 rounded-2xl border-2 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 transition-all"
                  >
                    <LogOut className="w-16 h-16 text-blue-400" />
                    <span className="text-3xl font-black text-blue-400">퇴장</span>
                  </button>
                </div>

                {/* 출입구 선택 - 접힘 처리 */}
                <details className="w-full">
                  <summary className="text-xs text-white/30 text-center cursor-pointer hover:text-white/50 transition-colors select-none py-1">
                    출입구 변경 (현재: {GATE_LABELS[gate]})
                  </summary>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {(["main", "pier_1", "pier_2"] as Gate[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGate(g)}
                        className={`py-2 px-2 rounded-xl border text-sm font-bold transition-colors ${gate === g
                          ? "border-amber-500 bg-amber-500/20 text-amber-400"
                          : "border-white/20 bg-white/5 text-white/50 hover:border-white/30"
                          }`}
                      >
                        {GATE_LABELS[g]}
                      </button>
                    ))}
                  </div>
                </details>

                <button
                  type="button"
                  onClick={() => setAuthMethod(null)}
                  className="w-full py-4 text-xl font-black text-white border-2 border-amber-400 bg-transparent hover:bg-amber-500/10 active:scale-95 transition-all rounded-2xl"
                >
                  ← 인증 방식 다시 선택
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
