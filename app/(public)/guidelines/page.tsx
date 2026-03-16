"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Download, AlertCircle, MapPin, Clock } from "lucide-react"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"
import { useLang } from "@/lib/language-context"

export default function GuidelinesPage() {
  const { t } = useLang()
  const [scrolled, setScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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

  const handleDownload = async (imagePath: string, fileName: string) => {
    try {
      const response = await fetch(imagePath)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const bgStyle = {
    backgroundImage: "url('/images/lng-terminal-bg.jpg')",
    filter: 'brightness(0.3) blur(5px)'
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
      
      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={bgStyle} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      <PublicHeader />

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 md:px-8 pt-32 pb-24">
        <div className="max-w-[1600px] mx-auto">
          
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-amber-500 transition-colors mb-6 group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold tracking-widest uppercase">Go Back</span>
          </Link>

          {/* SHE Flyer - 먼저 표시 */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-3 text-white">SHE Flyer</h2>
            <p className="text-white/40 text-sm uppercase tracking-widest font-bold">{t("안전보건환경 준수사항 안내", "Safety, Health & Environment Guidelines")}</p>
          </div>

          <div className="flex justify-center gap-4 mb-12 flex-wrap">
            <Button
              onClick={() => handleDownload("/images/she-flyer-page1.png", "보령LNG터미널_SHE_Flyer_페이지1.png")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              <Download className="w-4 h-4 mr-2" />
              {t("페이지 1 다운로드", "Download Page 1")}
            </Button>
            <Button
              onClick={() => handleDownload("/images/she-flyer-page2.png", "보령LNG터미널_SHE_Flyer_페이지2.png")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              <Download className="w-4 h-4 mr-2" />
              {t("페이지 2 다운로드", "Download Page 2")}
            </Button>
          </div>

          <div className="space-y-8 mb-16">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-3 md:p-4 shadow-2xl overflow-hidden">
              <Image
                src="/images/she-flyer-page1.png"
                alt="SHE Flyer 페이지 1 - 시설현황, 비상대피로 및 집결지, 방문객 출입절차"
                width={2400}
                height={800}
                className="w-full h-auto rounded-2xl"
                priority
              />
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-3 md:p-4 shadow-2xl overflow-hidden">
              <Image
                src="/images/she-flyer-page2.png"
                alt="SHE Flyer 페이지 2 - 일회/삼회 아웃 룰, 일반 준수사항, 안전보호구 착용, 출입자 안전수칙"
                width={2400}
                height={800}
                className="w-full h-auto rounded-2xl"
              />
            </div>
          </div>

          {/* 안전교육 안내 - SHE Flyer 다음 */}
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-black mb-3 text-white">안전 교육 안내</h2>
            <p className="text-white/40 text-sm uppercase tracking-widest font-bold">{t("현장 출입 전 필수 확인", "Safety Education Information")}</p>
          </div>

          <div className="bg-emerald-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-[40px] p-10 shadow-2xl text-left">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-2xl font-black text-white">현장 출입 전 필수 확인</h3>
            </div>

            <div className="bg-black/30 rounded-2xl p-6 border border-emerald-500/10 mb-6">
              <p className="text-white/80 leading-relaxed mb-4">
                안전한 작업을 위해 <span className="text-emerald-400 font-bold">안전교육 이수</span>가 필요합니다.<br />
                아직 교육을 받지 않으셨나요?
              </p>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2 text-white/60">
                  <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>교육장 위치: <span className="text-white font-semibold">본관동 1층 BLT Hall</span></span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>문의: <span className="text-white font-semibold">안전환경팀 041-939-9984</span></span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-emerald-500/20">
              <div className="bg-black/40 px-4 py-2 flex items-center gap-2 border-b border-emerald-500/10">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">BLT Hall 위치 안내</span>
              </div>
              <Image
                src="/images/blt-hall-map.png"
                alt="BLT Hall 안내 지도 - 본관동 1층 BLT Hall까지의 경로"
                width={800}
                height={480}
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />


    </div>
  )
}
