"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import useSWR from "swr"
import { AdminAuthProvider, useAdminAuth } from "@/hooks/use-admin-auth"
import { Button } from "@/components/ui/button"
import { Home, LogOut, LayoutDashboard, FileText, Calendar, Users, QrCode, MessageSquare } from "lucide-react"

// 전체 페이지 목록 (아이콘, 경로, 이름 정의)
const ALL_PAGES = [
  { path: "/admin/dashboard", name: "대시보드",    icon: LayoutDashboard },
  { path: "/admin/requests",  name: "신청 관리",   icon: FileText },
  { path: "/admin/calendar",  name: "방문 캘린더", icon: Calendar },
  { path: "/admin/qr",        name: "출입현황", icon: QrCode },
  { path: "/admin/board",     name: "게시판",     icon: MessageSquare },
  { path: "/admin/accounts",  name: "계정 관리",   icon: Users },
]

const bgStyle = {
  backgroundImage: "url('/images/hero-bg.jpg')",
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading, token } = useAdminAuth()
  const router = useRouter()
  const pathname = usePathname()

  // 권한 목록 조회 (로그인 상태일 때만)
  const { data: permData } = useSWR(
    user && token ? ["/api/admin/permissions", token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
    { revalidateOnFocus: false }
  )

  // 허용된 페이지 경로 Set
  const allowedPaths = useMemo(() => {
    if (!user) return new Set<string>()
    if (user.role === "super_admin") return new Set(ALL_PAGES.map((p) => p.path))
    if (!permData?.permissions) return new Set<string>()
    return new Set<string>(
      permData.permissions
        .filter((p: any) => p.allowed)
        .map((p: any) => p.page_path as string)
    )
  }, [user, permData])

  // 로그인 안 됐으면 로그인 페이지로
  useEffect(() => {
    if (!isLoading && !user && pathname !== "/admin/login") {
      router.push("/admin/login")
    }
  }, [user, isLoading, pathname, router])

  // 권한 없는 페이지 직접 접근 시 대시보드로 리다이렉트
  useEffect(() => {
    if (!user || pathname === "/admin/login" || !permData) return
    if (user.role === "super_admin") return
    const isProtected = ALL_PAGES.some((p) => pathname.startsWith(p.path))
    if (isProtected && !allowedPaths.has(pathname)) {
      router.push("/admin/dashboard")
    }
  }, [user, pathname, allowedPaths, permData, router])

  // 로딩 중이거나 로그인 안 된 상태에서는 로딩 UI만 표시 (컨텐츠 노출 방지)
  if (isLoading || (!user && pathname !== "/admin/login")) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  if (pathname === "/admin/login") return <>{children}</>

  // 허용된 페이지만 네비에 표시
  const visiblePages = ALL_PAGES.filter((p) => allowedPaths.has(p.path))

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      {/* Background */}
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
              <p className="text-xs text-white/40">
                {user?.role === "super_admin"
                  ? "슈퍼어드민"
                  : user?.role === "security"
                  ? "특수경비대"
                  : "담당자"}
              </p>
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
          <div className="flex items-center justify-between py-3">
            <div className="flex gap-2">
              <Link href="/">
                <Button
                  variant="ghost"
                  className="text-white/60 hover:text-white hover:bg-white/10 font-bold rounded-lg transition-all"
                >
                  <Home size={16} className="mr-2" />
                  메인으로
                </Button>
              </Link>
              {visiblePages.map(({ path, name, icon: Icon }) => (
                <Link key={path} href={path}>
                  <Button
                    variant="ghost"
                    className={`font-bold rounded-lg transition-all ${
                      pathname === path || pathname.startsWith(path + "/")
                        ? "bg-amber-500 text-black hover:bg-amber-600 hover:text-black"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon size={16} className="mr-2" />
                    {name}
                  </Button>
                </Link>
              ))}
            </div>
            <Link href="/scanner">
              <Button
                variant="ghost"
                className="text-white/60 hover:text-amber-500 hover:bg-white/10 font-bold rounded-lg transition-all border border-white/10"
              >
                <QrCode size={16} className="mr-2" />
                QR 스캐너
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
