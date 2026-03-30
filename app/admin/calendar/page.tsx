"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  APPLICATION_TYPE_LABELS,
  APPLICATION_STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from "@/lib/types"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users,
  Anchor,
  User,
  LayoutGrid,
  RefreshCw,
  Clock,
  Building2,
  Phone,
  FileText,
  MapPin,
  Car,
  UserCheck,
} from "lucide-react"

// 이벤트 바 렌더링을 위한 타입 (주(week) 단위)
interface EventBar {
  app: Application
  startCol: number
  span: number
  continueLeft: boolean
  continueRight: boolean
  row: number
}

interface WeekRow {
  days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[]
  eventBars: EventBar[]
}

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .then((d) => {
      const raw = d.data || d
      return raw.map((a: any) => ({ ...a, status: String(a.status ?? "").trim().toUpperCase() }))
    })

const TYPE_STYLES: Record<string, { bar: string; badge: string; dot: string; solid: string }> = {
  GROUP_VISIT: {
    bar: "bg-violet-500/90 hover:bg-violet-500 shadow-violet-500/20",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    dot: "bg-violet-400",
    solid: "bg-violet-500",
  },
  PORT_ACCESS: {
    bar: "bg-[#0298c2]/90 hover:bg-[#0298c2] shadow-[#0298c2]/20",
    badge: "bg-[#0298c2]/20 text-[#0298c2] border-[#0298c2]/30",
    dot: "bg-[#0298c2]",
    solid: "bg-[#0298c2]",
  },
  VISIT_R3: {
    bar: "bg-emerald-500/90 hover:bg-emerald-500 shadow-emerald-500/20",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
    solid: "bg-emerald-500",
  },
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  UNDER_REVIEW: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  APPROVED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  REJECTED: "bg-red-500/20 text-red-300 border-red-500/30",
}

function getVisitDateRange(app: Application): { start: Date | null; end: Date | null } {
  const a = app as any
  const rawStart = a.visit_start_date || a.access_start_datetime || null
  const rawEnd = a.visit_end_date || null
  const start = rawStart ? new Date(rawStart) : null
  const end = rawEnd ? new Date(rawEnd) : null
  return {
    start: start && !isNaN(start.getTime()) ? start : null,
    end: end && !isNaN(end.getTime()) ? end : null,
  }
}

function toDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getApplicantInfo(app: Application) {
  const a = app as any
  return {
    organization: a.visitor_organization || a.company_name || a.organization || "미상",
    contact: a.visitor_name || a.contact_name || a.applicant_name || "미상",
    phone: a.visitor_phone || a.contact_mobile || a.contact_phone || "-",
    contactName: a.contact_name || "-",
    contactMobile: a.contact_mobile || "-",
    accessArea: a.access_area || "-",
    vehicleNumber: a.vehicle_number || "",
    visitPurpose: a.visit_purpose || "-",
    detailedPurpose: a.detailed_purpose || "",
    companionCount: a.companions?.length || 0,
  }
}

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL")

  const { data: applications = [], isLoading, isValidating, mutate } = useSWR<Application[]>(
    "/api/admin/requests",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  // 주 단위로 달력 + 이벤트 바 계산
  const weekRows = useMemo<WeekRow[]>(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = toDay(new Date(firstDay))
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const today = toDay(new Date())

    const filtered = applications.filter((app) => {
      if (statusFilter !== "ALL" && app.status !== statusFilter) return false
      const { start } = getVisitDateRange(app)
      return !!start
    })

    const rows: WeekRow[] = []

    for (let week = 0; week < 6; week++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(startDate.getDate() + week * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const days = Array.from({ length: 7 }, (_, d) => {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + d)
        return {
          date: toDay(date),
          isCurrentMonth: date.getMonth() === month,
          isToday: date.getTime() === today.getTime(),
        }
      })

      const barsRaw: Omit<EventBar, "row">[] = []

      for (const app of filtered) {
        const { start, end } = getVisitDateRange(app)
        if (!start) continue
        const appEnd = end ? toDay(end) : toDay(start)
        const appStart = toDay(start)

        if (appEnd < weekStart || appStart > weekEnd) continue

        const clampedStart = appStart < weekStart ? weekStart : appStart
        const clampedEnd = appEnd > weekEnd ? weekEnd : appEnd

        const startCol = Math.round((clampedStart.getTime() - weekStart.getTime()) / 86400000)
        const endCol = Math.round((clampedEnd.getTime() - weekStart.getTime()) / 86400000)
        const span = endCol - startCol + 1

        barsRaw.push({
          app,
          startCol,
          span,
          continueLeft: appStart < weekStart,
          continueRight: appEnd > weekEnd,
        })
      }

      const rowOccupied: Record<number, number[]> = {}
      const bars: EventBar[] = barsRaw
        .sort((a, b) => {
          if (a.startCol !== b.startCol) return a.startCol - b.startCol
          return b.span - a.span
        })
        .map((bar) => {
          let row = 0
          while (true) {
            const cols = rowOccupied[row] || []
            const overlap = Array.from({ length: bar.span }, (_, i) => bar.startCol + i).some((c) => cols.includes(c))
            if (!overlap) break
            row++
          }
          if (!rowOccupied[row]) rowOccupied[row] = []
          for (let i = 0; i < bar.span; i++) rowOccupied[row].push(bar.startCol + i)
          return { ...bar, row }
        })

      rows.push({ days, eventBars: bars })
    }

    return rows
  }, [currentDate, applications, statusFilter])

  const stats = useMemo(() => {
    const filtered = statusFilter === "ALL" ? applications : applications.filter((a) => a.status === statusFilter)
    const monthApps = filtered.filter((app) => {
      const { start } = getVisitDateRange(app)
      if (!start) return false
      return start.getMonth() === currentDate.getMonth() && start.getFullYear() === currentDate.getFullYear()
    })
    return {
      total: monthApps.length,
      groupVisit: monthApps.filter((a) => a.type === "GROUP_VISIT").length,
      portAccess: monthApps.filter((a) => a.type === "PORT_ACCESS").length,
      visitR3: monthApps.filter((a) => a.type === "VISIT_R3").length,
    }
  }, [applications, currentDate, statusFilter])

  const navigateMonth = (dir: number) => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
  const monthOptions = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]

  const STAT_CARDS = [
    { label: "이번 달 총 신청", value: stats.total, icon: LayoutGrid, color: "text-white", bg: "bg-white/5", ring: "border-white/20" },
    { label: "단체방문신청", value: stats.groupVisit, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10", ring: "border-violet-500/30" },
    { label: "항만출입신청", value: stats.portAccess, icon: Anchor, color: "text-[#0298c2]", bg: "bg-[#0298c2]/10", ring: "border-[#0298c2]/30" },
    { label: "개인방문신청", value: stats.visitR3, icon: User, color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "border-emerald-500/30" },
  ]

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">방문 캘린더</h1>
          <p className="text-white/40 text-sm mt-1 font-medium">방문 기간별 현황 및 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ApplicationStatus | "ALL")}>
            <SelectTrigger className="w-28 sm:w-32 bg-white/5 border-white/10 text-white text-sm focus:ring-amber-500/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0a1628] border-white/10 text-white">
              <SelectItem value="ALL">전체</SelectItem>
              <SelectItem value="APPROVED">승인됨</SelectItem>
              <SelectItem value="PENDING">대기중</SelectItem>
              <SelectItem value="UNDER_REVIEW">검토중</SelectItem>
              <SelectItem value="REJECTED">반려됨</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCurrentDate(new Date())} size="sm" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm">오늘</Button>
          <Button onClick={() => mutate()} size="sm" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-3 sm:px-5 py-2 rounded-xl transition-all">
            <RefreshCw className={`w-4 h-4 sm:mr-2 ${isValidating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">새로고침</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 shrink-0">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg, ring }) => (
          <div key={label} className={`bg-white/5 backdrop-blur-xl border ${ring} rounded-2xl p-4 flex items-center gap-3 hover:bg-white/[0.07] transition-colors`}>
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              {isLoading ? <Skeleton className="h-7 w-10 bg-white/10 mb-1 rounded-lg" /> : (
                <div className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</div>
              )}
              <p className="text-white/40 text-[11px] sm:text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[32px] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button onClick={() => navigateMonth(-1)} size="sm" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white w-8 h-8 p-0 rounded-lg">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Select value={String(currentYear)} onValueChange={(v) => { const d = new Date(currentDate); d.setFullYear(Number(v)); setCurrentDate(d) }}>
              <SelectTrigger className="w-20 sm:w-24 h-8 bg-white/5 border-white/10 text-white text-sm font-bold focus:ring-amber-500/30 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a1628] border-white/10 text-white">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(currentMonth)} onValueChange={(v) => { const d = new Date(currentDate); d.setMonth(Number(v)); setCurrentDate(d) }}>
              <SelectTrigger className="w-16 sm:w-20 h-8 bg-white/5 border-white/10 text-white text-sm font-bold focus:ring-amber-500/30 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a1628] border-white/10 text-white">
                {monthOptions.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => navigateMonth(1)} size="sm" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white w-8 h-8 p-0 rounded-lg">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-white/30 text-xs hidden sm:inline">
            {statusFilter === "ALL" ? "전체" : APPLICATION_STATUS_LABELS[statusFilter as ApplicationStatus]} 신청
          </span>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
            <div key={day} className={`py-2 text-center text-[11px] font-bold tracking-widest ${i === 0 ? "text-red-400" : i === 6 ? "text-sky-400" : "text-white/50"}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Week rows */}
        <div className="flex-1 flex flex-col overflow-auto">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-white/[0.06] flex-1">
                {Array.from({ length: 7 }).map((_, di) => (
                  <div key={di} className="p-2 border-r border-white/[0.06] min-h-24">
                    <Skeleton className="h-6 w-6 bg-white/10 mb-2 rounded-full" />
                    <Skeleton className="h-5 w-full bg-white/5 rounded mb-1" />
                  </div>
                ))}
              </div>
            ))
          ) : (
            weekRows.map((week, wi) => {
              const maxRow = week.eventBars.length > 0 ? Math.max(...week.eventBars.map(b => b.row)) + 1 : 0

              const BAR_H = 24
              const BAR_GAP = 26

              return (
                <div key={wi} className="border-b border-white/[0.06] last:border-b-0 flex-1 relative" style={{ minHeight: `${40 + Math.max(maxRow * BAR_GAP + 4, 0)}px` }}>
                  {/* 날짜 숫자 행 */}
                  <div className="grid grid-cols-7">
                    {week.days.map((day, di) => {
                      const isSunday = di === 0
                      const isSaturday = di === 6
                      return (
                        <div
                          key={di}
                          className={`
                            border-r border-white/[0.06] last:border-r-0 pt-1.5 px-1.5 pb-0.5
                            ${!day.isCurrentMonth ? "bg-white/[0.01]" : ""}
                            ${day.isToday ? "bg-amber-500/[0.06]" : ""}
                          `}
                        >
                          <span className={`
                            text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors
                            ${day.isToday ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30" :
                              isSunday ? "text-red-400/80" :
                                isSaturday ? "text-sky-400/80" :
                                  day.isCurrentMonth ? "text-white/70" : "text-white/15"}
                          `}>
                            {day.date.getDate()}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* 이벤트 바 레이어 */}
                  <div className="relative overflow-hidden" style={{ minHeight: `${Math.max(maxRow * BAR_GAP + 4, 4)}px` }}>
                    {week.eventBars.map((bar, bi) => {
                      const ts = TYPE_STYLES[bar.app.type] || TYPE_STYLES.VISIT_R3
                      const info = getApplicantInfo(bar.app)
                      const clampedSpan = Math.min(bar.span, 7 - bar.startCol)
                      const leftPct = (bar.startCol / 7) * 100
                      const widthPct = (clampedSpan / 7) * 100
                      const padL = bar.continueLeft ? 0 : 3
                      const padR = bar.continueRight ? 0 : 3

                      return (
                        <div
                          key={bi}
                          onClick={() => setSelectedApp(bar.app)}
                          title={`${info.contact} / ${info.organization} / ${info.accessArea}`}
                          className={`
                            absolute cursor-pointer transition-all hover:shadow-md
                            ${ts.bar} text-white text-[11px] font-semibold
                            flex items-center overflow-hidden
                            ${bar.continueLeft ? "rounded-l-none" : "rounded-l-md"}
                            ${bar.continueRight ? "rounded-r-none" : "rounded-r-md"}
                          `}
                          style={{
                            top: `${bar.row * BAR_GAP + 2}px`,
                            left: `calc(${leftPct}% + ${padL}px)`,
                            width: `calc(${widthPct}% - ${padL + padR}px)`,
                            height: `${BAR_H}px`,
                          }}
                        >
                          <span className="truncate px-2 leading-none">
                            {info.contact}
                            {clampedSpan >= 2 && <span className="text-white/60 ml-1">/ {info.organization}</span>}
                            {clampedSpan >= 3 && info.companionCount > 0 && <span className="text-white/50 ml-1">+{info.companionCount}</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* 배경 격자 세로선 */}
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none top-0">
                    {week.days.map((_, di) => (
                      <div key={di} className="border-r border-white/[0.06] last:border-r-0" />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-4 sm:px-6 py-3 flex flex-wrap items-center gap-4 sm:gap-6 shrink-0">
        <span className="text-white/40 text-xs font-bold uppercase tracking-widest">범례</span>
        {Object.entries(TYPE_STYLES).map(([type, ts]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded ${ts.solid}`} />
            <span className="text-white/70 text-xs font-medium">{APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS]}</span>
          </div>
        ))}
      </div>

      {/* Detail Dialog — 정보 보강 */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="w-[95vw] max-w-lg bg-black/95 backdrop-blur-2xl border border-white/15 text-white shadow-2xl rounded-2xl sm:rounded-3xl p-0 overflow-hidden">
          {selectedApp && (() => {
            const { start, end } = getVisitDateRange(selectedApp)
            const info = getApplicantInfo(selectedApp)
            const ts = TYPE_STYLES[selectedApp.type] || TYPE_STYLES.VISIT_R3
            const ss = STATUS_STYLES[selectedApp.status] || STATUS_STYLES.PENDING
            const dateLabel = start
              ? end && end.toDateString() !== start.toDateString()
                ? `${start.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })} ~ ${end.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`
                : start.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })
              : "-"

            return (
              <>
                {/* 헤더 */}
                <div className="px-5 sm:px-6 pt-6 pb-4 border-b border-white/10 bg-white/[0.03]">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${ts.badge} border text-xs font-bold`}>{APPLICATION_TYPE_LABELS[selectedApp.type]}</Badge>
                    <Badge className={`${ss} border text-xs font-bold`}>{APPLICATION_STATUS_LABELS[selectedApp.status]}</Badge>
                  </div>
                  <DialogTitle className="text-xl sm:text-2xl font-black text-white">{info.contact}</DialogTitle>
                  <p className="text-white/40 text-sm font-mono mt-1">{(selectedApp as any).receipt}</p>
                </div>

                {/* 본문 */}
                <div className="px-5 sm:px-6 py-5 space-y-4">
                  {/* 기본정보 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-white/40" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">소속</p>
                        <p className="text-white/80 font-medium">{info.organization}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-white/40" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">연락처</p>
                        <p className="text-white/80 font-medium">{info.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-white/40" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">출입지역</p>
                        <p className="text-white/80 font-medium">{info.accessArea}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-white/40" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">방문기간</p>
                        <p className="text-white/80 font-medium">{dateLabel}</p>
                      </div>
                    </div>
                  </div>

                  {/* 담당자 / 동행인 / 차량 */}
                  <div className="pt-3 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 text-white/40" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">담당자</p>
                        <p className="text-white/80 font-medium">{info.contactName}</p>
                        {info.contactMobile !== "-" && <p className="text-white/40 text-xs">{info.contactMobile}</p>}
                      </div>
                    </div>
                    {info.companionCount > 0 && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-white/40" />
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider">동행인</p>
                          <p className="text-white/80 font-medium">{info.companionCount}명</p>
                        </div>
                      </div>
                    )}
                    {info.vehicleNumber && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <Car className="w-4 h-4 text-white/40" />
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider">차량</p>
                          <p className="text-white/80 font-medium">{info.vehicleNumber}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 방문 목적 */}
                  {info.visitPurpose !== "-" && (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <div className="flex items-start gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4 text-white/40" />
                        </div>
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider">방문목적</p>
                          <p className="text-white/80 font-medium">{info.visitPurpose}</p>
                          {info.detailedPurpose && (
                            <p className="text-white/50 text-xs mt-1 leading-relaxed">{info.detailedPurpose}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
