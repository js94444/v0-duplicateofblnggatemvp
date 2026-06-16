"use client"

import Link from "next/link"
import { FileText, Search, ShieldCheck, BookOpen, ChevronRight } from "lucide-react"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"
import { useLang } from "@/lib/language-context"

export default function HomePage() {
  const { t, lang } = useLang()

  const menuItems = [
    { title: t("방문신청", "Visit Apply"), sub: "New Visit", icon: <FileText size={24} />, href: "/apply/visit" },
    { title: t("신청현황", "My Status"), sub: "Check Status", icon: <Search size={24} />, href: "/status" },
    { title: t("안전보건환경안내서", "SHE Guidelines"), sub: "SHE Flyer", icon: <ShieldCheck size={24} />, href: "/guidelines" },
    { title: t("이용안내", "User Guide"), sub: "How to Use", icon: <BookOpen size={24} />, href: "/manual" }
  ]

  return (
    <div className="min-h-screen font-sans bg-black text-white flex flex-col relative overflow-hidden">
      
      <PublicHeader />

      {/* Main Section */}
      <main className="relative flex-1 flex flex-col justify-center pt-16 pb-8 md:pb-16 px-6 md:px-12">
        
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
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-[1.1]" style={{ letterSpacing: "normal" }}>
            Value No.1,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Energy Global Partnership</span>
          </h1>
          <p className="text-white text-base md:text-lg font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {lang === "ko" ? (
              <span className="block whitespace-nowrap">
                보령 LNG 터미널은 안전하고 신속한 출입을 위해 방문 예약
                <br />
                서비스를 제공합니다.
              </span>
            ) : (
              <span className="block whitespace-nowrap">
                Boryeong LNG Terminal provides a visitor reservation
                <br />
                service for safe and efficient access.
              </span>
            )}
          </p>
        </div>

        {/* Menu Cards */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 max-w-7xl">
          {menuItems.map((item, index) => (
            <Link 
              key={index}
              href={item.href}
              className="group flex items-center justify-between p-5 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-amber-500/50 hover:-translate-y-1"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl group-hover:bg-amber-500 group-hover:text-black transition-all shrink-0">
                  {item.icon}
                </div>
                <div className="text-left min-w-0">
                  <h3 className="text-base font-bold text-white group-hover:text-amber-500 transition-colors whitespace-nowrap">{item.title}</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{item.sub}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-white/20 group-hover:text-amber-500 group-hover:translate-x-1 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <PublicFooter />



    </div>
  )
}
