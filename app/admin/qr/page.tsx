"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RefreshCw, ChevronLeft, ChevronRight, Calendar, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, addDays, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ko } from "date-fns/locale"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { ApplicationDetailModal } from "@/components/admin/application-detail-modal"
import { Application } from "@/lib/types"

interface ScanRow {
  scan_id?: number | null
  entry_scan_id?: number | null
  exit_scan_id?: number | null
  pass_id: string
  application_id: number
  companion_id: number | null
  card_number: string | null
  visitor_name: string | null
  visitor_phone: string | null
  visitor_organization: string | null
  contact_name: string | null
  access_area: string | null
  contact_mobile: string | null
  visitor_birth_date: string | null
  vehicle_number: string | null
  vehicle_model: string | null
  spark_arrestor: string | null
  visit_start_date: string | null
  visit_end_date: string | null
  portCertFiles: Array<{ file_url: string; file_name: string }>
  // 입장 데이터 (있으면)
  entry_at: string | null
  entry_device_id: string | null
  entry_scanned_ip: string | null
  scan_site: string | null
  // 퇴장 데이터 (있으면)
  exit_at: string | null
  exit_device_id: string | null
  exit_scanned_ip: string | null
  // 마지막 스캔 방향 및 횟수
  last_scan_direction: 'ENTRY' | 'EXIT' | null
  entry_count: number
  exit_count: number
  cycle_num: number | null  // 입장/퇴장 사이클 번호
  last_event_at: string
}

interface ScanStats {
  checkInCount: number       // 체크인: 현재 내부 체류 중 (입장O, 퇴장X)
  checkOutCount: number      // 체크아웃: 퇴장 완료 (입장O, 퇴장O)
  pendingCount: number       // 방문신청: 아직 입장 안 한 인원 (승인 - 입장스캔)
  totalApprovedCount: number // 전체: 승인된 인원 수
  reentryCount: number       // 전체: 재입장자 수 (당일 입장+퇴장 각 2회 이상)
}

type TabKind = "main" | "pier"
type PierKind = "1부두" | "2부두"

