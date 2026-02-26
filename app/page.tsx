"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { FileText, Search, ShieldCheck, UserCircle, Menu, X, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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

  const menuItems = [
    { title: "방문신청", sub: "New Visit", icon: <FileText size={24} />, href: "/apply/visit" },
    { title: "신청현황", sub: "Check Status", icon: <Search size={24} />, href: "/status" },
    { title: "안전보건환경안내서", sub: "SHE Flyer", icon: <ShieldCheck size={24} />, href: "/guidelines" }
  ]

  return (
    <div className="min-h-screen font-sans bg-black text-white flex flex-col relative overflow-hidden">
      
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

      {/* Main Section */}
      <main className="relative flex-1 flex flex-col justify-end pb-12 md:pb-24 px-6 md:px-12">
        
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: "url('/images/lng-terminal-bg.jpg')",
              filter: 'brightness(0.95)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
        </div>

        {/* Text Content */}
        <div className="relative z-10 max-w-2xl mb-12 animate-in fade-in slide-in-from-left-2 duration-1000">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-[2px] bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
            <span className="text-amber-500 text-sm md:text-lg font-black tracking-[0.45em] uppercase drop-shadow-md">
              방문객 예약 시스템
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
            Value No.1,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Energy Global Partnership</span>
          </h1>
          <p className="text-white text-base md:text-lg max-w-md font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            보령 LNG 터미널은 안전하고 신속한 출입을 위해 <br className="hidden md:block" />
            방문 예약 서비스를 제공합니다.
          </p>
        </div>

        {/* Menu Cards */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl">
          {menuItems.map((item, index) => (
            <Link 
              key={index}
              href={item.href}
              className="group flex items-center justify-between p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-amber-500/50 hover:-translate-y-1"
            >
              <div className="flex items-center gap-5">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl group-hover:bg-amber-500 group-hover:text-black transition-all">
                  {item.icon}
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors">{item.title}</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{item.sub}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-white/20 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
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
          <Link href="/contact" className="hover:text-amber-500 transition-colors">Contact Us</Link>
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
