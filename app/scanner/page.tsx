"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Smartphone, LogIn, LogOut, DoorOpen } from "lucide-react"
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

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full pt-10">
        <h1 className="text-6xl font-black text-white mb-2">출입 권한 인증</h1>
        <p className="text-sm text-white/50 mb-8">인증 방식과 출입 방향을 선택하세요</p>

        {authMethod === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <button
              type="button"
              onClick={() => setAuthMethod("qr")}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/60 transition-colors"
            >
              <QrCode className="w-14 h-14 text-amber-400" />
              <span className="text-base font-bold text-white">QR 코드로 인증</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod("phone")}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-colors"
            >
              <Smartphone className="w-14 h-14 text-white/70" />
              <span className="text-base font-bold text-white">휴대폰 번호로 인증</span>
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <p className="text-sm text-white/60 text-center">출입구 선택</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["main", "pier_1", "pier_2"] as Gate[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGate(g)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-sm font-bold transition-colors ${gate === g
                    ? "border-amber-500 bg-amber-500/20 text-amber-400"
                    : "border-white/20 bg-white/5 text-white/70 hover:border-white/30"
                    }`}
                >
                  <DoorOpen size={18} />
                  {GATE_LABELS[g]}
                </button>
              ))}
            </div>
            <p className="text-sm text-white/60 text-center">
              {authMethod === "qr" ? "QR 코드" : "휴대폰 번호"}로 인증 · 출입 방향 선택
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleDirection("ENTRY")}
                className="flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
              >
                <LogIn className="w-12 h-12 text-emerald-400" />
                <span className="text-lg font-bold text-white">입장</span>
              </button>
              <button
                type="button"
                onClick={() => handleDirection("EXIT")}
                className="flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                <LogOut className="w-12 h-12 text-amber-400" />
                <span className="text-lg font-bold text-white">퇴장</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAuthMethod(null)}
              className="w-full py-3 text-sm text-white/50 hover:text-white"
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
