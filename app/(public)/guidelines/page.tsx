"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Download, UserCircle, Menu, X as XIcon } from "lucide-react"

export default function GuidelinesPage() {
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
      <main className="relative z-10 flex-1 overflow-y-auto px-4 md:px-8 pt-32 pb-24">
        <div className="max-w-[1600px] mx-auto">
          
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-amber-500 transition-colors mb-6 group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold tracking-widest uppercase">Go Back</span>
          </Link>

          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-3 text-white">SHE Flyer</h2>
            <p className="text-white/40 text-sm uppercase tracking-widest font-bold">안전보건환경 준수사항 안내</p>
          </div>

          <div className="flex justify-center gap-4 mb-12 flex-wrap">
            <Button
              onClick={() => handleDownload("/images/she-flyer-page1.png", "보령LNG터미널_SHE_Flyer_페이지1.png")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              <Download className="w-4 h-4 mr-2" />
              페이지 1 다운로드
            </Button>
            <Button
              onClick={() => handleDownload("/images/she-flyer-page2.png", "보령LNG터미널_SHE_Flyer_페이지2.png")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              <Download className="w-4 h-4 mr-2" />
              페이지 2 다운로드
            </Button>
          </div>

          <div className="space-y-8">
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

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] p-12 flex flex-col justify-center gap-12 animate-in fade-in duration-300">
          <button type="button" className="absolute top-8 right-8 text-white/50 hover:text-white" onClick={() => setIsMenuOpen(false)}>
            <XIcon size={40} />
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
