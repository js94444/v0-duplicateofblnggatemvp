"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { CheckCircle2, Calendar, Clock, MapPin, User, Building2, Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ApplicationType } from "@/lib/types"

/** QR 카드용 짧은 유형 라벨 (개인방문 / 단체방문 / 항만출입) */
const QR_TYPE_LABELS: Record<ApplicationType, string> = {
  [ApplicationType.VISIT_R3]: "개인방문",
  [ApplicationType.GROUP_VISIT]: "단체방문",
  [ApplicationType.PORT_ACCESS]: "항만출입",
  [ApplicationType.GOODS_INOUT]: "물품반입반출",
}

interface QRData {
  receipt: string
  applicantName: string
  organization: string
  visitDate: string
  visitTime: string
  accessArea: string
  applicationType: ApplicationType
  approvedAt?: string
  validUntil?: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })
}

interface QRCodeCardProps {
  receipt: string
}

export function QRCodeCard({ receipt }: QRCodeCardProps) {
  const [data, setData] = useState<QRData | null>(null)
  const [qrUrl, setQrUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!receipt || receipt.trim() === "" || receipt.toLowerCase() === "qr") {
      setError("올바른 접수번호로 접속해주세요. (예: /qr/VR-20260226-368)")
      setData(null)
      setQrUrl("")
      return
    }

    async function load() {
      try {
        setError(null)
        setData(null)
        const res = await fetch(`/api/verify/qr/${encodeURIComponent(receipt)}`)
        const json = await res.json()

        if (!res.ok || json.result !== "ALLOW") {
          if (!cancelled) {
            const base = json.message || "유효하지 않은 출입권입니다."
            setError(json.errorDetail ? `${base} — ${json.errorDetail}` : base)
          }
          return
        }

        const payload = json.data
        if (!cancelled && payload) {
          setData({
            receipt: payload.receipt,
            applicantName: payload.applicantName,
            organization: payload.organization,
            visitDate: payload.visitDate,
            visitTime: payload.visitTime,
            accessArea: payload.accessArea,
            applicationType: payload.applicationType,
            approvedAt: payload.approvedAt,
            validUntil: payload.validUntil,
          })
          // QR 이미지에는 항상 현재 페이지 접수번호 기준 검증 URL만 사용 (API qrUrl 오류 방지)
          const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(receipt)}`
          setQrUrl(verifyUrl)
        }
      } catch (e) {
        if (!cancelled) {
          console.error("[v0] Failed to load QR data:", e)
          setError("출입권 정보를 불러오지 못했습니다.")
        }
      }
    }

    if (receipt) {
      load()
    }

    return () => {
      cancelled = true
    }
  }, [receipt])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-white/60">
        <div className="w-10 h-10 rounded-full border-2 border-red-500/40 border-t-red-500 animate-spin" />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-4 text-white/40">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        <span className="text-sm tracking-widest uppercase">Loading</span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a]">

        {/* Top gradient stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* Status badge area */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-amber-500" />
            <span className="text-amber-500 text-xs font-black tracking-widest uppercase">Approved</span>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-white/20 text-white/50 tracking-wider px-2"
          >
            {QR_TYPE_LABELS[data.applicationType] ?? data.applicationType}
          </Badge>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-dashed border-white/10" />

        {/* QR Code */}
        <div className="flex flex-col items-center py-8 px-6 gap-4">
          <div className="p-4 bg-white rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.15)]">
            <QRCodeSVG
              value={qrUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#0a0a0a"
              level="H"
              marginSize={1}
            />
          </div>
          <div className="text-center">
            <p className="text-[11px] text-white/30 tracking-widest uppercase mb-1">Receipt No.</p>
            <p className="text-base font-black tracking-[0.15em] text-white">{data.receipt}</p>
          </div>
        </div>

        {/* Divider with circle cuts */}
        <div className="relative mx-0 flex items-center">
          <div className="absolute -left-3 w-6 h-6 rounded-full bg-black" />
          <div className="flex-1 border-t border-dashed border-white/10 mx-6" />
          <div className="absolute -right-3 w-6 h-6 rounded-full bg-black" />
        </div>

        {/* Info rows */}
        <div className="px-6 py-6 flex flex-col gap-4">
          <InfoRow icon={<User size={14} />} label="방문자" value={`${data.applicantName}`} />
          <InfoRow icon={<Building2 size={14} />} label="소속" value={data.organization} />
          <InfoRow icon={<Calendar size={14} />} label="방문 일자" value={formatDate(data.visitDate)} />
          <InfoRow icon={<Clock size={14} />} label="방문 시간" value={data.visitTime} />
          <InfoRow icon={<MapPin size={14} />} label="출입 구역" value={data.accessArea} />
        </div>

        {/* Valid until */}
        <div className="mx-6 mb-6 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 flex items-center justify-between">
          <span className="text-[11px] text-white/40 tracking-wider uppercase">유효기간</span>
          <span className="text-xs font-bold text-amber-400">{data.validUntil} 까지</span>
        </div>

        {/* Bottom gradient */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-5">
        <Button
          variant="outline"
          className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-amber-500/40 rounded-xl h-11 text-sm font-semibold tracking-wide gap-2"
          onClick={() => window.print()}
        >
          <Download size={15} />
          저장 / 인쇄
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-amber-500/40 rounded-xl h-11 text-sm font-semibold tracking-wide gap-2"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: "방문 QR 코드", url: window.location.href })
            } else {
              navigator.clipboard.writeText(window.location.href)
            }
          }}
        >
          <Share2 size={15} />
          공유
        </Button>
      </div>

      <p className="text-center text-[10px] text-white/20 mt-4 leading-relaxed">
        이 QR 코드는 출입 시 보안 담당자에게 제시하세요.<br />
        승인된 일시 및 구역 외 출입은 제한됩니다.
      </p>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-amber-500/60 shrink-0">{icon}</div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] text-white/30 tracking-widest uppercase">{label}</span>
        <span className="text-sm font-semibold text-white/90 truncate">{value}</span>
      </div>
    </div>
  )
}