export default function AdminQrScanPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAdminAuth()
  const [activeTab, setActiveTab] = useState<TabKind>("main")
  const [pierTab, setPierTab] = useState<PierKind>("1부두")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [useRangeSearch, setUseRangeSearch] = useState(false)
  const [rangeStartDate, setRangeStartDate] = useState<Date | null>(null)
  const [rangeEndDate, setRangeEndDate] = useState<Date | null>(null)
  const [cardFilter, setCardFilter] = useState<"all" | "pending" | "checkIn" | "checkOut">("all")
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [portCertModal, setPortCertModal] = useState<{ open: boolean; files: Array<{ file_url: string; file_name: string }>; visitorName: string; birthDate: string }>({ open: false, files: [], visitorName: "", birthDate: "" })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [rangeStartCalendarOpen, setRangeStartCalendarOpen] = useState(false)
  const [rangeEndCalendarOpen, setRangeEndCalendarOpen] = useState(false)
  // 수동 체크인/아웃/재입장용 선택된 row 키 (pass_id-cycleNum 형태)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [manualActionLoading, setManualActionLoading] = useState(false)
  const [pierNameSearch, setPierNameSearch] = useState("")
  const [cardNumbers, setCardNumbers] = useState<Record<string, string>>({})
  const [cardNumberSaving, setCardNumberSaving] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const handleSaveCardNumbers = async () => {
    const updates = Object.entries(cardNumbers)
      .filter(([, val]) => val !== undefined && val !== "")
      .map(([pass_id, card_number]) => ({ pass_id, card_number }))
    if (updates.length === 0) {
      alert("저장할 카드번호가 없습니다.")
      return
    }
    setCardNumberSaving(true)
    try {
      const res = await fetch("/api/admin/card-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) throw new Error("저장 실패")
      alert(`${updates.length}건의 카드번호가 저장되었습니다.`)
      await mutate()
      setCardNumbers({})
    } catch (e) {
      alert("카드번호 저장 중 오류가 발생했습니다.")
    } finally {
      setCardNumberSaving(false)
    }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown size={13} className="inline ml-1 text-white/30" />
    return sortDir === "asc"
      ? <ChevronUp size={13} className="inline ml-1 text-amber-400" />
      : <ChevronDown size={13} className="inline ml-1 text-amber-400" />
  }

  const toggleRowSelection = (key: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAllRows = (rows: any[]) => {
    const allKeys = rows.map(r => `${r.pass_id}-${r.cycleNum ?? 0}`)
    const allSelected = allKeys.every(k => selectedRows.has(k))
    if (allSelected) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(allKeys))
    }
  }

  const handleManualAction = async (action: 'checkin' | 'checkout' | 'reentry', rows: any[]) => {
    const targetRows = rows.filter(r => selectedRows.has(`${r.pass_id}-${r.cycleNum ?? 0}`))
    if (targetRows.length === 0) {
      alert("처리할 방문자를 선택해주세요.")
      return
    }

    // 체크인 시 이미 입장+퇴장 완료된 행이 있으면 재입장 안내
    if (action === 'checkin') {
      const completedRows = targetRows.filter(r => r.lastEntryAt && r.lastExitAt)
      if (completedRows.length > 0) {
        alert("이미 입장/퇴장이 완료된 방문자입니다.\n재입장 버튼을 눌러주세요.")
        return
      }
    }

    // 체크아웃 시 입장 기록이 없는 행이 있으면 안내
    if (action === 'checkout') {
      const noEntryRows = targetRows.filter(r => !r.lastEntryAt)
      if (noEntryRows.length > 0) {
        alert("입장 기록이 없는 방문자가 있습니다.\n먼저 체크인을 해주세주요.")
        return
      }
    }

    setManualActionLoading(true)
    try {
      // 체크인: entry_scan_id로 UPDATE, 체크아웃: exit_scan_id로 UPDATE
      // 재입장: 새 행 INSERT
      const getScanId = (r: any) => {
        if (action === 'checkin') return r.entry_scan_id
        if (action === 'checkout') return r.exit_scan_id
        return null // reentry는 항상 INSERT
      }

      const withScanId = targetRows.filter(r => getScanId(r) && action !== 'reentry')
      const withoutScanId = targetRows.filter(r => !getScanId(r) || action === 'reentry')

      const body: any = {
        action,
        scan_site: scanSiteParam,
        scanIds: withScanId.map(r => getScanId(r)).filter(Boolean),
        passRows: withoutScanId.map(r => ({
          pass_id: r.pass_id,
          application_id: r.application_id,
          companion_id: r.companion_id ?? null,
          visitor_name: r.visitor_name || "",
          visitor_org: r.visitor_organization || "",
          contact_name: r.contact_name || "",
          access_area: r.access_area || "",
        })),
      }

      const res = await fetch("/api/admin/qr-scans/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(`처리 실패: ${err.error}`)
        return
      }

      const result = await res.json()
      alert(`${action === 'checkin' ? '체크인' : action === 'checkout' ? '체크아웃' : '재입장'} 처리 완료 (${result.affected}명)`)
      setSelectedRows(new Set())
      // 데이터 갱신
      mutate()
    } catch (e) {
      console.error("[v0] Manual action error:", e)
      alert("처리 중 오류가 발생했습니다.")
    } finally {
      setManualActionLoading(false)
    }
  }

  // SWR fetcher
  const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then(res => {
    if (!res.ok) throw new Error("데이터를 불러오는데 실패했습니다.")
    return res.json()
  })

  // SWR 파라미터 계산 (훅 호출 전에 정의해야 함)
  const scanSiteParam =
    activeTab === "main" ? "main" : pierTab === "1부두" ? "pier_1" : "pier_2"

  const dateParam = (useRangeSearch && rangeStartDate && rangeEndDate)
    ? `startDate=${format(rangeStartDate, "yyyy-MM-dd")}&endDate=${format(rangeEndDate, "yyyy-MM-dd")}`
    : `date=${format(selectedDate, "yyyy-MM-dd")}`

  // SWR로 데이터 fetching - 훅은 조기 return 전에 호출해야 함
  const { data: swrData, error, isLoading: loading, mutate } = useSWR(
    `/api/admin/qr-scans?scan_site=${scanSiteParam}&${dateParam}`,
    fetcher,
    {
      revalidateOnFocus: false, // 포커스 시 재요청 방지
      dedupingInterval: 5000,   // 5초 내 중복 요청 방지 (탭 전환 시 빠른 갱신)
    }
  )

  const scans: ScanRow[] = swrData?.data || []
  const stats: ScanStats | null = swrData?.stats || null

  // 로딩 중일 때 로딩 화면 표시
  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>
  }

  // 권한 체크는 layout.tsx의 allowedPaths 시스템에서 처리됨
  if (!user) {
    return null
  }

  // 새로고침 함수 - 날짜 내비게이션의 selectedDate 기준으로 새로고침
  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
      // 1. 상태를 먼저 초기화 (UI 반영용)
      setRangeStartDate(null)
      setRangeEndDate(null)
      setUseRangeSearch(false)

      // 2. 초기화될 URL을 직접 mutate에 전달
      // 이렇게 하면 현재 state와 상관없이 즉시 해당 API를 호출합니다.
      const defaultDateParam = `date=${format(selectedDate, "yyyy-MM-dd")}`
      const targetUrl = `/api/admin/qr-scans?scan_site=${scanSiteParam}&${defaultDateParam}`

      mutate(targetUrl)
    }
  }

  // 상세보기 모달용 application + 스캔이력 조회
  useEffect(() => {
    if (!selectedApplicationId) return
    const fetchApplication = async () => {
      setModalLoading(true)
      try {
        const [appRes, histRes] = await Promise.all([
          fetch(`/api/admin/applications/${selectedApplicationId}`),
          selectedPassId ? fetch(`/api/admin/scan-history/${encodeURIComponent(selectedPassId)}`) : Promise.resolve(null),
        ])
        if (appRes.ok) {
          const data = await appRes.json()
          setSelectedApplication(data)
        }
        if (histRes && histRes.ok) {
          const histData = await histRes.json()
          setScanHistory(histData.history || [])
        } else {
          setScanHistory([])
        }
      } catch (e) {
        console.error("Failed to fetch application:", e)
      } finally {
        setModalLoading(false)
      }
    }
    fetchApplication()
  }, [selectedApplicationId, selectedPassId])

  // DB에서 이미 매칭된 입장/퇴장 쌍을 그대로 사용 (간소화)
  const rowsByPerson = useMemo(() => {
    if (scans.length === 0) return []

    // DB에서 이미 entry_at/exit_at으로 매칭되어 있으므로 직접 변환만 수행
    return scans.map((row: ScanRow) => ({
      pass_id: row.pass_id,
      application_id: row.application_id,
      companion_id: row.companion_id,
      card_number: row.card_number,
      visitor_name: row.visitor_name,
      visitor_phone: row.visitor_phone,
      visitor_organization: row.visitor_organization,
      contact_name: row.contact_name,
      access_area: row.access_area,
      vehicle_number: row.vehicle_number,
      vehicle_model: row.vehicle_model,
      visitor_birth_date: row.visitor_birth_date,
      spark_arrestor: row.spark_arrestor,
      contact_mobile: row.contact_mobile,
      portCertFiles: row.portCertFiles || [],
      lastEntryAt: row.entry_at,
      lastExitAt: row.exit_at,
      lastScanDirection: row.last_scan_direction,
      entryCount: row.entry_count || 0,
      exitCount: row.exit_count || 0,
      cycleNum: row.cycle_num,
      lastEventAt: new Date(row.last_event_at).getTime(),
      visit_start_date: row.visit_start_date,
      visit_end_date: row.visit_end_date,
      // 수동 체크인/아웃용 scan_id
      entry_scan_id: row.entry_scan_id ? Number(row.entry_scan_id) : null,
      exit_scan_id: row.exit_scan_id ? Number(row.exit_scan_id) : null,
    }))
  }, [scans])

  // 카드 필터링된 리스트
  const filteredRows = useMemo(() => {
    let rows = rowsByPerson
    if (cardFilter === "pending") rows = rowsByPerson.filter(r => !r.lastEntryAt)
    else if (cardFilter === "checkIn") rows = rowsByPerson.filter(r => r.lastScanDirection === 'ENTRY')
    else if (cardFilter === "checkOut") rows = rowsByPerson.filter(r => r.lastScanDirection === 'EXIT')

    // 부두 탭 이름 검색 필터
    if (activeTab === "pier" && pierNameSearch.trim()) {
      const keyword = pierNameSearch.trim().toLowerCase()
      rows = rows.filter(r => (r.visitor_name || "").toLowerCase().includes(keyword))
    }

    if (!sortKey) return rows

    return [...rows].sort((a, b) => {
      let aVal: any
      let bVal: any
      if (sortKey === "visitor_name") { aVal = a.visitor_name || ""; bVal = b.visitor_name || "" }
      else if (sortKey === "visitor_organization") { aVal = a.visitor_organization || ""; bVal = b.visitor_organization || "" }
      else if (sortKey === "contact_name") { aVal = a.contact_name || ""; bVal = b.contact_name || "" }
      else if (sortKey === "access_area") { aVal = a.access_area || ""; bVal = b.access_area || "" }
      else if (sortKey === "lastEntryAt") { aVal = a.lastEntryAt ? new Date(a.lastEntryAt).getTime() : 0; bVal = b.lastEntryAt ? new Date(b.lastEntryAt).getTime() : 0 }
      else if (sortKey === "lastExitAt") { aVal = a.lastExitAt ? new Date(a.lastExitAt).getTime() : 0; bVal = b.lastExitAt ? new Date(b.lastExitAt).getTime() : 0 }
      else if (sortKey === "visitor_birth_date") { aVal = a.visitor_birth_date || ""; bVal = b.visitor_birth_date || "" }
      else return 0

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [rowsByPerson, cardFilter, sortKey, sortDir, activeTab, pierNameSearch])

  // 최근 10분 이내 스캔 여부
  const TEN_MINUTES_MS = 10 * 60 * 1000
  const getRecentHighlight = (row: (typeof rowsByPerson)[0]) => {
    const entryMs = row.lastEntryAt ? Date.now() - new Date(row.lastEntryAt).getTime() : Infinity
    const exitMs = row.lastExitAt ? Date.now() - new Date(row.lastExitAt).getTime() : Infinity
    const entryRecent = entryMs >= 0 && entryMs <= TEN_MINUTES_MS
    const exitRecent = exitMs >= 0 && exitMs <= TEN_MINUTES_MS
    if (!entryRecent && !exitRecent) return ""
    const lastIsExit = (row.lastExitAt ? new Date(row.lastExitAt).getTime() : 0) >= (row.lastEntryAt ? new Date(row.lastEntryAt).getTime() : 0)
    return lastIsExit ? "bg-red-500/30" : "bg-emerald-500/30"
  }

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    // DB에 KST로 저장되어 있으므로 UTC 필드를 그대로 사용
    const year = d.getUTCFullYear().toString().slice(-2)
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
    const day = d.getUTCDate().toString().padStart(2, '0')
    const hour = d.getUTCHours().toString().padStart(2, '0')
    const minute = d.getUTCMinutes().toString().padStart(2, '0')
    return `${year}. ${month}. ${day}. ${hour}:${minute}`
  }

  // 전화번호 포맷팅 (000-0000-0000 형식)
  const formatPhone = (phone: string | null) => {
    if (!phone) return "-"
    const cleaned = phone.replace(/[^0-9]/g, '')
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
    } else if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }
  // 방문일 포맷: YY.MM.DD~MM.DD
  const formatVisitPeriod = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return "-"
    const start = new Date(startDate)
    if (Number.isNaN(start.getTime())) return "-"

    const startYear = start.getUTCFullYear().toString().slice(-2)
    const startMonth = (start.getUTCMonth() + 1).toString().padStart(2, '0')
    const startDay = start.getUTCDate().toString().padStart(2, '0')

    if (!endDate) return `${startYear}.${startMonth}.${startDay}`

    const end = new Date(endDate)
    if (Number.isNaN(end.getTime())) return `${startYear}.${startMonth}.${startDay}`

    const endMonth = (end.getUTCMonth() + 1).toString().padStart(2, '0')
    const endDay = end.getUTCDate().toString().padStart(2, '0')

    // 같은 날짜면 단일 표시
    if (startDate === endDate) return `${startYear}.${startMonth}.${startDay}`

    return `${startYear}.${startMonth}.${startDay}~${endMonth}.${endDay}`
  }

  const currentStats: ScanStats = {
    // 체크인: 현재 내부 체류 중 (마지막 스캔이 ENTRY인 사람)
    checkInCount: stats?.checkInCount ?? rowsByPerson.filter(r => r.lastScanDirection === 'ENTRY').length,
    // 체크아웃: 퇴장 완료 (마지막 스캔이 EXIT인 사람)
    checkOutCount: stats?.checkOutCount ?? rowsByPerson.filter(r => r.lastScanDirection === 'EXIT').length,
    // 방문신청: 아직 입장 안 한 인원
    pendingCount: stats?.pendingCount ?? rowsByPerson.filter(r => !r.lastEntryAt).length,
    // 전체: 승인된 인원 수
    totalApprovedCount: stats?.totalApprovedCount ?? 0,
    // 재입장자 수
    reentryCount: stats?.reentryCount ?? 0,
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab("main")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "main"
                ? "bg-amber-500 text-black"
                : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
            >
              정문 출입현황
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pier")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "pier"
                ? "bg-amber-500 text-black"
                : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
            >
              부두 출입현황
            </button>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40 font-bold">
            {activeTab === "main" ? "정문 QR 스캔 · Visit Pass Scans" : "부두별 출입 이력"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 날짜 네비게이션 */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft size={18} />
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center h-8 px-3 text-white font-mono text-sm hover:bg-white/10 rounded-md transition-colors"
                >
                  <Calendar size={14} className="mr-2 text-white/60" />
                  {format(selectedDate, "yyyy-MM-dd")}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10 z-[100] text-white [&_button]:text-white [&_.rdp-weekday]:text-white/50 [&_.rdp-caption_label]:text-white [&_.rdp-day_outside]:text-white/20 [&_select]:text-white [&_select]:bg-zinc-800 [&_option]:bg-zinc-800" align="end" sideOffset={8}>
                <CalendarComponent
                  mode="single"
                  captionLayout="dropdown"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date)
                      setCalendarOpen(false)
                    }
                  }}
                  locale={ko}
                  className="rounded-md"
                  startMonth={new Date(2024, 0)}
                  endMonth={new Date(2030, 11)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
          <Button
            onClick={() => loadData(true)}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-5 py-2 rounded-xl transition-all active:scale-95"
          >
            <RefreshCw
              size={15}
              className={`mr-2 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "새로고침 중..." : "새로고침"}
          </Button>
        </div>
      </div>

      {/* 날짜 범위 검색 */}
      <div className="mb-6 flex items-center justify-end gap-2 flex-wrap">
        {/* 월 단위 빠른 선택 */}
        {(() => {
          const now = new Date()
          const months = [0, 1, 2, 3, 4, 5].map(i => subMonths(now, i))
          return months.map((m) => (
            <button
              key={m.toISOString()}
              type="button"
              onClick={() => {
                const start = startOfMonth(m)
                const end = endOfMonth(m)
                setRangeStartDate(start)
                setRangeEndDate(end)
                setUseRangeSearch(true)
              }}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all ${rangeStartDate && rangeEndDate
                && format(startOfMonth(m), "yyyy-MM") === format(rangeStartDate, "yyyy-MM")
                && format(endOfMonth(m), "yyyy-MM-dd") === format(rangeEndDate, "yyyy-MM-dd")
                ? "bg-amber-500 text-black"
                : "text-white/50 hover:text-white hover:bg-white/10 border border-white/10"
                }`}
            >
              {format(m, "M")}월
            </button>
          ))
        })()}
        <span className="text-white/20 mx-1">|</span>
        <span className="text-sm text-white/50">범위 검색</span>
        {/* 시작날짜 */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
          <Calendar size={14} className="text-white/60" />
          <Popover open={rangeStartCalendarOpen} onOpenChange={setRangeStartCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-7 px-2 font-mono text-sm hover:bg-white/10 rounded-md transition-colors ${rangeStartDate ? "text-white" : "text-white/30"}`}
              >
                {rangeStartDate ? format(rangeStartDate, "yyyy-MM-dd") : "시작날짜"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10 z-[100] text-white [&_button]:text-white [&_.rdp-weekday]:text-white/50 [&_.rdp-caption_label]:text-white [&_.rdp-day_outside]:text-white/20 [&_select]:text-white [&_select]:bg-zinc-800 [&_option]:bg-zinc-800" align="end" sideOffset={4}>
              <CalendarComponent
                mode="single"
                captionLayout="dropdown"
                selected={rangeStartDate ?? undefined}
                onSelect={(date) => {
                  if (date) {
                    setRangeStartDate(date)
                    if (rangeEndDate) setUseRangeSearch(true)
                    setRangeStartCalendarOpen(false)
                  }
                }}
                locale={ko}
                className="rounded-md"
                startMonth={new Date(2024, 0)}
                endMonth={new Date(2030, 11)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <span className="text-white/40 text-sm">~</span>

        {/* 종료날짜 */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
          <Calendar size={14} className="text-white/60" />
          <Popover open={rangeEndCalendarOpen} onOpenChange={setRangeEndCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-7 px-2 font-mono text-sm hover:bg-white/10 rounded-md transition-colors ${rangeEndDate ? "text-white" : "text-white/30"}`}
              >
                {rangeEndDate ? format(rangeEndDate, "yyyy-MM-dd") : "종료날짜"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10 z-[100] text-white [&_button]:text-white [&_.rdp-weekday]:text-white/50 [&_.rdp-caption_label]:text-white [&_.rdp-day_outside]:text-white/20 [&_select]:text-white [&_select]:bg-zinc-800 [&_option]:bg-zinc-800" align="end" sideOffset={4}>
              <CalendarComponent
                mode="single"
                captionLayout="dropdown"
                selected={rangeEndDate ?? undefined}
                onSelect={(date) => {
                  if (date) {
                    setRangeEndDate(date)
                    if (rangeStartDate) setUseRangeSearch(true)
                    setRangeEndCalendarOpen(false)
                  }
                }}
                locale={ko}
                className="rounded-md"
                startMonth={new Date(2024, 0)}
                endMonth={new Date(2030, 11)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* 범위 초기화 */}
        {(rangeStartDate || rangeEndDate) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-white/40 hover:text-white hover:bg-white/10 text-xs"
            onClick={() => {
              setRangeStartDate(null)
              setRangeEndDate(null)
              setUseRangeSearch(false)
            }}
          >
            초기화
          </Button>
        )}
      </div>

      {/* Summary cards: 정문 탭에서만 */}
      {activeTab === "main" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card
            className={`bg-white/5 border-white/10 text-white cursor-pointer transition-all hover:bg-white/10 ${cardFilter === "pending" ? "ring-2 ring-amber-500" : ""}`}
            onClick={() => setCardFilter(cardFilter === "pending" ? "all" : "pending")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60">방문 신청</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-amber-400">{currentStats.pendingCount.toLocaleString("ko-KR")}</p>
              <p className="text-xs text-white/40 mt-1">아직 입장 전</p>
            </CardContent>
          </Card>
          <Card
            className={`bg-white/5 border-white/10 text-white cursor-pointer transition-all hover:bg-white/10 ${cardFilter === "checkIn" ? "ring-2 ring-emerald-500" : ""}`}
            onClick={() => setCardFilter(cardFilter === "checkIn" ? "all" : "checkIn")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60">체크인</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-emerald-400">
                {currentStats.checkInCount.toLocaleString("ko-KR")}
              </p>
              <p className="text-xs text-white/40 mt-1">현재 내부 체류 중</p>
            </CardContent>
          </Card>
          <Card
            className={`bg-white/5 border-white/10 text-white cursor-pointer transition-all hover:bg-white/10 ${cardFilter === "checkOut" ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setCardFilter(cardFilter === "checkOut" ? "all" : "checkOut")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60">체크아웃</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-blue-400">
                {currentStats.checkOutCount.toLocaleString("ko-KR")}
              </p>
              <p className="text-xs text-white/40 mt-1">퇴장 완료</p>
            </CardContent>
          </Card>
          <Card
            className={`bg-white/5 border-white/10 text-white cursor-pointer transition-all hover:bg-white/10 ${cardFilter === "all" ? "ring-2 ring-white/50" : ""}`}
            onClick={() => setCardFilter("all")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60">전체</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-black">
                    {(currentStats.totalApprovedCount || 0).toLocaleString("ko-KR")}
                  </p>
                  <p className="text-xs text-white/40 mt-1">승인 인원</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white/40"></span>
                    <span className="text-xs text-white/50">신청</span>
                    <span className="text-sm font-bold text-white">{(currentStats.totalApprovedCount || 0).toLocaleString("ko-KR")}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span className="text-xs text-white/50">재입장</span>
                    <span className="text-sm font-bold text-purple-400">{(currentStats.reentryCount || 0).toLocaleString("ko-KR")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
        {activeTab === "main" && (
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">정문 출입 이력 ({filteredRows.length}명)</h2>
                  <p className="text-sm text-white/40 mt-1">
                    {cardFilter === "all" && "승인된 전체 방문자 목록"}
                    {cardFilter === "pending" && "아직 입장하지 않은 방문자 목록"}
                    {cardFilter === "checkIn" && "현재 내부 체류 중인 방문자 목록"}
                    {cardFilter === "checkOut" && "퇴장 완료된 방문자 목록"}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={cardNumberSaving || Object.keys(cardNumbers).length === 0}
                  onClick={handleSaveCardNumbers}
                  className="bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/50 text-amber-300 font-bold rounded-xl text-xs px-3 py-2"
                >
                  {cardNumberSaving ? "저장 중..." : "카드번호 저장"}
                </Button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedRows.size > 0 && (
                  <span className="text-xs text-white/50">{selectedRows.size}명 선택</span>
                )}
                <Button
                  size="sm"
                  disabled={manualActionLoading || selectedRows.size === 0}
                  onClick={() => handleManualAction('checkin', filteredRows)}
                  className="bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/50 text-emerald-300 font-bold rounded-xl text-xs px-3 py-2"
                >
                  체크인
                </Button>
                <Button
                  size="sm"
                  disabled={manualActionLoading || selectedRows.size === 0}
                  onClick={() => handleManualAction('checkout', filteredRows)}
                  className="bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/50 text-blue-300 font-bold rounded-xl text-xs px-3 py-2"
                >
                  체크아웃
                </Button>
                <Button
                  size="sm"
                  disabled={manualActionLoading || selectedRows.size === 0}
                  onClick={() => handleManualAction('reentry', filteredRows)}
                  className="bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/50 text-purple-300 font-bold rounded-xl text-xs px-3 py-2"
                >
                  재입장
                </Button>
              </div>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
                {error instanceof Error ? error.message : "데이터 로드 중 오류가 발생했습니다."}
              </div>
            )}

            {filteredRows.length === 0 && !loading ? (
              <div className="text-center py-12 text-white/40">표시할 출입 이력이 없습니다.</div>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 border border-white/5 rounded-lg p-3 bg-white/2">
                    <div className="w-24 h-8 bg-white/10 rounded animate-pulse" />
                    <div className="w-32 h-8 bg-white/10 rounded animate-pulse" />
                    <div className="flex-1 h-8 bg-white/10 rounded animate-pulse" />
                    <div className="w-24 h-8 bg-white/10 rounded animate-pulse" />
                    <div className="w-20 h-8 bg-white/10 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70 w-10">
                        <Checkbox
                          checked={filteredRows.length > 0 && filteredRows.every(r => selectedRows.has(`${r.pass_id}-${r.cycleNum ?? 0}`))}
                          onCheckedChange={() => toggleAllRows(filteredRows)}
                          className="border-white/30"
                        />
                      </TableHead>
                      <TableHead className="text-white/70 min-w-[90px] cursor-pointer select-none" onClick={() => handleSort("visitor_name")}>방문자<SortIcon col="visitor_name" /></TableHead>
                      <TableHead className="text-white/70 min-w-[100px] cursor-pointer select-none" onClick={() => handleSort("visitor_birth_date")}>생년월일<SortIcon col="visitor_birth_date" /></TableHead>
                      <TableHead className="text-white/70 min-w-[120px] cursor-pointer select-none" onClick={() => handleSort("visitor_organization")}>소속<SortIcon col="visitor_organization" /></TableHead>
                      <TableHead className="text-white/70 min-w-[80px]">카드번호</TableHead>
                      <TableHead className="text-white/70 min-w-[140px] cursor-pointer select-none" onClick={() => handleSort("contact_name")}>담당자<SortIcon col="contact_name" /></TableHead>
                      <TableHead className="text-white/70 min-w-[100px] cursor-pointer select-none" onClick={() => handleSort("access_area")}>출입구역<SortIcon col="access_area" /></TableHead>
                      <TableHead className="text-white/70 min-w-[140px] cursor-pointer select-none" onClick={() => handleSort("lastEntryAt")}>입장시각<SortIcon col="lastEntryAt" /></TableHead>
                      <TableHead className="text-white/70 min-w-[140px] cursor-pointer select-none" onClick={() => handleSort("lastExitAt")}>퇴장시각<SortIcon col="lastExitAt" /></TableHead>
                      <TableHead className="text-white/70 min-w-[90px]">차량번호</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">차량유종</TableHead>
                      <TableHead className="text-white/70 min-w-[70px] text-center">불꽃방지망<br />보유</TableHead>
                      <TableHead className="text-white/70 min-w-[120px]">방문일</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">상세</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => {
                      const recentClass = getRecentHighlight(row)
                      const rowKey = `${row.pass_id}-${row.cycleNum ?? 0}`
                      return (
                        <TableRow
                          key={`${row.pass_id}-${row.cycleNum || 0}`}
                          className={`border-white/5 hover:bg-white/5 transition-colors ${recentClass} ${selectedRows.has(rowKey) ? "bg-amber-500/5" : ""}`}
                        >
                          <TableCell className="w-10">
                            <Checkbox
                              checked={selectedRows.has(rowKey)}
                              onCheckedChange={() => toggleRowSelection(rowKey)}
                              className="border-white/30"
                            />
                          </TableCell>
                          <TableCell
                            className={`text-sm ${row.portCertFiles?.length ? 'text-blue-400 cursor-pointer hover:underline' : 'text-white/80'}`}
                            onClick={() => {
                              if (row.portCertFiles?.length) {
                                const bd = row.visitor_birth_date ? new Date(row.visitor_birth_date).toLocaleDateString("ko-KR") : ""
                                setPortCertModal({ open: true, files: row.portCertFiles, visitorName: row.visitor_name || "", birthDate: bd })
                              }
                            }}
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span>{row.visitor_name || "-"}</span>
                                {row.cycleNum && row.cycleNum > 1 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">
                                    {row.cycleNum}회차
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-white/40">
                                {formatPhone(row.visitor_phone)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {row.visitor_birth_date ? new Date(row.visitor_birth_date).toLocaleDateString("ko-KR") : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/60 max-w-[140px] truncate">
                            {row.visitor_organization || "-"}
                          </TableCell>
                          <TableCell>
                            <input
                              type="text"
                              value={cardNumbers[row.pass_id] ?? row.card_number ?? ""}
                              onChange={(e) => setCardNumbers(prev => ({ ...prev, [row.pass_id]: e.target.value }))}
                              placeholder="-"
                              className="w-24 h-7 px-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                            />
                          </TableCell>
                          <TableCell className="max-w-[140px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm truncate text-white/80">
                                {row.contact_name || "-"}
                              </span>
                              <span className="text-xs text-white/40">
                                {row.contact_mobile || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {row.access_area || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {formatDateTime(row.lastEntryAt)}
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {formatDateTime(row.lastExitAt)}
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {row.vehicle_number || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {row.vehicle_model || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-center text-white/80">
                            {row.spark_arrestor || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/60">
                            {formatVisitPeriod(row.visit_start_date, row.visit_end_date)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => {
                                // 모달을 즉시 렌더링해서 스켈레톤이 보이게 함
                                setModalLoading(true)
                                setSelectedApplicationId(row.application_id)
                                setSelectedPassId(row.pass_id)
                                setSelectedApplication(null)
                                setScanHistory([])
                              }}
                              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs px-2 py-1"
                            >
                              보기
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {activeTab === "pier" && (
          <>
            {/* 1부두/2부두 서브탭 */}
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setPierTab("1부두")}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${pierTab === "1부두"
                  ? "bg-amber-500 text-black"
                  : "text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                  }`}
              >
                1부두
              </button>
              <button
                type="button"
                onClick={() => setPierTab("2부두")}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${pierTab === "2부두"
                  ? "bg-amber-500 text-black"
                  : "text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                  }`}
              >
                2부두
              </button>
            </div>

            {/* 이름 검색 */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-white/60 shrink-0">이름 검색</span>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={pierNameSearch}
                onChange={e => setPierNameSearch(e.target.value)}
                className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 w-40"
              />
            </div>

            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">{pierTab} 출입 이력 ({filteredRows.length}명)</h2>
                <p className="text-sm text-white/40 mt-1">
                  {pierTab} 구역 방문자 출입 이력을 확인합니다.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedRows.size > 0 && (
                  <span className="text-xs text-white/50">{selectedRows.size}명 선택</span>
                )}
                <Button
                  size="sm"
                  disabled={manualActionLoading || selectedRows.size === 0}
                  onClick={() => handleManualAction('checkin', rowsByPerson)}
                  className="bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/50 text-emerald-300 font-bold rounded-xl text-xs px-3 py-2"
                >
                  체크인
                </Button>
                <Button
                  size="sm"
                  disabled={manualActionLoading || selectedRows.size === 0}
                  onClick={() => handleManualAction('checkout', rowsByPerson)}
                  className="bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/50 text-blue-300 font-bold rounded-xl text-xs px-3 py-2"
                >
                  체크아웃
                </Button>
                <Button
                  size="sm"
                  disabled={manualActionLoading || selectedRows.size === 0}
                  onClick={() => handleManualAction('reentry', rowsByPerson)}
                  className="bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/50 text-purple-300 font-bold rounded-xl text-xs px-3 py-2"
                >
                  재입장
                </Button>
              </div>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
                {error instanceof Error ? error.message : "데이터 로드 중 오류가 발생했습니다."}
              </div>
            )}

            {filteredRows.length === 0 && !loading ? (
              <div className="text-center py-12 text-white/40">표시할 출입 이력이 없습니다.</div>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 border border-white/5 rounded-lg p-3 bg-white/2">
                    <div className="w-24 h-8 bg-white/10 rounded animate-pulse" />
                    <div className="w-32 h-8 bg-white/10 rounded animate-pulse" />
                    <div className="flex-1 h-8 bg-white/10 rounded animate-pulse" />
                    <div className="w-24 h-8 bg-white/10 rounded animate-pulse" />
                    <div className="w-20 h-8 bg-white/10 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70 w-10">
                        <Checkbox
                          checked={filteredRows.length > 0 && filteredRows.every(r => selectedRows.has(`${r.pass_id}-${r.cycleNum ?? 0}`))}
                          onCheckedChange={() => toggleAllRows(filteredRows)}
                          className="border-white/30"
                        />
                      </TableHead>
                      <TableHead className="text-white/70 min-w-[90px] cursor-pointer select-none" onClick={() => handleSort("visitor_name")}>방문자<SortIcon col="visitor_name" /></TableHead>
                      <TableHead className="text-white/70 min-w-[100px] cursor-pointer select-none" onClick={() => handleSort("visitor_birth_date")}>생년월일<SortIcon col="visitor_birth_date" /></TableHead>
                      <TableHead className="text-white/70 min-w-[120px] cursor-pointer select-none" onClick={() => handleSort("visitor_organization")}>소속<SortIcon col="visitor_organization" /></TableHead>
                      <TableHead className="text-white/70 min-w-[80px]">카드번호</TableHead>
                      <TableHead className="text-white/70 min-w-[140px] cursor-pointer select-none" onClick={() => handleSort("contact_name")}>담당자<SortIcon col="contact_name" /></TableHead>
                      <TableHead className="text-white/70 min-w-[100px] cursor-pointer select-none" onClick={() => handleSort("access_area")}>출입구역<SortIcon col="access_area" /></TableHead>
                      <TableHead className="text-white/70 min-w-[140px] cursor-pointer select-none" onClick={() => handleSort("lastEntryAt")}>입장시각<SortIcon col="lastEntryAt" /></TableHead>
                      <TableHead className="text-white/70 min-w-[140px] cursor-pointer select-none" onClick={() => handleSort("lastExitAt")}>퇴장시각<SortIcon col="lastExitAt" /></TableHead>
                      <TableHead className="text-white/70 min-w-[90px]">차량번호</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">차량유종</TableHead>
                      <TableHead className="text-white/70 min-w-[70px] text-center">불꽃방지망<br />보유</TableHead>
                      <TableHead className="text-white/70 min-w-[120px]">방문일</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">상세</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => {
                      const recentClass = getRecentHighlight(row)
                      const rowKey = `${row.pass_id}-${row.cycleNum ?? 0}`
                      return (
                        <TableRow
                          key={`${row.pass_id}-${row.cycleNum || 0}`}
                          className={`border-white/5 hover:bg-white/5 transition-colors ${recentClass} ${selectedRows.has(rowKey) ? "bg-amber-500/5" : ""}`}
                        >
                          <TableCell className="w-10">
                            <Checkbox
                              checked={selectedRows.has(rowKey)}
                              onCheckedChange={() => toggleRowSelection(rowKey)}
                              className="border-white/30"
                            />
                          </TableCell>
                          <TableCell
                            className={`text-sm ${row.portCertFiles?.length ? 'text-blue-400 cursor-pointer hover:underline' : 'text-white/80'}`}
                            onClick={() => {
                              if (row.portCertFiles?.length) {
                                const bd = row.visitor_birth_date ? new Date(row.visitor_birth_date).toLocaleDateString("ko-KR") : ""
                                setPortCertModal({ open: true, files: row.portCertFiles, visitorName: row.visitor_name || "", birthDate: bd })
                              }
                            }}
                          >
                            {row.visitor_name || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {row.visitor_birth_date ? new Date(row.visitor_birth_date).toLocaleDateString("ko-KR") : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/60 max-w-[140px] truncate">
                            {row.visitor_organization || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {row.card_number || "-"}
                          </TableCell>
                          <TableCell className="max-w-[140px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm truncate text-white/80">
                                {row.contact_name || "-"}
                              </span>
                              <span className="text-xs text-white/40">
                                {row.contact_mobile || "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {row.access_area || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {formatDateTime(row.lastEntryAt)}
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {formatDateTime(row.lastExitAt)}
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {row.vehicle_number || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/80">
                            {row.vehicle_model || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-center text-white/80">
                            {row.spark_arrestor || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/60">
                            {formatVisitPeriod(row.visit_start_date, row.visit_end_date)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => {
                                // 모달을 즉시 렌더링해서 스켈레톤이 보이게 함
                                setModalLoading(true)
                                setSelectedApplicationId(row.application_id)
                                setSelectedPassId(row.pass_id)
                                setSelectedApplication(null)
                                setScanHistory([])
                              }}
                              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs px-2 py-1"
                            >
                              보기
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>

      {/* 상세보기 모달 */}
      {selectedApplicationId !== null && (
        <ApplicationDetailModal
          application={selectedApplication}
          open={selectedApplicationId !== null}
          loading={modalLoading}
          scanHistory={scanHistory}
          onClose={() => {
            setSelectedApplicationId(null)
            setSelectedApplication(null)
            setSelectedPassId(null)
            setModalLoading(false)
            setScanHistory([])
          }}
        />
      )}

      {/* 항만이수증 모달 */}
      {portCertModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPortCertModal({ open: false, files: [], visitorName: "" })}
        >
          <div
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {portCertModal.visitorName}{portCertModal.birthDate ? ` - ${portCertModal.birthDate}` : ""} - 항만이수증
              </h3>
              <button
                onClick={() => setPortCertModal({ open: false, files: [], visitorName: "" })}
                className="text-white/60 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {portCertModal.files.map((file, idx) => {
                // blob_url에서 파일명 추출하여 /api/files/ 경로로 변환
                const blobName = file.file_url.includes("/attachments/")
                  ? file.file_url.split("/attachments/")[1]?.split("?")[0]
                  : file.file_name
                const imageUrl = `/api/files/${encodeURIComponent(blobName || file.file_name)}`

                return (
                  <div
                    key={idx}
                    className="border border-white/20 rounded-lg overflow-hidden bg-black/40 p-2"
                  >
                    <img
                      src={imageUrl}
                      alt={file.file_name}
                      className="w-full h-auto object-contain max-h-[600px] rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                        const fallback = document.createElement("div")
                        fallback.className = "text-white/60 p-4 text-center"
                        fallback.innerHTML = `이미지를 불러올 수 없습니다.<br/><small>${file.file_name}</small>`
                        e.currentTarget.parentElement?.appendChild(fallback)
                      }}
                    />
                    <div className="text-white/50 text-xs p-2 break-words">
                      {file.file_name}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

