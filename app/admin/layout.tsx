"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdminAuthProvider, useAdminAuth } from "@/hooks/use-admin-auth"
import { Button } from "@/components/ui/button"
import { Home, LogOut, LayoutDashboard, FileText, Calendar } from "lucide-react"

const bgStyle = {
  backgroundImage: "url('/images/lng-terminal-bg.jpg')",
  filter: 'brightness(0.3) blur(5px)'
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAdminAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user && pathname !== "/admin/login") {
      router.push("/admin/login")
    }
  }, [user, isLoading, pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user && pathname !== "/admin/login") {
    return null
  }

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden">
      
      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" style={bgStyle} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="container mx-auto px-6 flex h-20 items-center justify-between">
          <div className="flex items-center gap-8">
            <Image
              src="/images/boryeong-lng-ci.png"
              alt="보령LNG터미널"
              width={160}
              height={32}
              className="h-8 w-auto"
              priority
            />
            <div className="border-l border-white/20 pl-6 hidden md:block">
              <h1 className="text-lg font-black text-white">관리자 시스템</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">{user?.name}</p>
              <p className="text-xs text-white/40">{user?.username}</p>
            </div>
            <Button 
              onClick={logout}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2 rounded-xl transition-all"
            >
              <LogOut size={16} className="mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-lg">
        <div className="container mx-auto px-6">
          <div className="flex gap-2 py-3">
            <Link href="/">
              <Button 
                variant="ghost"
                className="text-white/60 hover:text-white hover:bg-white/10 font-bold rounded-lg transition-all"
              >
                <Home size={16} className="mr-2" />
                메인으로
              </Button>
            </Link>
            <Link href="/admin/dashboard">
              <Button 
                variant="ghost"
                className={`font-bold rounded-lg transition-all ${
                  pathname === "/admin/dashboard" 
                    ? "bg-amber-500 text-black hover:bg-amber-600 hover:text-black" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <LayoutDashboard size={16} className="mr-2" />
                대시보드
              </Button>
            </Link>
            <Link href="/admin/requests">
              <Button 
                variant="ghost"
                className={`font-bold rounded-lg transition-all ${
                  pathname === "/admin/requests" 
                    ? "bg-amber-500 text-black hover:bg-amber-600 hover:text-black" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <FileText size={16} className="mr-2" />
                신청 관리
              </Button>
            </Link>
            <Link href="/admin/calendar">
              <Button 
                variant="ghost"
                className={`font-bold rounded-lg transition-all ${
                  pathname === "/admin/calendar" 
                    ? "bg-amber-500 text-black hover:bg-amber-600 hover:text-black" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Calendar size={16} className="mr-2" />
                방문 캘린더
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">{children}</main>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  )
}
