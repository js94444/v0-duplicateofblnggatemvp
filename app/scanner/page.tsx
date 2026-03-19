"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Smartphone, LogIn, LogOut } from "lucide-react"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"

type AuthMethod = "qr" | "phone" | null
type Direction = "ENTRY" | "EXIT"
type Gate = "main" | "pier_1" | "pier_2"

const GATE_LABELS: Record<Gate, string> = { main: "정문", pier_1: "1부두", pier_2: "2부두" }

export default function ScannerMainPage() {
  const router = useRouter()
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null)
  const [gate, setGate] = useState<Gate>("main")

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
        <h1 className="text-4xl font-black text-white mb-2">출입 권한 인증 방식 선택 </h1>
        <p className="text-sm text-white/50 mb-8">인증 방식과 출입 방향을 선택하세요</p>

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
            <p className="text-sm text-white/60 text-center">
              {authMethod === "qr" ? "QR 코드" : "휴대폰 번호"}로 인증 · 출입 방향 선택
            </p>
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
              className="w-full py-3 text-sm text-white/40 hover:text-white transition-colors"
            >
              ← 인증 방식 다시 선택
            </button>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
