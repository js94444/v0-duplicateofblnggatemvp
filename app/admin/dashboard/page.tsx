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
  Building2,
  RefreshCw,
  TrendingUp,
  CalendarDays,
} from "lucide-react"

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

const TYPE_COLORS: Record<string, string> = {
  GROUP_VISIT: "bg-[#0298c2]",
  VISIT_R3: "bg-amber-500",
  PORT_ACCESS: "bg-emerald-500",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "접수 대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "신청 취소",
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400",
  approved: "text-emerald-400",
  rejected: "text-red-400",
  cancelled: "text-white/40",
}

export default function AdminDashboardPage() {
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
      const response = await fetch("/api/admin/stats")
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

  const glassCard = "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl"

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 bg-white/10 rounded-xl" />
            <Skeleton className="h-4 w-56 bg-white/10 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 bg-white/10 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 bg-white/10 rounded-2xl" />
          <Skeleton className="h-72 bg-white/10 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-6 py-10">
        <div className={`${glassCard} p-12 text-center`}>
          <p className="text-white/40">통계 데이터를 불러올 수 없습니다.</p>
          <Button onClick={fetchStats} className="mt-4 bg-[#0298c2] hover:bg-[#0280a8] text-white rounded-xl">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  const selectedMonthData = stats.monthlyStats.find((m) => m.month === selectedMonth)
  const maxMonthCount = Math.max(...stats.monthlyStats.map((m) => m.count), 1)
  const maxOrgCount = Math.max(...stats.organizationStats.map((o) => o.count), 1)

  const overviewCards = [
    {
      label: "전체 신청",
      value: stats.totalApplications,
      sub: "총 신청 건수",
      icon: BarChart3,
      color: "text-[#0298c2]",
      bg: "bg-[#0298c2]/10",
      border: "border-[#0298c2]/20",
    },
    {
      label: "접수 대기",
      value: stats.statusStats.pending || 0,
      sub: "처리 대기 중",
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "승인",
      value: stats.statusStats.approved || 0,
      sub: "승인된 신청",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "반려",
      value: stats.statusStats.rejected || 0,
      sub: "반려된 신청",
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      label: "신청 취소",
      value: stats.statusStats.cancelled || 0,
      sub: "취소된 신청",
      icon: Ban,
      color: "text-white/40",
      bg: "bg-white/5",
      border: "border-white/10",
    },
  ]

  return (
    <div className="container mx-auto px-6 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">대시보드</h1>
          <p className="text-white/40 text-sm mt-1 font-medium">출입 신청 현황 및 통계</p>
        </div>
        <Button
          onClick={fetchStats}
          disabled={isRefreshing}
          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-5 py-2 rounded-xl transition-all"
        >
          <RefreshCw size={15} className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className={`${glassCard} ${card.border} p-5 flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{card.label}</span>
                <div className={`${card.bg} p-2 rounded-lg`}>
                  <Icon size={16} className={card.color} />
                </div>
              </div>
              <div>
                <div className={`text-3xl font-black ${card.color}`}>{card.value.toLocaleString()}</div>
                <p className="text-xs text-white/30 mt-1">{card.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 월별 신청 현황 */}
        <div className={`${glassCard} p-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#0298c2]/10 border border-[#0298c2]/20 p-2 rounded-lg">
              <TrendingUp size={16} className="text-[#0298c2]" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">월별 신청 현황</h3>
              <p className="text-white/30 text-xs">최근 6개월간 신청 건수</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats.monthlyStats.slice(0, 6).map((month) => (
              <div key={month.month} className="flex items-center gap-3">
                <span className="text-xs text-white/50 w-16 shrink-0 font-medium">{month.month}</span>
                <div className="flex-1 bg-white/5 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#0298c2] to-[#02c5a0] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((month.count / maxMonthCount) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-white/60 w-6 text-right font-bold">{month.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 신청 유형별 현황 */}
        <div className={`${glassCard} p-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
              <Users size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">신청 유형별 현황</h3>
              <p className="text-white/30 text-xs">전체 신청 유형 분포</p>
            </div>
          </div>
          <div className="space-y-4">
            {["GROUP_VISIT", "VISIT_R3", "PORT_ACCESS"].map((type) => {
              const count = stats.typeStats[type] || 0
              const pct = stats.totalApplications > 0 ? Math.round((count / stats.totalApplications) * 100) : 0
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/60 font-medium">{TYPE_LABELS[type]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/30">{pct}%</span>
                      <span className="text-xs text-white font-bold">{count}건</span>
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div
                      className={`${TYPE_COLORS[type]} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 범례 */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/5">
            {["GROUP_VISIT", "VISIT_R3", "PORT_ACCESS"].map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[type]}`} />
                <span className="text-xs text-white/40">{TYPE_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Detail + Top Organizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 월별 상세 현황 */}
        {stats.monthlyStats.length > 0 && (
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                  <CalendarDays size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm">월별 상세 현황</h3>
                  <p className="text-white/30 text-xs">특정 월의 상세 통계</p>
                </div>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white text-xs rounded-xl h-8">
                  <SelectValue placeholder="월 선택" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1628] border-white/10 text-white">
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
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">신청 유형별</p>
                  <div className="space-y-2.5">
                    {["GROUP_VISIT", "VISIT_R3", "PORT_ACCESS"].map((type) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[type]}`} />
                          <span className="text-xs text-white/60">{TYPE_LABELS[type]}</span>
                        </div>
                        <span className="text-xs font-bold text-white">{selectedMonthData.byType[type] || 0}건</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">처리 상태별</p>
                  <div className="space-y-2.5">
                    {["pending", "approved", "rejected", "cancelled"].map((status) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className={`text-xs ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
                        <span className="text-xs font-bold text-white">{selectedMonthData.byStatus[status] || 0}건</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 주요 방문 기관 */}
        <div className={`${glassCard} p-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded-lg">
              <Building2 size={16} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">주요 방문 기관</h3>
              <p className="text-white/30 text-xs">방문 신청이 많은 기관 순위</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats.organizationStats.slice(0, 8).map((org, index) => (
              <div key={org.organization} className="flex items-center gap-3">
                <span className={`text-xs font-black w-5 shrink-0 ${index < 3 ? "text-amber-400" : "text-white/20"}`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/70 font-medium truncate">{org.organization}</span>
                    <span className="text-xs font-bold text-white ml-2 shrink-0">{org.count}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        index === 0 ? "bg-amber-500" : index === 1 ? "bg-amber-500/70" : index === 2 ? "bg-amber-500/50" : "bg-white/20"
                      }`}
                      style={{ width: `${Math.min((org.count / maxOrgCount) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
