"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Search, Clock, FileText, ArrowRight, CheckCircle2, XCircle, Info, Smartphone } from "lucide-react"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"
import { useLang } from "@/lib/language-context"

interface Application {
  id: string
  receipt: string
  status: string
  visitor_name: string
  visitor_organization?: string
  visit_datetime: string
  created_at: string
}

export default function StatusPage() {
  const { t } = useLang()
  const [scrolled, setScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [receiptNumber, setReceiptNumber] = useState("") // Declare receiptNumber variable
  const [isSearching, setIsSearching] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [showResults, setShowResults] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "")
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  const handleSearch = async () => {
    const cleanPhone = phoneNumber.replace(/[^\d]/g, "")

    if (!cleanPhone) {
      toast({
        title: "휴대전화번호를 입력해주세요",
        description: "조회할 휴대전화번호를 입력해주세요",
        variant: "destructive",
      })
      return
    }

    if (cleanPhone.length !== 11) {
      toast({
        title: "올바른 휴대전화번호를 입력해주세요",
        description: "11자리 휴대전화번호를 입력해주세요 (예: 010-1234-5678)",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/status?phone=${encodeURIComponent(cleanPhone)}`)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] API response applications:", data.applications)
        if (data.applications && data.applications.length > 0) {
          data.applications.forEach((app: Application, idx: number) => {
            console.log(`[v0] Application ${idx} status:`, app.status, typeof app.status)
          })
          setApplications(data.applications)
          setShowResults(true)
        } else {
          toast({
            title: "신청 내역이 없습니다",
            description: "해당 휴대전화번호로 신청한 내역이 없습니다.",
            variant: "destructive",
          })
        }
      } else if (response.status === 404) {
        toast({
          title: "신청 내역을 찾을 수 없습니다",
          description: "입력하신 휴대전화번호로 신청한 내역이 없습니다.",
          variant: "destructive",
        })
      } else {
        throw new Error("조회 중 오류가 발생했습니다")
      }
    } catch (error) {
      console.error("[v0] Status check error:", error)
      toast({
        title: "서버 연결 오류",
        description: "데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
      setShowResults(false)
      setApplications([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const StatusBadge = ({ status }: { status: string }) => {
    console.log("[v0] StatusBadge received status:", status, typeof status)
    const configs: Record<string, { label: string; color: string; bg: string; border: string }> = {
      pending: { label: t("승인대기", "Pending"), color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
      approved: { label: t("승인완료", "Approved"), color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
      rejected: { label: t("신청반려", "Rejected"), color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
      cancelled: { label: t("신청취소", "Cancelled"), color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20" }
    }
    const config = configs[status?.toLowerCase()?.trim()] || configs.pending
    console.log("[v0] StatusBadge using config:", config.label)
    return (
      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-tighter ${config.color} ${config.bg} ${config.border}`}>
        {config.label}
      </span>
    )
  }

  const StatusGuideItem = ({ icon, color, bg, title, desc }: { icon: React.ReactNode; color: string; bg: string; title: string; desc: string }) => (
    <div className="flex gap-4 group cursor-default">
      <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0 transition-all group-hover:scale-110 shadow-lg`}>
        {icon}
      </div>
      <div>
        <h4 className={`text-sm font-black mb-1 ${color}`}>{title}</h4>
        <p className="text-xs text-white/40 leading-relaxed font-light">{desc}</p>
      </div>
    </div>
  )

  const SectionHeader = ({ title, sub }: { title: string; sub: string }) => (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-1.5 h-8 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
      <div className="flex flex-col">
        <h3 className="text-2xl font-black tracking-tight text-white italic uppercase">{title}</h3>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mt-1">{sub}</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">

      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/lng-terminal-bg.jpg')",
            filter: 'brightness(0.3) blur(5px)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      <PublicHeader />

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-6 md:px-12 pt-32 pb-24">
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">

          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-amber-500 transition-colors mb-6 group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold tracking-widest uppercase">Go Back</span>
          </Link>

          <h2 className="text-4xl md:text-5xl font-black mb-2 text-white">{t("신청 현황 조회", "Application Status")}</h2>
          <p className="text-white/40 text-sm mb-12">{t("방문 신청 현황을 조회하세요", "Check the status of your visit application")}</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 조회 입력 영역 */}
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-amber-500/5 group-hover:text-amber-500/10 transition-colors">
                  <Smartphone size={160} strokeWidth={1} />
                </div>

                <div className="relative z-10">
                  <SectionHeader title={t("휴대전화번호 조회", "Mobile Lookup")} sub="Lookup by Mobile" />
                  <p className="text-white/40 text-sm mb-10 leading-relaxed max-w-md">{t("신청 시 사용한 휴대전화번호를 입력하시면 현재 처리 상태 및 상세 내역을 확인할 수 있습니다.", "Enter the mobile number used during application to check the current status and details.")}</p>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="phone" className="text-sm font-bold text-white/80">
                        {t("휴대전화번호", "Mobile Number")} <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="phone"
                        placeholder="010-1234-5678"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        onKeyPress={handleKeyPress}
                        maxLength={13}
                        className="bg-black/40 border border-white/10 h-14 rounded-xl backdrop-blur-sm text-white transition-all duration-300 focus-visible:ring-0 focus-visible:outline-none focus-visible:!border-amber-500 focus-visible:!bg-black/60 focus-visible:shadow-[0_0_15px_rgba(245,158,11,0.1)] focus-visible:ring-[3px] focus-visible:ring-amber-500/20 placeholder:text-white/60"
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="px-10 py-4 bg-amber-500 text-black font-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_15px_30px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 self-end h-14"
                    >
                      {isSearching ? <Clock className="animate-spin" size={20} /> : <Search size={20} strokeWidth={3} />}
                      <span>{isSearching ? t("조회중...", "Searching...") : t("현황 조회", "Search")}</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* 조회 결과 영역 */}
              {showResults && (
                <section className="animate-in slide-in-from-top-6 duration-700 space-y-4">
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-xl font-black text-white italic tracking-tight">Application List <span className="text-amber-500 ml-2 font-sans not-italic font-bold">({applications.length})</span></h3>
                  </div>

                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => router.push(`/status/${app.receipt}`)}
                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-amber-500/40 transition-all group cursor-pointer shadow-xl"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-amber-500 border border-white/5 group-hover:bg-amber-500 group-hover:text-black transition-all duration-500">
                            <FileText size={28} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-xl font-black text-white">{app.visitor_name}</h4>
                              <StatusBadge status={app.status} />
                            </div>
                            <div className="flex flex-col gap-1 text-[11px] font-bold text-white/30 uppercase tracking-widest">
                              <span>Receipt: {app.receipt}</span>
                              {app.visitor_organization && <span>Org: {app.visitor_organization}</span>}
                              <span>Date: {new Date(app.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl text-sm font-black transition-all border border-white/5">
                          {t("상세보기", "View Details")} <ArrowRight size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* 처리 상태 안내 사이드바 */}
            <div className="space-y-6">
              <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 h-full shadow-2xl">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                  <h3 className="text-xl font-black italic tracking-tight text-white">Status Guide</h3>
                </div>

                <div className="space-y-8">
                  <StatusGuideItem
                    icon={<Clock size={18} />}
                    color="text-amber-500"
                    bg="bg-amber-500/10"
                    title={t("승인 대기 (Pending)", "Pending Approval")}
                    desc={t("신청서가 접수되어 담당자가 보안 및 방문 목적을 검토 중입니다.", "Your application has been received and is being reviewed by the person in charge.")}
                  />
                  <StatusGuideItem
                    icon={<CheckCircle2 size={18} />}
                    color="text-emerald-500"
                    bg="bg-emerald-500/10"
                    title={t("승인 완료 (Approved)", "Approved")}
                    desc={t("방문이 승인되었습니다. 등록된 번호로 출입증 정보가 발송됩니다.", "Your visit has been approved. Access pass information will be sent to your registered number.")}
                  />
                  <StatusGuideItem
                    icon={<XCircle size={18} />}
                    color="text-red-500"
                    bg="bg-red-500/10"
                    title={t("신청 반려 (Rejected)", "Rejected")}
                    desc={t("입력 정보 미비 또는 보안 규정 사유로 신청이 거절되었습니다.", "Your application was rejected due to incomplete information or security policy reasons.")}
                  />
                  <StatusGuideItem
                    icon={<XCircle size={18} />}
                    color="text-gray-500"
                    bg="bg-gray-500/10"
                    title={t("신청 취소 (Cancelled)", "Cancelled")}
                    desc={t("신청자 또는 관리자에 의해 방문 신청이 취소되었습니다.", "The visit application was cancelled by the applicant or administrator.")}
                  />
                </div>

                <div className="mt-16 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 border-dashed">
                  <p className="text-[10px] text-amber-500/50 font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                    <Info size={12} /> Notice
                  </p>
                  <p className="text-[11px] text-white/30 leading-relaxed font-medium">
                    {t("승인 완료된 방문 건은 현장에서 본인 확인 후 출입이 가능합니다. 문의사항은 관리부서(041-939-9923)로 연락 바랍니다.", "Approved visits are allowed on-site after identity verification. For inquiries, please contact the management office at 041-939-1114.")}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />


    </div>

  )
}
