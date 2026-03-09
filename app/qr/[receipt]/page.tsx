"use client"

import { useParams } from "next/navigation"
import { QRCodeCard } from "@/components/common/qr-code-card"

export default function QRCodePage() {
  const params = useParams()
  const receipt = params.receipt as string

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="px-6 md:px-12 h-16 flex items-center border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <span className="text-amber-500 text-xs font-black">B</span>
          </div>
          <span className="text-sm font-bold tracking-widest uppercase text-white/50">
            B-LINK · 보령LNG 출입관리
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <QRCodeCard receipt={receipt} />
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-[10px] text-white/20 tracking-widest uppercase border-t border-white/5">
        © BORYEONG LNG Terminal Management System
      </footer>
    </div>
  )
}
