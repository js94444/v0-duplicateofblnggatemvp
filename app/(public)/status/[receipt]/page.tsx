"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Calendar,
  MapPin,
  User,
  Users,
  Package,
  Ship,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Download,
} from "lucide-react"
import { PublicHeader } from "@/components/public/public-header"
import { StatusTimeline } from "@/components/common/status-timeline"
import { QRCodeCard } from "@/components/common/qr-code-card"
import { useLang } from "@/lib/language-context"
import {
  type Application,
  type ApplicationStatus,
  type ApplicationType,
  APPLICATION_TYPE_LABELS,
} from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"

const bgStyle = {
  backgroundImage: "url('/images/lng-terminal-bg.jpg')",
  filter: 'brightness(0.3) blur(5px)'
}

export default function StatusDetailPage() {
  const { t } = useLang()
  const params = useParams()
  const router = useRouter()
  const receipt = params.receipt as string
  const [scrolled, setScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (receipt) {
      fetchApplicationData()
    }
  }, [receipt])

  const PremiumLogo = () => (
    <Link href="/" className="flex items-center group cursor-pointer">
      <Image
        src="/images/boryeong-lng-ci.png"
        alt="보령LNG터미널"
        width={200}
        height={40}
        className="h-8 md:h-10 w-auto group-hover:opacity-90 transition-opacity"
        priority
      />
    </Link>
  )

  const getTypeFromReceipt = (receiptNumber: string): ApplicationType => {
    const prefix = receiptNumber.split('-')[0]
    switch (prefix) {
      case 'PA':
        return 'PORT_ACCESS' as ApplicationType
      case 'VR':
        return 'VISIT_R3' as ApplicationType
      case 'GV':
        return 'GROUP_VISIT' as ApplicationType
      case 'GI':
        return 'GOODS_INOUT' as ApplicationType
      default:
        return 'VISIT_R3' as ApplicationType
    }
  }

  const fetchApplicationData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/status/${receipt}`)
      
      if (!response.ok) {
        throw new Error("신청 정보를 불러올 수 없습니다")
      }

      const data = await response.json()
      console.log("[v0] Fetched application data:", data)
      console.log("[v0] Application fields check:", {
        type: data.type,
        receipt: data.receipt,
        visit_start_date: data.visit_start_date,
        visit_end_date: data.visit_end_date,
        access_start_datetime: data.access_start_datetime,
        access_end_datetime: data.access_end_datetime,
        personnel: data.personnel,
        companions: data.companions
      })
      setApplication(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const configs: Record<string, { label: string; color: string; bg: string; border: string }> = {
      pending: { label: t("승인대기", "Pending"), color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
      approved: { label: t("승인완료", "Approved"), color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
      rejected: { label: t("신청반려", "Rejected"), color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
      cancelled: { label: t("신청취소", "Cancelled"), color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20" }
    }
    const config = configs[status?.toLowerCase()?.trim()] || configs.pending
    return (
      <span className={`text-xs font-black px-3 py-1.5 rounded-xl border uppercase tracking-tight ${config.color} ${config.bg} ${config.border}`}>
        {config.label}
      </span>
    )
  }

  const getTypeIcon = (type: ApplicationType) => {
    const icons = {
      GROUP_VISIT: <Users className="h-5 w-5" />,
      PORT_ACCESS: <Ship className="h-5 w-5" />,
      GOODS_INOUT: <Package className="h-5 w-5" />,
      VISIT_R3: <User className="h-5 w-5" />
    }
    return icons[type] || <FileText className="h-5 w-5" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-center" style={bgStyle} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        </div>
        <main className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-12 w-12 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-white/60 font-bold">조회중...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-center" style={bgStyle} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        </div>
        <main className="relative z-10 flex-1 flex items-center justify-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-12 text-center max-w-md">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h3 className="text-2xl font-black mb-3">조회 실패</h3>
            <p className="text-white/60 mb-8">{error || "알 수 없는 오류가 발생했습니다"}</p>
            <Button onClick={() => window.history.back()} className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-6 rounded-xl">
              다시 시도
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={bgStyle} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      <PublicHeader />

      <main className="relative z-10 flex-1 overflow-y-auto px-6 md:px-12 pt-32 pb-24">
        <div className="max-w-5xl mx-auto">
          
          <Link href="/status" className="flex items-center gap-2 text-white/50 hover:text-amber-500 transition-colors mb-6 group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold tracking-widest uppercase">Go Back</span>
          </Link>

          <h2 className="text-4xl md:text-5xl font-black mb-2 text-white">신청 상세 정보</h2>
          <p className="text-white/40 text-sm mb-12">접수번호: {receipt}</p>

          <div className="space-y-8">
            <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    {getTypeIcon(getTypeFromReceipt(application.receipt))}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-1">{APPLICATION_TYPE_LABELS[getTypeFromReceipt(application.receipt)]}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Receipt: {application.receipt}</p>
                  </div>
                </div>
                <StatusBadge status={application.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-amber-500">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1 font-bold uppercase tracking-widest">신청일</p>
                    <p className="text-sm font-black text-white">{new Date(application.created_at).toLocaleDateString("ko-KR")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-amber-500">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1 font-bold uppercase tracking-widest">출입지역</p>
                    <p className="text-sm font-black text-white">{application.access_area || "-"}</p>
                  </div>
                </div>
                {application.contact_name && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-amber-500">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1 font-bold uppercase tracking-widest">담당자</p>
                      <p className="text-sm font-black text-white">{application.contact_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-8 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <div>
                  <h3 className="text-2xl font-black text-white">처리 현황</h3>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">Process Timeline</p>
                </div>
              </div>
              <StatusTimeline
                status={application.status}
                createdAt={application.created_at}
                updatedAt={application.updated_at}
                rejectionReason={application.rejection_reason}
              />
            </section>

            {/* Application Details Card */}
            <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-8 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <div>
                  <h3 className="text-2xl font-black text-white">신청 내용</h3>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">Application Details</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Entry Start */}
                <div>
                  <p className="text-sm text-white/40 mb-2 font-bold">출입 시작</p>
                  <p className="text-lg font-black text-white">
                    {(() => {
                      const app = application as any
                      let startDate = app.visit_start_date || app.access_start_datetime || app.visit_datetime
                      if (startDate) {
                        return new Date(startDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                      }
                      return '날짜 없음'
                    })()}
                  </p>
                </div>

                {/* Entry End */}
                <div>
                  <p className="text-sm text-white/40 mb-2 font-bold">출입 종료</p>
                  <p className="text-lg font-black text-white">
                    {(() => {
                      const app = application as any
                      let endDate = app.visit_end_date || app.access_end_datetime || app.visit_datetime
                      if (endDate) {
                        return new Date(endDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                      }
                      return '날짜 없음'
                    })()}
                  </p>
                </div>

                {/* Purpose */}
                <div>
                  <p className="text-sm text-white/40 mb-2 font-bold">출입 목적</p>
                  <p className="text-lg font-black text-white">
                    {(application as any).visit_purpose || (application as any).access_purpose || '목적 없음'}
                  </p>
                </div>

                {/* Personnel Count */}
                <div>
                  <p className="text-sm text-white/40 mb-2 font-bold">출입 인원</p>
                  <p className="text-lg font-black text-white">
                    {(() => {
                      const app = application as any
                      const companions = app.companions || []
                      const personnel = app.personnel || []
                      const visitors = app.visitors || []
                      
                      // Priority: personnel > visitors > companions
                      if (personnel.length > 0) {
                        return `${personnel.length}명`
                      } else if (visitors.length > 0) {
                        return `${visitors.length}명`
                      } else {
                        return `${companions.length + 1}명`
                      }
                    })()}
                  </p>
                </div>
              </div>
            </section>

            {/* QR Code Section - Show if Approved */}
            {application.status?.toUpperCase() === "APPROVED" && (
              <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <div>
                    <h3 className="text-2xl font-black text-white">출입 QR 코드</h3>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">Access QR Codes</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-8">
                  {/* 신청인 QR 코드 */}
                  <div className="flex flex-col items-center bg-black/30 rounded-3xl p-8 border border-emerald-500/20">
                    <p className="text-sm font-bold text-emerald-500 mb-6 uppercase tracking-widest">신청인 (Applicant)</p>
                    <QRCodeCard receipt={application.receipt} />
                  </div>

                  {/* 동행인 QR 코드 */}
                  {(() => {
                    const app = application as any
                    const companions = app.companions || []
                    return companions.length > 0 ? (
                      <div className="space-y-6">
                        <p className="text-sm font-bold text-amber-500 uppercase tracking-widest">동행인 ({companions.length}명)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {companions.map((companion: any, idx: number) => (
                            <div key={idx} className="flex flex-col items-center bg-black/30 rounded-3xl p-8 border border-amber-500/20">
                              <p className="text-xs font-bold text-amber-500 mb-4">{companion.name}</p>
                              <div className="w-full flex justify-center">
                                <div className="text-white/40 text-sm">
                                  {companion.qr_code ? (
                                    <div className="p-4 bg-white rounded-2xl">
                                      <img src={companion.qr_code} alt={companion.name} className="w-full h-auto" />
                                    </div>
                                  ) : (
                                    <div className="p-8 border border-dashed border-white/20 rounded-xl text-center">
                                      <p className="text-xs">QR 코드 준비 중...</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  })()}
                </div>
              </section>
            )}
              <section className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-[40px] p-10 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-black text-red-500">반려 사유</h3>
                </div>
                <div className="bg-black/30 rounded-2xl p-6 border border-red-500/10">
                  <p className="text-white/80 leading-relaxed">{application.rejection_reason}</p>
                </div>
              </section>
            )}

            <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {(application.status?.toUpperCase() === "PENDING" || application.status?.toLowerCase() === "pending") && (
                  <Button
                    onClick={() => window.location.href = `/apply/visit/form?edit=${application.id}`}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-10 py-6 rounded-xl text-lg hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  >
                    변경
                  </Button>
                )}
                {(["PENDING", "pending", "APPROVED", "approved"].includes(application.status)) && (
                  <Button
                    onClick={async () => {
                      if (!confirm("정말 방문을 취소하시겠습니까?")) return
                      try {
                        const response = await fetch(`/api/apply/visit/${application.id}`, { method: "DELETE" })
                        if (response.ok) {
                          toast({ title: "방문이 취소되었습니다", description: "신청이 정상적으로 취소되었습니다." })
                          setTimeout(() => window.location.href = "/status", 1500)
                        } else {
                          throw new Error("취소 실패")
                        }
                      } catch (error) {
                        toast({ title: "취소 실패", description: "방문 취소 중 오류가 발생했습니다.", variant: "destructive" })
                      }
                    }}
                    className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-400 font-bold px-10 py-6 rounded-xl text-lg hover:scale-105 transition-all"
                  >
                    방문취소
                  </Button>
                )}
                <Button 
                  onClick={() => router.push("/")} 
                  className="bg-black/40 hover:bg-black/50 border border-white/10 hover:border-white/30 text-white font-bold px-10 py-6 rounded-xl text-lg transition-all"
                >
                  확인
                </Button>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 px-12 flex flex-col md:flex-row justify-between items-center text-[10px] text-white/30 tracking-widest uppercase border-t border-white/5">
        <div className="mb-4 md:mb-0">© BORYEONG LNG Terminal Management System</div>
        <div className="flex gap-8 font-bold">
          <Link href="/privacy" className="hover:text-amber-500 transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-amber-500 transition-colors">Terms of Use</Link>
          <Link href="#" className="hover:text-amber-500 transition-colors">Contact Us</Link>
        </div>
      </footer>


    </div>
  )
}
