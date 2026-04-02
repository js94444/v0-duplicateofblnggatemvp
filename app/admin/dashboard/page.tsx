"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  RefreshCw,
  TrendingUp,
  CalendarDays,
  Trophy,
  ArrowUpRight,
} from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

interface DashboardStats {
  totalApplications: number
  monthlyStats: {
    month: string
    count: number
    byType: Record<string, number>
    byStatus: Record<string, number>
  }[]
  typeStats: Record<string, number>
  statusStats: Record<string, number>
  organizationStats: { organization: string; count: number }[]
}

const TYPE_LABELS: Record<string, string> = {
  GROUP_VISIT: "단체방문",
  VISIT_R3: "개인방문",
  PORT_ACCESS: "항만출입",
}

const TYPE_DOT_COLORS: Record<string, string> = {
  GROUP_VISIT: "bg-violet-400",
  VISIT_R3: "bg-amber-400",
  PORT_ACCESS: "bg-emerald-400",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "접수 대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "신청 취소",
}

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  cancelled: Ban,
}

const STATUS_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  pending: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", glow: "shadow-amber-500/5" },
  approved: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", glow: "shadow-emerald-500/5" },
  rejected: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", glow: "shadow-red-500/5" },
  cancelled: { text: "text-white/40", bg: "bg-white/5", border: "border-white/10", glow: "" },
}

