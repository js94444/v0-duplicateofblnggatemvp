"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"
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
        <div className="hidden md:flex items-center text-white/70" style={{ gap: "24px" }}>
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-amber-500 font-bold"
              style={{ fontSize: "15px", letterSpacing: "0.04em" }}
            >
              {link.label}
            </Link>
          ))}

          {/* 이용안내 */}
          <Link
            href="/manual"
            className="text-white/70 hover:text-white transition-colors font-normal"
            style={{ fontSize: "15px" }}
          >
            {lang === "ko" ? "이용안내" : "User Guide"}
          </Link>

          {/* 게시판 */}
          <Link
            href="/board"
            className="text-white/70 hover:text-white transition-colors font-normal"
            style={{ fontSize: "15px" }}
          >
            {lang === "ko" ? "게시판" : "Board"}
          </Link>

          {/* 한영 전환 — 항상 영문이므로 기본 자간 */}
          <button
            type="button"
            onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            className="text-white/70 hover:text-white transition-colors font-normal"
            style={{ fontSize: "15px", letterSpacing: "normal" }}
            aria-label="언어 전환"
          >
            {lang === "ko" ? "ENG" : "KOR"}
          </button>

          {/* Admin — CTA 역할로 두께 유지 */}
          <Link
            href="/admin/login"
            className="text-white hover:text-amber-500 transition-colors font-semibold border border-white/20 hover:border-amber-500/50 hover:bg-amber-500/10 px-5 py-2 rounded-full"
            style={{ fontSize: "15px", letterSpacing: "normal" }}
          >
            ADMIN
          </Link>
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

            {/* 이용안내 */}
            <Link
              href="/manual"
              onClick={() => setIsMenuOpen(false)}
              className="text-white/70 hover:text-white transition-colors mt-2 font-normal"
              style={{ fontSize: "15px" }}
            >
              {lang === "ko" ? "이용안내" : "User Guide"}
            </Link>

            {/* 게시판 */}
            <Link
              href="/board"
              onClick={() => setIsMenuOpen(false)}
              className="text-white/70 hover:text-white transition-colors mt-2 font-normal"
              style={{ fontSize: "15px" }}
            >
              {lang === "ko" ? "게시판" : "Board"}
            </Link>

            <button
              type="button"
              onClick={() => {
                setLang(lang === "ko" ? "en" : "ko");
                setIsMenuOpen(false);
              }}
              className="text-white/70 hover:text-white transition-colors mt-2 font-normal text-left"
              style={{ fontSize: "15px", letterSpacing: "normal" }}
            >
              {lang === "ko" ? "ENG" : "KOR"}
            </button>

            <Link
              href="/admin/login"
              onClick={() => setIsMenuOpen(false)}
              className="text-white hover:text-amber-500 transition-colors mt-4 font-semibold"
              style={{ fontSize: "15px", letterSpacing: "normal" }}
            >
              ADMIN
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}
