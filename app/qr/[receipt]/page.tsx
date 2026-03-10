"use client"

import { useParams } from "next/navigation"
import { QRCodeCard } from "@/components/common/qr-code-card"

export default function QRCodePage() {
  const params = useParams()
  const receipt = params.receipt as string

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <QRCodeCard receipt={receipt} />
    </div>
  )
}