export default function AdminDashboardPage() {
  const { token } = useAdminAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        if (data.monthlyStats.length > 0) {
          setSelectedMonth(data.monthlyStats[0].month)
        }
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 bg-white/10 rounded-xl" />
          <Skeleton className="h-10 w-28 bg-white/10 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 bg-white/10 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 bg-white/10 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 bg-white/10 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-white/40">통계 데이터를 불러올 수 없습니다.</p>
          <Button onClick={fetchStats} className="mt-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  const selectedMonthData = stats.monthlyStats.find((m) => m.month === selectedMonth)
  const maxMonthCount = Math.max(...stats.monthlyStats.map((m) => m.count), 1)
  const maxOrgCount = Math.max(...stats.organizationStats.map((o) => o.count), 1)

  // 승인율 계산
  const approvalRate = stats.totalApplications > 0
    ? Math.round(((stats.statusStats.approved || 0) / stats.totalApplications) * 100)
    : 0

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">대시보드</h1>
          <p className="text-white/40 text-sm mt-1 font-medium">출입 신청 현황 및 통계</p>
        </div>
        <Button
          onClick={fetchStats}
          disabled={isRefreshing}
          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-5 py-2 rounded-xl transition-all active:scale-95"
        >
          <RefreshCw size={15} className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* Hero KPI Row — 전체 신청 크게 + 상태별 4개 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* 메인 KPI: 전체 신청 */}
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-white/5 to-transparent border border-amber-500/20 rounded-2xl p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-amber-500/20 p-2 rounded-lg">
                <BarChart3 size={18} className="text-amber-400" />
              </div>
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">전체 신청</span>
            </div>
            <div className="text-5xl sm:text-6xl font-black text-white tracking-tight">
              {stats.totalApplications.toLocaleString()}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <ArrowUpRight size={14} className="text-emerald-400" />
                <span className="text-sm text-emerald-400 font-bold">{approvalRate}%</span>
                <span className="text-xs text-white/30">승인율</span>
              </div>
            </div>
          </div>
        </div>

        {/* 상태별 카드 3개 (취소 제외) */}
        {["pending", "approved", "rejected"].map((status) => {
          const Icon = STATUS_ICONS[status]
          const colors = STATUS_COLORS[status]
          const count = stats.statusStats[status] || 0
          return (
            <div
              key={status}
              className={`${colors.bg} border ${colors.border} rounded-2xl p-5 flex flex-col justify-between shadow-lg ${colors.glow}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{STATUS_LABELS[status]}</span>
                <div className={`${colors.bg} p-2 rounded-lg border ${colors.border}`}>
                  <Icon size={16} className={colors.text} />
                </div>
              </div>
              <div className="mt-4">
                <div className={`text-3xl font-black ${colors.text}`}>{count.toLocaleString()}</div>
                <div className="w-full bg-white/5 rounded-full h-1 mt-3">
                  <div
                    className={`${status === "pending" ? "bg-amber-500" : status === "approved" ? "bg-emerald-500" : "bg-red-500"} h-1 rounded-full transition-all duration-700`}
                    style={{ width: `${stats.totalApplications > 0 ? Math.round((count / stats.totalApplications) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 차트 영역: 월별 바 차트 + 유형별 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 월별 신청 현황 — 세로 바 차트 */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
              <TrendingUp size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">월별 신청 추이</h3>
              <p className="text-white/30 text-xs">최근 6개월간 신청 건수</p>
            </div>
          </div>

          {/* 세로 바 차트 */}
          <div className="flex items-end justify-between gap-2 h-48 px-2">
            {stats.monthlyStats.slice(0, 6).reverse().map((month) => {
              const heightPct = Math.max((month.count / maxMonthCount) * 100, 4)
              const isMax = month.count === maxMonthCount && month.count > 0
              return (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className={`text-xs font-bold ${isMax ? "text-amber-400" : "text-white/50"}`}>
                    {month.count}
                  </span>
                  <div className="w-full flex justify-center">
                    <div
                      className={`w-full max-w-12 rounded-t-lg transition-all duration-700 ${isMax
                        ? "bg-gradient-to-t from-amber-600 to-amber-400 shadow-lg shadow-amber-500/20"
                        : "bg-gradient-to-t from-white/10 to-white/20 hover:from-white/15 hover:to-white/30"
                        }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/40 font-medium">
                    {month.month.replace(/^\d{4}-/, "")}월
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 신청 유형별 — 원형 비율 표시 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-violet-500/10 border border-violet-500/20 p-2 rounded-lg">
              <Users size={16} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">신청 유형 분포</h3>
              <p className="text-white/30 text-xs">유형별 비율</p>
            </div>
          </div>

          {/* 링 차트 시뮬레이션 */}
          <div className="flex justify-center mb-6">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {(() => {
                  const types = ["GROUP_VISIT", "VISIT_R3", "PORT_ACCESS"]
                  const colors = ["#8b5cf6", "#f59e0b", "#10b981"]
                  let offset = 0
                  const total = stats.totalApplications || 1
                  return types.map((type, i) => {
                    const count = stats.typeStats[type] || 0
                    const pct = (count / total) * 100
                    const circumference = 2 * Math.PI * 40
                    const dashLen = (pct / 100) * circumference
                    const dashGap = circumference - dashLen
                    const el = (
                      <circle
                        key={type}
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke={colors[i]}
                        strokeWidth="12"
                        strokeDasharray={`${dashLen} ${dashGap}`}
                        strokeDashoffset={-(offset / 100) * circumference}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                        opacity={0.85}
                      />
                    )
                    offset += pct
                    return el
                  })
                })()}
                <circle cx="50" cy="50" r="30" fill="#0a0a0a" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{stats.totalApplications}</span>
                <span className="text-[10px] text-white/30 uppercase tracking-wider">TOTAL</span>
              </div>
            </div>
          </div>

          {/* 범례 */}
          <div className="space-y-3">
            {["GROUP_VISIT", "VISIT_R3", "PORT_ACCESS"].map((type) => {
              const count = stats.typeStats[type] || 0
              const pct = stats.totalApplications > 0 ? Math.round((count / stats.totalApplications) * 100) : 0
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${TYPE_DOT_COLORS[type]}`} />
                    <span className="text-xs text-white/60 font-medium">{TYPE_LABELS[type]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/30">{pct}%</span>
                    <span className="text-xs text-white font-bold">{count}건</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 하단: 월별 상세 + 기관 순위 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 월별 상세 현황 */}
        {stats.monthlyStats.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                  <CalendarDays size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm">월별 상세</h3>
                  <p className="text-white/30 text-xs">선택한 월의 상세 통계</p>
                </div>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white text-xs rounded-xl h-8">
                  <SelectValue placeholder="월 선택" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  {stats.monthlyStats.map((month) => (
                    <SelectItem key={month.month} value={month.month} className="text-xs hover:bg-white/10">
                      {month.month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMonthData && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">유형별</p>
                  <div className="space-y-3">
                    {["GROUP_VISIT", "VISIT_R3", "PORT_ACCESS"].map((type) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${TYPE_DOT_COLORS[type]}`} />
                          <span className="text-xs text-white/60">{TYPE_LABELS[type]}</span>
                        </div>
                        <span className="text-xs font-bold text-white">{selectedMonthData.byType[type] || 0}건</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">상태별</p>
                  <div className="space-y-3">
                    {["pending", "approved", "rejected", "cancelled"].map((status) => {
                      const colors = STATUS_COLORS[status]
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <span className={`text-xs ${colors.text}`}>{STATUS_LABELS[status]}</span>
                          <span className="text-xs font-bold text-white">{selectedMonthData.byStatus[status] || 0}건</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 주요 방문 기관 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
              <Trophy size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">주요 방문 기관</h3>
              <p className="text-white/30 text-xs">방문 신청 상위 기관</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats.organizationStats.slice(0, 8).map((org, index) => {
              const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null
              return (
                <div key={org.organization} className="flex items-center gap-3">
                  <span className="text-sm w-6 shrink-0 text-center">
                    {medal || <span className="text-xs text-white/20 font-bold">{index + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium truncate ${index < 3 ? "text-white" : "text-white/60"}`}>
                        {org.organization}
                      </span>
                      <span className={`text-xs font-bold ml-2 shrink-0 ${index < 3 ? "text-amber-400" : "text-white/40"}`}>
                        {org.count}건
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-700 ${index === 0 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                          index === 1 ? "bg-white/30" :
                          index === 2 ? "bg-amber-500/40" : "bg-white/10"
                        }`}
                        style={{ width: `${Math.min((org.count / maxOrgCount) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
