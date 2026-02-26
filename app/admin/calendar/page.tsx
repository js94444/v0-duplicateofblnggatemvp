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
} from "lucide-react"

// 이벤트 바 렌더링을 위한 타입 (주(week) 단위)
interface EventBar {
  app: Application
  startCol: number  // 0~6 (해당 주에서 시작 열)
  span: number      // 몇 칸에 걸쳐 있는지
  continueLeft: boolean  // 이전 주에서 이어지는 이벤트
  continueRight: boolean // 다음 주로 이어지는 이벤트
  row: number       // 같은 셀에서 몇 번째 줄
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
    bar: "bg-violet-500/90 hover:bg-violet-500",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    dot: "bg-violet-400",
    solid: "bg-violet-500",
  },
  PORT_ACCESS: {
    bar: "bg-[#0298c2]/90 hover:bg-[#0298c2]",
    badge: "bg-[#0298c2]/20 text-[#0298c2] border-[#0298c2]/30",
    dot: "bg-[#0298c2]",
    solid: "bg-[#0298c2]",
  },
  VISIT_R3: {
    bar: "bg-emerald-500/90 hover:bg-emerald-500",
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
    phone: a.visitor_phone || a.contact_mobile || a.contact_phone || "미상",
  }
}

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL")

  const { data: applications = [], isLoading, mutate } = useSWR<Application[]>(
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

    // 필터링된 앱 목록
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

      // 이 주에 걸치는 이벤트 계산
      const barsRaw: Omit<EventBar, "row">[] = []

      for (const app of filtered) {
        const { start, end } = getVisitDateRange(app)
        if (!start) continue
        const appEnd = end ? toDay(end) : toDay(start)
        const appStart = toDay(start)

        // 이 주와 겹치는지 확인
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

      // 같은 열에서 row(줄) 배정 (겹치지 않게)
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
  const monthLabel = currentDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })

  // 년도 목록: 현재 기준 ±5년
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
  const monthOptions = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"]

  const STAT_CARDS = [
    { label: "이번 달 총 신청", value: stats.total, icon: LayoutGrid, color: "text-white", ring: "border-white/20" },
    { label: "단체방문신청", value: stats.groupVisit, icon: Users, color: "text-violet-400", ring: "border-violet-500/30" },
    { label: "항만출입신청", value: stats.portAccess, icon: Anchor, color: "text-[#0298c2]", ring: "border-[#0298c2]/30" },
    { label: "개인방문신청", value: stats.visitR3, icon: User, color: "text-emerald-400", ring: "border-emerald-500/30" },
  ]

  return (
    <div className="container mx-auto px-6 flex flex-col h-full py-6 gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-[#0298c2]" />
            방문 캘린더
          </h1>
          <p className="text-white/40 text-sm mt-1">방문 기간별 현황 및 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ApplicationStatus | "ALL")}>
            <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white focus:ring-[#0298c2]/30">
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
          <Button onClick={() => setCurrentDate(new Date())} size="sm" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white">오늘</Button>
          <Button onClick={() => mutate()} size="sm" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, ring }) => (
          <div key={label} className={`bg-white/5 backdrop-blur-xl border ${ring} rounded-xl p-3 flex items-center gap-3`}>
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              {isLoading ? <Skeleton className="h-6 w-8 bg-white/10 mb-1" /> : (
                <div className={`text-2xl font-black ${color}`}>{value}</div>
              )}
              <p className="text-white/40 text-[11px]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-[#0d1e35] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/3">
          <div className="flex items-center gap-2">
            <Button onClick={() => navigateMonth(-1)} size="sm" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white w-8 h-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {/* 년도 선택 */}
            <Select value={String(currentYear)} onValueChange={(v) => { const d = new Date(currentDate); d.setFullYear(Number(v)); setCurrentDate(d) }}>
              <SelectTrigger className="w-24 h-8 bg-white/5 border-white/10 text-white text-sm font-bold focus:ring-[#0298c2]/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a1628] border-white/10 text-white">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* 월 선택 */}
            <Select value={String(currentMonth)} onValueChange={(v) => { const d = new Date(currentDate); d.setMonth(Number(v)); setCurrentDate(d) }}>
              <SelectTrigger className="w-20 h-8 bg-white/5 border-white/10 text-white text-sm font-bold focus:ring-[#0298c2]/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a1628] border-white/10 text-white">
                {monthOptions.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => navigateMonth(1)} size="sm" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white w-8 h-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-white/30 text-xs">
            {statusFilter === "ALL" ? "전체" : APPLICATION_STATUS_LABELS[statusFilter as ApplicationStatus]} 신청
          </span>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
            <div key={day} className={`py-1.5 text-center text-[11px] font-bold tracking-widest ${i === 0 ? "text-red-400" : i === 6 ? "text-sky-400" : "text-white/50"}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Week rows */}
        <div className="flex-1 flex flex-col overflow-auto">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-white/8 flex-1">
                {Array.from({ length: 7 }).map((_, di) => (
                  <div key={di} className="p-2 border-r border-white/8 min-h-24">
                    <Skeleton className="h-6 w-6 bg-white/10 mb-2 rounded-full" />
                    <Skeleton className="h-5 w-full bg-white/5 rounded mb-1" />
                  </div>
                ))}
              </div>
            ))
          ) : (
            weekRows.map((week, wi) => {
              // 이 주의 최대 row 수 계산 (셀 높이 결정)
              const maxRow = week.eventBars.length > 0 ? Math.max(...week.eventBars.map(b => b.row)) + 1 : 0

              const BAR_H = 20  // 이벤트 바 높이
              const BAR_GAP = 22 // 이벤트 바 간격(row stride)

              return (
                <div key={wi} className="border-b border-white/8 last:border-b-0 flex-1 relative" style={{ minHeight: `${36 + Math.max(maxRow * BAR_GAP + 4, 0)}px` }}>
                  {/* 날짜 숫자 행 */}
                  <div className="grid grid-cols-7">
                    {week.days.map((day, di) => {
                      const isSunday = di === 0
                      const isSaturday = di === 6
                      return (
                        <div
                          key={di}
                          className={`
                            border-r border-white/8 last:border-r-0 pt-1.5 px-1.5 pb-0.5
                            ${!day.isCurrentMonth ? "bg-white/[0.01]" : ""}
                            ${day.isToday ? "bg-[#0298c2]/8" : ""}
                          `}
                        >
                          <span className={`
                            text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                            ${day.isToday ? "bg-[#0298c2] text-white shadow-lg" :
                              isSunday ? "text-red-400" :
                              isSaturday ? "text-sky-400" :
                              day.isCurrentMonth ? "text-white/80" : "text-white/20"}
                          `}>
                            {day.date.getDate()}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* 이벤트 바 레이어 - overflow:hidden 으로 격자 밖으로 삐져나가지 않게 */}
                  <div className="relative overflow-hidden" style={{ minHeight: `${Math.max(maxRow * BAR_GAP + 4, 4)}px` }}>
                    {week.eventBars.map((bar, bi) => {
                      const ts = TYPE_STYLES[bar.app.type] || TYPE_STYLES.VISIT_R3
                      const info = getApplicantInfo(bar.app)
                      // span이 7을 넘지 않도록 클램핑
                      const clampedSpan = Math.min(bar.span, 7 - bar.startCol)
                      const leftPct = (bar.startCol / 7) * 100
                      const widthPct = (clampedSpan / 7) * 100
                      const padL = bar.continueLeft ? 0 : 2
                      const padR = bar.continueRight ? 0 : 2

                      return (
                        <div
                          key={bi}
                          onClick={() => setSelectedApp(bar.app)}
                          title={`${info.contact} / ${info.organization}`}
                          className={`
                            absolute cursor-pointer transition-opacity hover:opacity-90
                            ${ts.bar} text-white text-[10px] font-semibold
                            flex items-center overflow-hidden
                            ${bar.continueLeft ? "rounded-l-none" : "rounded-l-sm"}
                            ${bar.continueRight ? "rounded-r-none" : "rounded-r-sm"}
                          `}
                          style={{
                            top: `${bar.row * BAR_GAP + 2}px`,
                            left: `calc(${leftPct}% + ${padL}px)`,
                            width: `calc(${widthPct}% - ${padL + padR}px)`,
                            height: `${BAR_H}px`,
                          }}
                        >
                          <span className="truncate px-1.5 leading-none">
                            {info.contact}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* 배경 격자 세로선 */}
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none top-0">
                    {week.days.map((_, di) => (
                      <div key={di} className="border-r border-white/8 last:border-r-0" />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-2 flex flex-wrap items-center gap-5 shrink-0">
        <span className="text-white/40 text-xs font-bold uppercase tracking-widest">범례</span>
        {Object.entries(TYPE_STYLES).map(([type, ts]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${ts.solid}`} />
            <span className="text-white/70 text-xs font-medium">{APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS]}</span>
          </div>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-lg bg-[#0a1628]/95 backdrop-blur-2xl border border-white/10 text-white shadow-2xl rounded-3xl">
          {selectedApp && (() => {
            const { start, end } = getVisitDateRange(selectedApp)
            const info = getApplicantInfo(selectedApp)
            const ts = TYPE_STYLES[selectedApp.type] || TYPE_STYLES.VISIT_R3
            const ss = STATUS_STYLES[selectedApp.status] || STATUS_STYLES.PENDING
            const dateLabel = start
              ? end && end.toDateString() !== start.toDateString()
                ? `${start.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} ~ ${end.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`
                : start.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
              : "-"

            return (
              <>
                <DialogHeader className="pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`${ts.badge} border text-xs font-bold`}>{APPLICATION_TYPE_LABELS[selectedApp.type]}</Badge>
                    <Badge className={`${ss} border text-xs font-bold`}>{APPLICATION_STATUS_LABELS[selectedApp.status]}</Badge>
                  </div>
                  <DialogTitle className="text-xl font-black text-white">{info.contact}</DialogTitle>
                  <p className="text-white/40 text-sm font-mono">{(selectedApp as any).receipt}</p>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                  <div className="flex items-center gap-2 text-white/70">
                    <Building2 className="w-4 h-4 text-white/40 shrink-0" />
                    <span>{info.organization}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Phone className="w-4 h-4 text-white/40 shrink-0" />
                    <span>{info.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 col-span-2">
                    <Clock className="w-4 h-4 text-white/40 shrink-0" />
                    <span>{dateLabel}</span>
                  </div>
                  {(selectedApp as any).visit_purpose && (
                    <div className="flex items-start gap-2 text-white/60 col-span-2 pt-2 border-t border-white/10">
                      <FileText className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                      <span>{(selectedApp as any).visit_purpose}</span>
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
