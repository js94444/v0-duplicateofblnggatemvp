"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ApplicationDetailModal } from "@/components/admin/application-detail-modal"
import { ApprovalDialog } from "@/components/admin/approval-dialog"
import {
  type Application,
  type ApplicationStatus,
  type ApplicationType,
  type AccessArea,
  APPLICATION_STATUS_LABELS,
} from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, ChevronDown, ChevronUp, X, Pencil } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

export default function AdminRequestsPage() {
  const { user, token } = useAdminAuth()
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [contacts, setContacts] = useState<{ name: string; department: string; mobile: string }[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [detailCache, setDetailCache] = useState<Record<string, Application>>({})
  const [approvalDialog, setApprovalDialog] = useState<{
    application: Application
    action: "approve" | "reject"
  } | null>(null)
  const [checkStates, setCheckStates] = useState<Record<string, boolean>>({})
  const [checkLoading, setCheckLoading] = useState<Record<string, boolean>>({})
  const [checkDecisions, setCheckDecisions] = useState<Record<string, 'approve' | 'reject' | null>>({})
  const [checkNotes, setCheckNotes] = useState<Record<string, string>>({})
  // 담당자 의견 입력 모달 상태
  const [decisionDialog, setDecisionDialog] = useState<{ application: Application; decision: 'approve' | 'reject' } | null>(null)
  const [decisionNote, setDecisionNote] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)

  // Filters
  const [activeTab, setActiveTab] = useState<ApplicationType | "ALL">("ALL")
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL")
  const [areaFilter, setAreaFilter] = useState<AccessArea | "ALL">("ALL")
  const [searchQuery, setSearchQuery] = useState("")  // 실제 서버로 전송되는 확정 검색어
  const [searchInput, setSearchInput] = useState("")  // 입력창에 타이핑 중인 값
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Sorting
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const { toast } = useToast()

  // 서버 페이지네이션 키
  const [serverTotal, setServerTotal] = useState(0)
  const [serverTotalPages, setServerTotalPages] = useState(1)
  const [serverTypeCounts, setServerTypeCounts] = useState<{ ALL: number; PORT_ACCESS: number; VISIT_R3: number; GROUP_VISIT: number }>({ ALL: 0, PORT_ACCESS: 0, VISIT_R3: 0, GROUP_VISIT: 0 })

  // 검색은 Enter/버튼 클릭 시에만 searchQuery에 반영
  const handleSearchSubmit = () => {
    setSearchQuery(searchInput.trim())
  }

  // 모든 필터/검색 초기화
  const handleResetFilters = () => {
    setSearchInput("")
    setSearchQuery("")
    setStatusFilter("ALL")
    setAreaFilter("ALL")
    setDateFrom("")
    setDateTo("")
    setActiveTab("ALL")
    setSortField("")
    setSortDirection("desc")
  }

  // 필터가 하나라도 활성화되어 있는지
  const hasActiveFilters = !!(
    searchQuery ||
    statusFilter !== "ALL" ||
    areaFilter !== "ALL" ||
    dateFrom ||
    dateTo ||
    activeTab !== "ALL" ||
    sortField
  )

  const swrKey = token ? (() => {
    const params = new URLSearchParams()
    params.set('page', String(currentPage))
    params.set('pageSize', String(pageSize))
    if (searchQuery) params.set('search', searchQuery)
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (activeTab !== 'ALL') params.set('type', activeTab)
    if (areaFilter !== 'ALL') params.set('area', areaFilter)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (sortField) {
      params.set('sortField', sortField)
      params.set('sortDirection', sortDirection)
    }
    return `/api/admin/requests?${params.toString()}`
  })() : null

  const fetcher = useCallback((url: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()).then(data => {
      setServerTotal(data.total || 0)
      setServerTotalPages(data.totalPages || 1)
      if (data.typeCounts) setServerTypeCounts(data.typeCounts)
      const raw = data.data || data
      return (Array.isArray(raw) ? raw : []).map((a: any) => ({ ...a, status: String(a.status ?? "").trim().toUpperCase() }))
    }), [token])

  const { data: applications = [], isLoading: loading, isValidating, mutate: refreshApplications } = useSWR(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 0,
      onError: () => toast({ title: "데이터 로드 실패", description: "신청 목록을 불러오는 중 오류가 발생했습니다", variant: "destructive" }),
    }
  )

  useEffect(() => {
    fetch('/api/contacts')
      .then(res => res.json())
      .then(data => setContacts(data))
      .catch(() => { })
  }, [])

  // 서버가 이미 필터/정렬/페이지네이션을 처리. applications를 그대로 filtered에 반영
  useEffect(() => {
    setFilteredApplications(applications)
  }, [applications])

  // 필터/탭/검색 변경 시에만 1페이지로 리셋 (currentPage 변경 시는 제외)
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, statusFilter, areaFilter, searchQuery, dateFrom, dateTo, pageSize, sortField, sortDirection])

  useEffect(() => {
    if (applications.length > 0 && token) {
      applications.forEach((app) => {
        fetch(`/api/admin/requests/check?application_id=${app.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.my_check) {
              const id = String(app.id)
              const checked = !!data.my_check.checked
              // 레거시: checked=true & decision=null인 경우 'approve'로 표시
              const decision = data.my_check.decision || (checked ? 'approve' : null)
              setCheckStates((prev) => ({ ...prev, [id]: checked }))
              setCheckDecisions((prev) => ({ ...prev, [id]: decision }))
              setCheckNotes((prev) => ({ ...prev, [id]: data.my_check.note || "" }))
            }
          })
          .catch(() => { })
      })
    }
  }, [applications, token])

  const handleCheck = async (applicationId: string, checked: boolean, decision?: 'approve' | 'reject' | null, note?: string) => {
    if (!token) return
    setCheckLoading((prev) => ({ ...prev, [applicationId]: true }))
    try {
      await fetch("/api/admin/requests/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ application_id: Number(applicationId), checked, decision, note }),
      })
      setCheckStates((prev) => ({ ...prev, [applicationId]: checked }))
      if (decision !== undefined) setCheckDecisions((prev) => ({ ...prev, [applicationId]: decision }))
      if (note !== undefined) setCheckNotes((prev) => ({ ...prev, [applicationId]: note || "" }))
    } catch {
      toast({ title: "오류", description: "확인 처리 중 오류가 발생했습니다", variant: "destructive" })
    } finally {
      setCheckLoading((prev) => ({ ...prev, [applicationId]: false }))
    }
  }

  // 담당자 결정 모달 확정
  const handleDecisionConfirm = async () => {
    if (!decisionDialog) return
    await handleCheck(String(decisionDialog.application.id), true, decisionDialog.decision, decisionNote.trim() || undefined)
    setDecisionDialog(null)
    setDecisionNote("")
  }

  // 서버 페이지네이션: 모든 필터/정렬/페이지네이션은 서버에서 처리
  const totalPages = serverTotalPages
  const paginatedApplications = filteredApplications

  const fetchFullApplication = async (receipt: string, baseApplication?: Application) => {
    if (detailCache[receipt]) {
      setSelectedApplication(detailCache[receipt])
      return
    }
    setModalLoading(true)
    if (baseApplication) {
      setSelectedApplication(baseApplication)
    }
    try {
      const response = await fetch(`/api/status/${receipt}`)
      if (response.ok) {
        const fullData = await response.json()
        setDetailCache(prev => ({ ...prev, [receipt]: fullData }))
        setSelectedApplication(fullData)
      } else {
        toast({ title: "데이터 로드 실패", description: "상세 정보를 불러올 수 없습니다", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "데이터 로드 실패", description: "상세 정보를 불러오는 중 오류가 발생했습니다", variant: "destructive" })
    } finally {
      setModalLoading(false)
    }
  }

  const handleApproval = async (application: Application, action: "approve" | "reject", reason?: string, isFreePass?: boolean, approvalNote?: string) => {
    try {
      const response = await fetch("/api/admin/requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: application.id, action, reason, isFreePass: !!isFreePass, approvalNote }),
      })

      const responseData = await response.json()

      if (response.ok) {
        toast({
          title: action === "approve" ? (isFreePass ? "프리패스 승인 완료" : "승인 완료") : "반려 완료",
          description: `신청이 ${action === "approve" ? (isFreePass ? "프리패스 승인" : "승인") : "반려"}되었습니다`,
        })
        refreshApplications()
      } else {
        throw new Error(responseData.message || "처리 실패")
      }
    } catch (error) {
      toast({
        title: "처리 실패",
        description: error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다",
        variant: "destructive",
      })
    }
    setApprovalDialog(null)
  }

  const getStatusBadgeStyle = (status: ApplicationStatus) => {
    const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : status
    switch (normalizedStatus) {
      case "PENDING": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
      case "UNDER_REVIEW": return "bg-blue-500/20 text-blue-300 border-blue-500/50"
      case "APPROVED": return "bg-green-500/20 text-green-300 border-green-500/50"
      case "REJECTED": return "bg-red-500/20 text-red-300 border-red-500/50"
      case "CANCELLED": return "bg-gray-500/20 text-gray-300 border-gray-500/50"
      default: return "bg-white/10 text-white/60 border-white/30"
    }
  }

  const getStatusLabel = (status: ApplicationStatus) => {
    const statusKey = (typeof status === 'string'
      ? status.trim().toUpperCase()
      : String(status).trim().toUpperCase()) as ApplicationStatus
    return APPLICATION_STATUS_LABELS[statusKey] || status
  }

  const getTypeIcon = (type: ApplicationType) => {
    switch (type) {
      case "GROUP_VISIT": return <span className="text-sm">👥</span>
      case "PORT_ACCESS": return <span className="text-sm">🚢</span>
      case "GOODS_INOUT": return <span className="text-sm">🚚</span>
      case "VISIT_R3": return <span className="text-sm">👤</span>
      default: return null
    }
  }

  const getTypeLabel = (receipt: string) => {
    if (receipt.startsWith("GV-")) return "단체방문"
    if (receipt.startsWith("VR-")) return "개인방문"
    if (receipt.startsWith("PA-")) return "항만출입"
    return "-"
  }

  const getVisitDateRange = (app: Application) => {
    const formatDateFull = (date: Date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}.${m}.${d}`
    }
    const formatDateShort = (date: Date) => {
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${m}.${d}`
    }
    if ((app as any).visit_start_date && (app as any).visit_end_date) {
      const startDate = new Date((app as any).visit_start_date)
      const endDate = new Date((app as any).visit_end_date)
      return `${formatDateFull(startDate)}~${formatDateShort(endDate)}`
    } else if ((app as any).visit_datetime) {
      return formatDateFull(new Date((app as any).visit_datetime))
    }
    return "-"
  }

  const getContactInfo = (app: Application) => {
    const contactName = app.contact_name || "-"
    const contactDisplay = contactName.includes('>') ? contactName.split('>') : [contactName, '']
    const name = contactDisplay[0]
    const dept = contactDisplay[1] || ''
    const contact = contacts.find(c => c.name === name)
    // DB에 저장된 contact_mobile 우선 사용, 없으면 서버 API에서 조회
    let mobile = (app as any).contact_mobile || ''
    if (!mobile && contact) {
      // contacts 목록에서는 전화번호가 없으므로 API로 조회 (비동기 불가 → 빈값 표시)
      mobile = ''
    }
    return { name, dept: dept || contact?.department || '', mobile: mobile || "-" }
  }

  // 탭 카운트는 서버에서 받은 typeCounts 사용 (전체 DB 기준)
  const tabCounts = {
    ALL: serverTypeCounts.ALL,
    GROUP_VISIT: serverTypeCounts.GROUP_VISIT,
    PORT_ACCESS: serverTypeCounts.PORT_ACCESS,
    GOODS_INOUT: 0,
    VISIT_R3: serverTypeCounts.VISIT_R3,
  }

  if (loading) {
    return (
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/60">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">신청 관리</h1>
            <p className="text-white/40 text-sm mt-1 font-medium">출입 신청 목록 및 승인 처리</p>
          </div>
          <Button
            onClick={() => refreshApplications()}
            disabled={loading || isValidating}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-3 sm:px-5 py-2 rounded-xl transition-all active:scale-95"
          >
            <RefreshCw
              size={15}
              className={`sm:mr-2 ${(loading || isValidating) ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">{isValidating ? "업데이트 중..." : "새로고침"}</span>
          </Button>
        </div>

        {/* Filters — 모바일에서는 접이식 */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[40px] p-4 sm:p-8 shadow-2xl">
          {/* 모바일: 접이식 헤더 */}
          <div className="flex items-center justify-between w-full md:hidden">
            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 flex-1"
            >
              <h3 className="text-lg font-black text-white">🔍 필터 및 검색</h3>
              {filterOpen ? <ChevronUp size={20} className="text-white/40" /> : <ChevronDown size={20} className="text-white/40" />}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors ml-2"
              >
                <X size={12} />
                초기화
              </button>
            )}
          </div>
          {/* 데스크탑: 항상 보임 */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-white">🔍 필터 및 검색</h3>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <X size={14} />
                초기화
              </button>
            )}
          </div>

          {/* 모바일: 검색만 항상 노출 */}
          <div className="mt-3 md:hidden">
            <div className="relative">
              <Input
                placeholder="접수번호, 담당자명, 신청자명 (Enter로 검색)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit() }}
                className="pr-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-xl"
              />
              <button
                type="button"
                onClick={handleSearchSubmit}
                aria-label="검색"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-amber-500 hover:bg-white/10 transition-colors"
              >
                🔍
              </button>
            </div>
          </div>

          {/* 모바일: 나머지 필터 (접이식) / 데스크탑: 항상 보임 */}
          <div className={`${filterOpen ? 'block' : 'hidden'} md:block mt-4 md:mt-0`}>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/60">상태</label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "ALL")}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/95 border-white/20 text-white">
                    <SelectItem value="ALL">전체</SelectItem>
                    {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/60">출입지역</label>
                <Select value={areaFilter} onValueChange={(value) => setAreaFilter(value as AccessArea | "ALL")}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/95 border-white/20 text-white">
                    <SelectItem value="ALL">전체</SelectItem>
                    <SelectItem value="전체지역">전체지역</SelectItem>
                    <SelectItem value="일반지역">일반지역</SelectItem>
                    <SelectItem value="공정지역">공정지역</SelectItem>
                    <SelectItem value="제1부두">제1부두</SelectItem>
                    <SelectItem value="제2부두">제2부두</SelectItem>
                    <SelectItem value="제1,2부두">제1,2부두</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/60">시작일</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-white/5 border-white/10 text-white h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/60">종료일</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-white/5 border-white/10 text-white h-11 rounded-xl" />
              </div>
              {/* 데스크탑에서만 검색 표시 (모바일은 위에서 이미 노출) */}
              <div className="space-y-2 hidden md:block">
                <label className="text-sm font-bold text-white/60">검색 (Enter/돋보기 클릭)</label>
                <div className="relative">
                  <Input
                    placeholder="접수번호, 담당자명 등"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit() }}
                    className="pr-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    aria-label="검색"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-amber-500 hover:bg-white/10 transition-colors"
                  >
                    🔍
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applications */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ApplicationType | "ALL")}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-white/5 border border-white/10 p-1 rounded-2xl h-auto gap-1">
            <TabsTrigger value="ALL" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-white/60 font-bold rounded-xl py-2 sm:py-3 text-xs sm:text-sm">전체 ({tabCounts.ALL})</TabsTrigger>
            <TabsTrigger value="GROUP_VISIT" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-white/60 font-bold rounded-xl py-2 sm:py-3 text-xs sm:text-sm">단체 ({tabCounts.GROUP_VISIT})</TabsTrigger>
            <TabsTrigger value="PORT_ACCESS" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-white/60 font-bold rounded-xl py-2 sm:py-3 text-xs sm:text-sm">항만 ({tabCounts.PORT_ACCESS})</TabsTrigger>
            <TabsTrigger value="VISIT_R3" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-white/60 font-bold rounded-xl py-2 sm:py-3 text-xs sm:text-sm">개인 ({tabCounts.VISIT_R3})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[40px] p-4 sm:p-8 shadow-2xl">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-black text-white">신청 목록 ({serverTotal}건)</h3>
                <p className="text-sm text-white/40 mt-1">
                  {serverTotal > 0
                    ? `총 ${serverTotal}건의 신청이 있습니다`
                    : "조건에 맞는 신청이 없습니다"}
                </p>
              </div>

              {paginatedApplications.length > 0 ? (
                <>
                  {/* 모바일: 카드 리스트 */}
                  <div className="md:hidden space-y-3">
                    {paginatedApplications.map((application) => {
                      const contactInfo = getContactInfo(application)
                      const isMyTask = user?.name && contactInfo.name && user.name === contactInfo.name
                      return (
                        <div
                          key={application.id}
                          className={`rounded-2xl border transition-all ${isMyTask
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-white/10 bg-white/[0.02]"
                            }`}
                        >
                          {/* 카드 상단: 유형 + 상태 + 보기 */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                {getTypeIcon(application.type)}
                                <span className="text-sm font-bold text-white">{getTypeLabel(application.receipt)}</span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadgeStyle(application.status)}`}>
                                {getStatusLabel(application.status)}
                              </span>
                              {(application as any).is_free_pass && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-black">
                                  ⚡ FREE PASS
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => fetchFullApplication(application.receipt, application)}
                              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs px-3 py-1.5"
                            >
                              보기
                            </Button>
                          </div>

                          {/* 담당자 확인 — 상태별 분기 */}
                          {(() => {
                            const id = String(application.id)
                            const decision = checkDecisions[id]
                            const note = checkNotes[id]
                            const isApproved = decision === 'approve'
                            const isRejected = decision === 'reject'
                            const hasDecision = isApproved || isRejected

                            return (
                              <div className={`flex items-center justify-between px-4 py-2.5 gap-2 border-b ${
                                isApproved ? "bg-emerald-500/10 border-emerald-500/20" :
                                isRejected ? "bg-red-500/10 border-red-500/20" :
                                "bg-white/[0.02] border-white/5"
                              }`}>
                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                  {hasDecision ? (
                                    <>
                                      <span className={`text-xs font-black ${isApproved ? "text-emerald-400" : "text-red-400"}`}>
                                        {isApproved ? "✓ 담당자 승인" : "✕ 담당자 반려"}
                                      </span>
                                      {note && <span className="text-[11px] text-white/60 truncate">{note}</span>}
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-xs font-bold text-amber-500/70">담당자 확인 필요</span>
                                      {isMyTask && <span className="text-[10px] text-amber-400 font-bold animate-pulse">내 담당</span>}
                                    </>
                                  )}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {hasDecision ? (
                                    <Button size="sm" disabled={!!checkLoading[id]} onClick={() => { setDecisionDialog({ application, decision: isApproved ? 'approve' : 'reject' }); setDecisionNote(note || "") }} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 rounded-lg text-xs px-2 py-1 h-7" aria-label="수정">
                                      <Pencil size={11} />
                                    </Button>
                                  ) : (
                                    <>
                                      <Button size="sm" disabled={!!checkLoading[id]} onClick={() => { setDecisionDialog({ application, decision: 'approve' }); setDecisionNote(note || "") }} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs px-2 py-1 h-7">승인</Button>
                                      <Button size="sm" disabled={!!checkLoading[id]} onClick={() => { setDecisionDialog({ application, decision: 'reject' }); setDecisionNote(note || "") }} className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg text-xs px-2 py-1 h-7">반려</Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })()}


                          {/* 카드 본문 */}
                          <div className="px-4 py-3 space-y-2 text-sm">
                            {/* 신청자 */}
                            <div className="flex items-start gap-2">
                              <span className="text-white/40 w-12 shrink-0">신청자</span>
                              <div className="text-white/80">
                                <span className="font-medium">{(application as any).visitor_name || "-"}</span>
                                <span className="text-white/40"> / {(application as any).visitor_organization || (application as any).organization || "-"}</span>
                              </div>
                            </div>
                            {/* 연락처 */}
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 w-12 shrink-0">연락처</span>
                              <span className="text-white/60">{(application as any).visitor_phone || "-"}</span>
                            </div>
                            {/* 담당자 */}
                            <div className="flex items-start gap-2">
                              <span className="text-white/40 w-12 shrink-0">담당자</span>
                              <div>
                                <span className={`font-medium ${isMyTask ? "text-amber-400" : "text-white/80"}`}>
                                  {contactInfo.dept ? `${contactInfo.name}>${contactInfo.dept}` : contactInfo.name}
                                </span>
                                <span className="text-white/40 ml-2">{contactInfo.mobile}</span>
                              </div>
                            </div>
                            {/* 출입지역 */}
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 w-12 shrink-0">구역</span>
                              <span className="text-white/60">{(application as any).access_area || "-"}</span>
                            </div>
                            {/* 날짜 */}
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 w-12 shrink-0">신청일</span>
                              <span className="text-white/60">{new Date(application.created_at).toLocaleDateString("ko-KR", { timeZone: "UTC" })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 w-12 shrink-0">방문일</span>
                              <span className="text-white/80 font-medium">{getVisitDateRange(application)}</span>
                            </div>
                          </div>

                          {/* 슈퍼어드민: 승인/반려 버튼 */}
                          {(user?.role === "super_admin" || user?.role === "security") && (() => {
                            const statusUpper = String(application.status).toUpperCase()
                            return statusUpper === "PENDING" || statusUpper === "UNDER_REVIEW" ? (
                              <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5">
                                <Button
                                  size="sm"
                                  onClick={() => setApprovalDialog({ application, action: "approve" })}
                                  className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 rounded-lg text-xs"
                                >
                                  ✓ 승인
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setApprovalDialog({ application, action: "reject" })}
                                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg text-xs"
                                >
                                  ✕ 반려
                                </Button>
                              </div>
                            ) : null
                          })()}
                        </div>
                      )
                    })}
                  </div>

                  {/* 데스크탑: 테이블 */}
                  <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10">
                    <Table>
                      <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="min-w-[100px] text-white/80 font-bold">
                            <button type="button" onClick={() => { if (sortField === "type") { setSortDirection(sortDirection === "asc" ? "desc" : "asc") } else { setSortField("type"); setSortDirection("asc") } }} className="flex items-center gap-1 hover:text-white transition-colors">
                              유형 {sortField === "type" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[120px] text-white/80 font-bold">휴대전화번호</TableHead>
                          <TableHead className="min-w-[100px] text-white/80 font-bold">
                            <button type="button" onClick={() => { if (sortField === "created_at") { setSortDirection(sortDirection === "asc" ? "desc" : "asc") } else { setSortField("created_at"); setSortDirection("desc") } }} className="flex items-center gap-1 hover:text-white transition-colors">
                              신청일 {sortField === "created_at" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[150px] text-white/80 font-bold">
                            <button type="button" onClick={() => { if (sortField === "visit_date") { setSortDirection(sortDirection === "asc" ? "desc" : "asc") } else { setSortField("visit_date"); setSortDirection("asc") } }} className="flex items-center gap-1 hover:text-white transition-colors">
                              방문일 {sortField === "visit_date" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[150px] text-white/80 font-bold">신청자</TableHead>
                          <TableHead className="min-w-[150px] text-white/80 font-bold">담당자</TableHead>
                          <TableHead className="min-w-[100px] text-white/80 font-bold">출입지역</TableHead>
                          <TableHead className="min-w-[80px] text-white/80 font-bold">
                            <button type="button" onClick={() => { if (sortField === "status") { setSortDirection(sortDirection === "asc" ? "desc" : "asc") } else { setSortField("status"); setSortDirection("asc") } }} className="flex items-center gap-1 hover:text-white transition-colors">
                              상태 {sortField === "status" && <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[80px] text-white/80 font-bold">담당자 확인</TableHead>
                          <TableHead className="min-w-[120px] text-white/80 font-bold">상세보기</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedApplications.map((application) => {
                          const contactInfo = getContactInfo(application)
                          return (
                            <TableRow key={application.id} className="border-white/5 hover:bg-white/5 transition-colors">
                              <TableCell className="text-white">
                                <div className="flex items-center gap-2">
                                  {getTypeIcon(application.type)}
                                  <span className="text-sm font-medium">{getTypeLabel(application.receipt)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-white/80">{(application as any).visitor_phone || "-"}</TableCell>
                              <TableCell className="text-white/80">{new Date(application.created_at).toLocaleDateString("ko-KR", { timeZone: "UTC" })}</TableCell>
                              <TableCell className="text-sm text-white/80">{getVisitDateRange(application)}</TableCell>
                              <TableCell className="max-w-[150px] truncate text-sm text-white/80">
                                {(application as any).visitor_name || "-"}/{(application as any).visitor_organization || (application as any).organization || (application as any).company || "-"}
                              </TableCell>
                              <TableCell className="max-w-[150px]">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm truncate text-white/80">
                                    {contactInfo.dept ? `${contactInfo.name}>${contactInfo.dept}` : contactInfo.name}
                                  </span>
                                  <span className="text-xs text-white/40">: {contactInfo.mobile}</span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[100px] truncate text-white/80">{(application as any).access_area || "-"}</TableCell>
                              <TableCell>
                                <div className="flex flex-col items-start gap-1">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${getStatusBadgeStyle(application.status)}`}>
                                    {getStatusLabel(application.status)}
                                  </span>
                                  {(application as any).is_free_pass && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-black">
                                      ⚡ FREE PASS
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className={`${user?.name && contactInfo.name && user.name === contactInfo.name ? "bg-amber-500/10 backdrop-blur-sm" : ""}`}>
                                {(() => {
                                  const id = String(application.id)
                                  const decision = checkDecisions[id]
                                  const note = checkNotes[id]
                                  const isApproved = decision === 'approve'
                                  const isRejected = decision === 'reject'
                                  const hasDecision = isApproved || isRejected
                                  return (
                                    <div className="flex flex-col items-center gap-1">
                                      {hasDecision ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black ${isApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                                            {isApproved ? '✓ 승인' : '✕ 반려'}
                                          </span>
                                          <button type="button" disabled={!!checkLoading[id]} onClick={() => { setDecisionDialog({ application, decision: isApproved ? 'approve' : 'reject' }); setDecisionNote(note || "") }} className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors" aria-label="수정">
                                            <Pencil size={11} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex gap-1">
                                          <Button size="sm" disabled={!!checkLoading[id]} onClick={() => { setDecisionDialog({ application, decision: 'approve' }); setDecisionNote(note || "") }} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 rounded-md text-[10px] px-2 py-1 h-6">승인</Button>
                                          <Button size="sm" disabled={!!checkLoading[id]} onClick={() => { setDecisionDialog({ application, decision: 'reject' }); setDecisionNote(note || "") }} className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-md text-[10px] px-2 py-1 h-6">반려</Button>
                                        </div>
                                      )}
                                      {note && (
                                        <span className="text-[10px] text-white/50 truncate max-w-[140px]" title={note}>{note}</span>
                                      )}
                                    </div>
                                  )
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" onClick={() => fetchFullApplication(application.receipt, application)} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg">
                                    👁️ 보기
                                  </Button>
                                  {(() => {
                                    if (user?.role !== "super_admin" && user?.role !== "security") return null
                                    const statusUpper = String(application.status).toUpperCase()
                                    return statusUpper === "PENDING" || statusUpper === "UNDER_REVIEW" ? (
                                      <>
                                        <Button size="sm" onClick={() => setApprovalDialog({ application, action: "approve" })} className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 rounded-lg">✓ 승인</Button>
                                        <Button size="sm" onClick={() => setApprovalDialog({ application, action: "reject" })} className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg">✕ 반려</Button>
                                      </>
                                    ) : null
                                  })()}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {/* 페이지네이션 */}
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/40">페이지당</span>
                      {[20, 50, 100].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => { setPageSize(size); setCurrentPage(1) }}
                          className={`h-8 px-3 rounded-lg text-sm font-bold transition-all ${pageSize === size
                            ? "bg-amber-500 text-black"
                            : "text-white/50 hover:text-white hover:bg-white/10 border border-white/10"
                          }`}
                        >
                          {size}건
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(1)}
                        className="text-white/50 hover:text-white hover:bg-white/10 text-xs px-2"
                      >
                        «
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="text-white/50 hover:text-white hover:bg-white/10 text-xs px-2"
                      >
                        ‹
                      </Button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                        .reduce<(number | string)[]>((acc, p, i, arr) => {
                          if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...")
                          acc.push(p)
                          return acc
                        }, [])
                        .map((p, i) =>
                          typeof p === "string" ? (
                            <span key={`dot-${i}`} className="text-white/30 px-1 text-sm">…</span>
                          ) : (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`h-8 w-8 rounded-lg text-sm font-bold transition-all ${currentPage === p
                                ? "bg-amber-500 text-black"
                                : "text-white/50 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {p}
                            </button>
                          )
                        )}

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="text-white/50 hover:text-white hover:bg-white/10 text-xs px-2"
                      >
                        ›
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="text-white/50 hover:text-white hover:bg-white/10 text-xs px-2"
                      >
                        »
                      </Button>
                    </div>

                    <span className="text-sm text-white/40">
                      {serverTotal}건 중 {(currentPage - 1) * pageSize + 1}~{Math.min(currentPage * pageSize, serverTotal)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-white/40 text-lg">조건에 맞는 신청이 없습니다</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          open={!!selectedApplication}
          loading={modalLoading}
          onClose={() => { setSelectedApplication(null); setModalLoading(false) }}
        />
      )}

      {approvalDialog && (
        <ApprovalDialog
          application={approvalDialog.application}
          action={approvalDialog.action}
          open={!!approvalDialog}
          onClose={() => setApprovalDialog(null)}
          onConfirm={handleApproval}
        />
      )}

      {/* 담당자 결정 입력 모달 */}
      {decisionDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={() => { setDecisionDialog(null); setDecisionNote("") }}>
          <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 pb-3 flex items-center justify-between border-b border-white/10">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  {decisionDialog.decision === 'approve' ? <span className="text-emerald-400">✓ 담당자 승인 의견</span> : <span className="text-red-400">✕ 담당자 반려 의견</span>}
                </h3>
                <p className="text-xs text-white/40 mt-0.5">접수번호: <span className="font-mono">{decisionDialog.application.receipt}</span></p>
              </div>
              <button type="button" onClick={() => { setDecisionDialog(null); setDecisionNote("") }} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 text-xs">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-white/60">담당자 결정은 <span className="text-amber-300 font-bold">참고용 의견</span>이며 최종 결정은 관리자가 진행합니다.</p>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/70">의견 <span className="text-white/40 font-normal">(선택)</span></label>
                <textarea
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows={3}
                  placeholder="예: 일정 확인됨, 안전교육 이수자"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm resize-none"
                />
              </div>
            </div>
            <div className="p-5 pt-0 flex justify-end gap-2">
              <Button onClick={() => { setDecisionDialog(null); setDecisionNote("") }} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 text-sm px-4 py-2">취소</Button>
              <Button onClick={handleDecisionConfirm} className={`text-sm px-4 py-2 font-bold ${decisionDialog.decision === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600 text-black' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
                {decisionDialog.decision === 'approve' ? '승인 의견 저장' : '반려 의견 저장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
