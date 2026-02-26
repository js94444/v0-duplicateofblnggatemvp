"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, ClipboardCheck, Bell, UserCheck, MapPin, Info, Check, UserCircle, Menu, X } from "lucide-react" 
import Link from "next/link"
import Image from "next/image"

export default function VisitAgreementPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [agreements, setAgreements] = useState({
    privacy: false,
    security: false,
    safety: false,
    all: false
  })

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

  const visitSteps = [
    { label: "방문신청", icon: <ClipboardCheck size={16} /> },
    { label: "담당자통보", icon: <Bell size={16} /> },
    { label: "내부승인", icon: <UserCheck size={16} /> },
    { label: "방문", icon: <MapPin size={16} /> },
  ]

  const handleAllAgree = () => {
    const newState = !agreements.all
    setAgreements({ privacy: newState, security: newState, safety: newState, all: newState })
  }

  const toggleAgree = (key: string) => {
    setAgreements(prev => {
      const updated = { ...prev, [key]: !prev[key] }
      updated.all = updated.privacy && updated.security && updated.safety
      return updated
    })
  }

  const handleSubmit = () => {
    if (agreements.all) {
      router.push("/apply/visit/form")
    }
  }

  const AgreementCard = ({ title, content, checked, onToggle }: { title: string; content: React.ReactNode; checked: boolean; onToggle: () => void }) => (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden group hover:border-white/20 transition-all">
      <div className="p-8 pb-0 flex justify-between items-center">
        <h3 className="text-xl font-black flex items-center gap-3">
          <Info size={18} className="text-amber-500" />
          {title}
        </h3>
      </div>
      <div className="p-8">
        <div className="bg-black/40 rounded-2xl p-6 h-40 overflow-y-auto text-white/50 text-sm font-light leading-relaxed border border-white/5"
             style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(245,158,11,0.2) rgba(255,255,255,0.02)' }}>
          {content}
        </div>
        <label className="mt-6 flex items-center gap-3 cursor-pointer max-w-fit group/label">
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'bg-amber-500 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-white/10 group-hover/label:border-amber-500/50'}`}>
            {checked && <Check size={14} className="text-black" strokeWidth={4} />}
          </div>
          <input type="checkbox" className="hidden" checked={checked} onChange={onToggle} />
          <span className={`text-sm font-bold transition-colors ${checked ? 'text-amber-500' : 'text-white/40'}`}>내용을 확인하였으며 동의합니다 (필수)</span>
        </label>
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

      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 px-6 md:px-12 flex items-center justify-between ${
        scrolled ? 'h-16 bg-black/60 backdrop-blur-xl border-b border-white/10' : 'h-24 bg-transparent'
      }`}>
        <PremiumLogo />
        
        <div className="hidden md:flex items-center gap-8 text-[13px] font-bold tracking-widest uppercase text-white/70">
          <Link href="#" className="hover:text-amber-500 transition-colors">Intro</Link>
          <Link href="#" className="hover:text-amber-500 transition-colors">Notice</Link>
          <Link href="#" className="hover:text-amber-500 transition-colors">Support</Link>
          <Button variant="ghost" size="sm" asChild className="flex items-center gap-2 border border-white/20 hover:border-amber-500/50 hover:bg-amber-500/10 px-5 py-2 rounded-full transition-all">
            <Link href="/admin/login">
              <UserCircle size={16} />
              <span>Admin</span>
            </Link>
          </Button>
        </div>

        <button type="button" className="md:hidden p-2 text-white" onClick={() => setIsMenuOpen(true)}>
          <Menu size={28} />
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-8 md:px-16 pt-32 pb-24">
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Back Button & Title */}
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-amber-500 transition-colors mb-6 group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold tracking-widest uppercase">Go Back</span>
          </Link>

          <h2 className="text-4xl md:text-5xl font-black mb-2 text-white">방문 신청</h2>
          <p className="text-white/40 text-sm mb-12">방문 신청을 위해 아래 동의 사항을 확인하고 동의해주세요.</p>

          {/* Visit Steps Indicator */}
          <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] px-12 py-8 mb-16">
            <div className="flex flex-col gap-3">
              {/* Icons and lines row */}
              <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto] items-center gap-4">
                {visitSteps.map((step, idx) => (
                  <>
                    <div key={`icon-${idx}`} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${idx === 0 ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-white/10 text-white/40'}`}>
                      {step.icon}
                    </div>
                    {idx < visitSteps.length - 1 && (
                      <div key={`line-${idx}`} className="h-[2px] bg-white/10 w-full" />
                    )}
                  </>
                ))}
              </div>
              {/* Labels row */}
              <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto] items-center gap-4">
                {visitSteps.map((step, idx) => (
                  <>
                    <span key={`label-${idx}`} className={`text-sm font-bold text-center whitespace-nowrap ${idx === 0 ? 'text-amber-500' : 'text-white/40'}`} style={{ width: '56px' }}>{step.label}</span>
                    {idx < visitSteps.length - 1 && (
                      <div key={`spacer-${idx}`} />
                    )}
                  </>
                ))}
              </div>
            </div>
          </div>

          {/* Agreement Sections */}
          <div className="space-y-6">
            <AgreementCard 
              title="개인정보 수집·이용 동의" 
              checked={agreements.privacy} 
              onToggle={() => toggleAgree('privacy')}
              content={
                <div className="space-y-4">
                  <p><strong>1. 개인정보의 수집 및 이용 목적</strong><br />보령LNG터미널 시설 방문 신청 및 출입 관리</p>
                  <p><strong>2. 수집하는 개인정보의 항목</strong><br />성명, 생년월일, 휴대전화번호, 이메일, 직책, 소속, 주소, 차량번호, 차종, 방문목적 등</p>
                  <p><strong>3. 개인정보의 보유 및 이용 기간</strong><br />방문 종료 후 1년 (보안 지침에 따라 연장될 수 있음)</p>
                </div>
              }
            />

            <AgreementCard 
              title="보안 서약" 
              checked={agreements.security} 
              onToggle={() => toggleAgree('security')}
              content={
                <div className="space-y-2">
                  <p>본인은 보령LNG터미널 방문 시 다음 사항을 준수할 것을 서약합니다:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>시설 내 촬영, 녹음, 녹화 금지</li>
                    <li>허가되지 않은 구역 출입 금지</li>
                    <li>업무상 취득한 정보의 외부 유출 금지</li>
                    <li>방문 목적 외 활동 금지</li>
                  </ul>
                </div>
              }
            />

            <AgreementCard 
              title="안전준수 서약" 
              checked={agreements.safety} 
              onToggle={() => toggleAgree('safety')}
              content={
                <div className="space-y-2">
                  <p>본인은 보령LNG터미널 방문 시 다음 안전수칙을 준수할 것을 서약합니다:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>안전모, 안전화 등 개인보호구 착용</li>
                    <li>지정된 통로로 이동 및 안전표지 준수</li>
                    <li>흡연구역 외 흡연 금지</li>
                    <li>화기 취급 및 인화물질 반입 금지</li>
                  </ul>
                </div>
              }
            />

            {/* All Agree & Submit */}
            <div className="mt-12 p-8 rounded-[32px] border-2 border-amber-500/30 bg-amber-500/5 backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${agreements.all ? 'bg-amber-500 border-amber-500' : 'border-white/20 group-hover:border-amber-500/50'}`}>
                  {agreements.all && <Check size={18} className="text-black" strokeWidth={4} />}
                </div>
                <input type="checkbox" className="hidden" checked={agreements.all} onChange={handleAllAgree} />
                <span className="text-lg font-black text-white">위 약관에 전체 동의합니다</span>
              </label>

              <button 
                type="button"
                onClick={handleSubmit}
                disabled={!agreements.all}
                className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-lg transition-all shadow-2xl ${agreements.all ? 'bg-amber-500 text-black hover:scale-105 active:scale-95' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
              >
                신청서 작성
                <ArrowRight size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-12 flex flex-col md:flex-row justify-between items-center text-[10px] text-white/30 tracking-widest uppercase border-t border-white/5">
        <div className="mb-4 md:mb-0">
          © BORYEONG LNG Terminal Management System
        </div>
        <div className="flex gap-8 font-bold">
          <Link href="/privacy" className="hover:text-amber-500 transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-amber-500 transition-colors">Terms of Use</Link>
          <Link href="#" className="hover:text-amber-500 transition-colors">Contact Us</Link>
        </div>
      </footer>

      {/* Mobile Full Screen Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] p-12 flex flex-col justify-center gap-12 animate-in fade-in duration-300">
          <button type="button" className="absolute top-8 right-8 text-white/50 hover:text-white" onClick={() => setIsMenuOpen(false)}>
            <X size={40} />
          </button>
          <div className="flex flex-col gap-8 text-4xl font-black">
            <Link href="/apply/visit" className="hover:text-amber-500">방문신청</Link>
            <Link href="/status" className="hover:text-amber-500">예약조회</Link>
            <Link href="/guidelines" className="hover:text-amber-500">안전수칙</Link>
            <Link href="/admin/login" className="hover:text-amber-500">시스템관리</Link>
          </div>
          <PremiumLogo />
        </div>
      )}
    </div>
  )
}
