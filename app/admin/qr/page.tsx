"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCw, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, addDays, subDays } from "date-fns"
import { ko } from "date-fns/locale"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { ApplicationDetailModal } from "@/components/admin/application-detail-modal"
import { Application } from "@/lib/types"

interface ScanRow {
  pass_id: string
  application_id: number
  companion_id: number | null
  visitor_name: string | null
  visitor_org: string | null
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
  const [modalLoading, setModalLoading] = useState(false)
  const [portCertModal, setPortCertModal] = useState<{ open: boolean; files: Array<{ file_url: string; file_name: string }>; visitorName: string; birthDate: string }>({ open: false, files: [], visitorName: "", birthDate: "" })
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [rangeStartCalendarOpen, setRangeStartCalendarOpen] = useState(false)
  const [rangeEndCalendarOpen, setRangeEndCalendarOpen] = useState(false)

  // SWR fetcher
  const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then(res => {
    if (!res.ok) throw new Error("데이터를 불러오는데 실패했습니다.")
    return res.json()
  })

  // 슈퍼어드민만 접근 가능
  useEffect(() => {
    if (!authLoading && user?.role !== "super_admin") {
      router.push("/admin/dashboard")
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>
  }

  if (user?.role !== "super_admin") {
    return null
  }

  const scanSiteParam =
    activeTab === "main" ? "main" : pierTab === "1부두" ? "pier_1" : "pier_2"

  const dateParam = (useRangeSearch && rangeStartDate && rangeEndDate)
    ? `startDate=${format(rangeStartDate, "yyyy-MM-dd")}&endDate=${format(rangeEndDate, "yyyy-MM-dd")}`
    : `date=${format(selectedDate, "yyyy-MM-dd")}`

  // SWR로 데이터 fetching - 캐시가 자동으로 유지됨
  const { data: swrData, error, isLoading: loading, mutate } = useSWR(
    `/api/admin/qr-scans?scan_site=${scanSiteParam}&${dateParam}`,
    fetcher,
    {
      revalidateOnFocus: false, // 포커스 시 재요청 방지
      dedupingInterval: 30000,  // 30초 내 중복 요청 방지
    }
  )

  const scans: ScanRow[] = swrData?.data || []
  const stats: ScanStats | null = swrData?.stats || null

  // 새로고침 함수
  const loadData = (forceRefresh = false) => {
    if (forceRefresh) {
      mutate()
    }
  }

  // 상세보기 모달용 application 조회
  useEffect(() => {
    if (!selectedApplicationId) return
    const fetchApplication = async () => {
      setModalLoading(true)
      try {
        const res = await fetch(`/api/admin/applications/${selectedApplicationId}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedApplication(data)
        }
      } catch (e) {
        console.error("Failed to fetch application:", e)
      } finally {
        setModalLoading(false)
      }
    }
    fetchApplication()
  }, [selectedApplicationId])

  // DB에서 이미 매칭된 입장/퇴장 쌍을 그대로 사용 (간소화)
  const rowsByPerson = useMemo(() => {
    if (scans.length === 0) return []

    // DB에서 이미 entry_at/exit_at으로 매칭되어 있으므로 직접 변환만 수행
    return scans.map((row: ScanRow) => ({
      pass_id: row.pass_id,
      application_id: row.application_id,
      visitor_name: row.visitor_name,
      visitor_org: row.visitor_org,
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
      lastEventAt: new Date(row.last_event_at).getTime(),
      visit_start_date: row.visit_start_date,
      visit_end_date: row.visit_end_date,
    }))
  }, [scans])

  // 카드 필터링된 리스트
  const filteredRows = useMemo(() => {
    if (cardFilter === "all") return rowsByPerson
    // 방문신청: 아직 입장 안 한 인원 (입장 스캔 기록 없음)
    if (cardFilter === "pending") return rowsByPerson.filter(r => !r.lastEntryAt)
    // 체크인: 현재 내부 체류 중 (입장O, 퇴장X)
    if (cardFilter === "checkIn") return rowsByPerson.filter(r => r.lastEntryAt && !r.lastExitAt)
    // 체크아웃: 퇴장 완료 (입장O, 퇴장O)
    if (cardFilter === "checkOut") return rowsByPerson.filter(r => r.lastEntryAt && r.lastExitAt)
    return rowsByPerson
  }, [rowsByPerson, cardFilter])

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
    // DB에 이미 한국시간으로 저장되어 있으므로 UTC로 파싱하여 그대로 표시
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"

    // UTC 시간 그대로 사용 (DB 저장값이 이미 KST)
    const year = d.getUTCFullYear().toString().slice(-2)
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
    const day = d.getUTCDate().toString().padStart(2, '0')

    // 24시간 형식: 오전/오후 없이 00~23시로 표현
    const hour24 = d.getUTCHours().toString().padStart(2, '0')
    const minute = d.getUTCMinutes().toString().padStart(2, '0')

    return `${year}. ${month}. ${day}. ${hour24}:${minute}`
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
    // 체크인: 현재 내부 체류 중 (입장O, 퇴장X)
    checkInCount: stats?.checkInCount ?? rowsByPerson.filter(r => r.lastEntryAt && !r.lastExitAt).length,
    // 체크아웃: 퇴장 완료 (입장O, 퇴장O)
    checkOutCount: stats?.checkOutCount ?? rowsByPerson.filter(r => r.lastEntryAt && r.lastExitAt).length,
    // 방문신청: 아직 입장 안 한 인원
    pendingCount: stats?.pendingCount ?? rowsByPerson.filter(r => !r.lastEntryAt).length,
    // 전체: 승인된 인원 수
    totalApprovedCount: stats?.totalApprovedCount ?? 0,
    // 재입장자 수
    reentryCount: stats?.reentryCount ?? 0,
  }

  return (
    <div className="container max-w-[1400px] mx-auto py-8 px-6 md:px-8">
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
            {activeTab === "main" ? "정문 QR 스캔 · Visit Pass Scans" : "부두별 출입 이���"}
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
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10 z-[100]" align="end" sideOffset={8}>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date)
                      setCalendarOpen(false)
                    }
                  }}
                  locale={ko}
                  className="rounded-md"
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
      <div className="mb-6 flex items-center justify-end gap-2">
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
            <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10 z-[100]" align="end" sideOffset={4}>
              <CalendarComponent
                mode="single"
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
            <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10 z-[100]" align="end" sideOffset={4}>
              <CalendarComponent
                mode="single"
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
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black">
                  {(currentStats.totalApprovedCount || 0).toLocaleString("ko-KR")}
                </p>
                {(currentStats.reentryCount || 0) > 0 && (
                  <span className="text-sm text-purple-400 font-medium">
                    +{currentStats.reentryCount.toLocaleString("ko-KR")} 재입장
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 mt-1">승인 인원</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
        {activeTab === "main" && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">정문 출입 이력 ({filteredRows.length}명)</h2>
              <p className="text-sm text-white/40 mt-1">
                {cardFilter === "all" && "승인된 전체 방문자 목록"}
                {cardFilter === "pending" && "아직 입장하지 않은 방문자 목록"}
                {cardFilter === "checkIn" && "현재 내부 체류 중인 방문자 목록"}
                {cardFilter === "checkOut" && "퇴장 완료된 방문자 목록"}
              </p>
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
                      <TableHead className="text-white/70 min-w-[90px]">방문자</TableHead>
                      <TableHead className="text-white/70 min-w-[100px]">생년월일</TableHead>
                      <TableHead className="text-white/70 min-w-[130px]">소속</TableHead>
                      <TableHead className="text-white/70 min-w-[120px]">방문일</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">담당자</TableHead>
                      <TableHead className="text-white/70 min-w-[100px]">출입구역</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">입장시각</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">퇴장시각</TableHead>
                      <TableHead className="text-white/70 min-w-[90px]">차량번호</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">차량유종</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">불꽃방지망</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">상세</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => {
                      const recentClass = getRecentHighlight(row)
                      return (
                        <TableRow
                          key={row.pass_id}
                          className={`border-white/5 hover:bg-white/5 transition-colors ${recentClass}`}
                        >
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
                            {row.visitor_org || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-white/60">
                            {formatVisitPeriod(row.visit_start_date, row.visit_end_date)}
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
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => setSelectedApplicationId(row.application_id)}
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
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">부두 출입 이력 (인원별 {rowsByPerson.length}명)</h2>
              <p className="text-sm text-white/40 mt-1">
                부두 구역별로 방문자 출입 이력을 확인합니다.
              </p>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
                {error instanceof Error ? error.message : "데이터 로드 중 오류가 발생했습니다."}
              </div>
            )}

            {rowsByPerson.length === 0 && !loading ? (
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
                      <TableHead className="text-white/70 min-w-[90px]">방문자</TableHead>
                      <TableHead className="text-white/70 min-w-[100px]">생년월일</TableHead>
                      <TableHead className="text-white/70 min-w-[130px]">소속</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">담당자</TableHead>
                      <TableHead className="text-white/70 min-w-[100px]">출입 구역</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">입장 시각</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">퇴장 시각</TableHead>
                      <TableHead className="text-white/70 min-w-[90px]">차량번호</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">차량유종</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">불꽃방지망</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">상세</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rowsByPerson.map((row) => {
                      const recentClass = getRecentHighlight(row)
                      return (
                        <TableRow
                          key={row.pass_id}
                          className={`border-white/5 hover:bg-white/5 transition-colors ${recentClass}`}
                        >
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
                            {row.visitor_org || "-"}
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
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => setSelectedApplicationId(row.application_id)}
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
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          open={!!selectedApplication}
          loading={modalLoading}
          onClose={() => {
            setSelectedApplicationId(null)
            setSelectedApplication(null)
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

