"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { UserCircle, Menu, X, Globe, BookOpen, MessageSquare } from "lucide-react"
import { useLang } from "@/lib/language-context"

interface PublicHeaderProps {
  initialScrolled?: boolean
}

export function PublicHeader({ initialScrolled = false }: PublicHeaderProps) {
  const [scrolled, setScrolled] = useState(initialScrolled)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { lang, setLang } = useLang()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks: { label: string; href: string }[] = []

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 px-6 md:px-12 flex items-center justify-between ${scrolled
            ? "h-16 bg-black/60 backdrop-blur-xl border-b border-white/10"
            : "h-24 bg-transparent"
          }`}
      >
        {/* Logo */}
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

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 uppercase text-white/70">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`transition-colors hover:text-amber-500 ${lang === "ko"
                  ? "text-[14px] font-extrabold tracking-wider" // 한글: 폰트 두께와 크기 동시 강화
                  : "text-[13px] font-bold tracking-widest"
                }`}
            >
              {link.label}
            </Link>
          ))}

          {/* 메뉴얼 버튼 */}
          <a
            href="/manual"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white/60 hover:text-amber-500 transition-colors"
            aria-label="메뉴얼"
          >
            <BookOpen size={14} />
            <span className="text-[12px] font-extrabold tracking-[0.15em]">
              {lang === "ko" ? "메뉴얼" : "Manual"}
            </span>
          </a>

          {/* 게시판 버튼 */}
          <Link
            href="/board"
            className="flex items-center gap-1.5 text-white/60 hover:text-amber-500 transition-colors"
          >
            <MessageSquare size={14} />
            <span className="text-[12px] font-extrabold tracking-[0.15em]">
              {lang === "ko" ? "게시판" : "Board"}
            </span>
          </Link>

          {/* 한영 전환 버튼 */}
          <button
            type="button"
            onClick={() => setLang((prev) => (prev === "ko" ? "en" : "ko"))}
            className="flex items-center gap-1.5 text-white/60 hover:text-amber-500 transition-colors"
            aria-label="언어 전환"
          >
            <Globe size={14} />
            <span className="text-[12px] font-extrabold tracking-[0.15em]">
              {lang === "ko" ? "ENG" : "KOR"}
            </span>
          </button>

          {/* Admin 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="flex items-center gap-2 border border-white/20 hover:border-amber-500/50 hover:bg-amber-500/10 px-5 py-2 rounded-full transition-all"
          >
            <Link href="/admin/login">
              <UserCircle size={16} />
              <span className="text-[13px] font-bold tracking-wider">Admin</span>
            </Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden p-2 text-white"
          onClick={() => setIsMenuOpen(true)}
          aria-label="메뉴 열기"
        >
          <Menu size={28} />
        </button>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between px-6 py-6">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/boryeong-lng-ci.png"
                alt="보령LNG터미널"
                width={160}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <button
              type="button"
              className="p-2 text-white"
              onClick={() => setIsMenuOpen(false)}
              aria-label="메뉴 닫기"
            >
              <X size={28} />
            </button>
          </div>
          <nav className="flex flex-col gap-6 px-8 pt-8 uppercase text-white/80">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`transition-colors hover:text-amber-500 ${lang === "ko"
                    ? "text-2xl font-extrabold tracking-normal"
                    : "text-xl font-bold tracking-widest"
                  }`}
              >
                {link.label}
              </Link>
            ))}

            {/* 메뉴얼 */}
            <a
              href="/manual"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 text-white/60 hover:text-amber-500 transition-colors text-sm mt-2 font-bold"
            >
              <BookOpen size={16} />
              {lang === "ko" ? "메뉴얼" : "Manual"}
            </a>

            {/* 게시판 */}
            <Link
              href="/board"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 text-white/60 hover:text-amber-500 transition-colors text-sm mt-2 font-bold"
            >
              <MessageSquare size={16} />
              {lang === "ko" ? "게시판" : "Board"}
            </Link>

            <button
              type="button"
              onClick={() => {
                setLang((prev) => (prev === "ko" ? "en" : "ko"));
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-2 text-white/60 hover:text-amber-500 transition-colors text-sm mt-2 font-bold"
            >
              <Globe size={16} />
              {lang === "ko" ? "VIEW IN ENGLISH (ENG)" : "한국어로 보기 (KOR)"}
            </button>

            <Link
              href="/admin/login"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 text-white/60 hover:text-amber-500 transition-colors text-sm mt-4 font-bold"
            >
              <UserCircle size={16} />
              Admin
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}
