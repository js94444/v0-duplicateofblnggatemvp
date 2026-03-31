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
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
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
  const [filterOpen, setFilterOpen] = useState(false)

  // Filters
  const [activeTab, setActiveTab] = useState<ApplicationType | "ALL">("ALL")
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL")
  const [areaFilter, setAreaFilter] = useState<AccessArea | "ALL">("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Sorting
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const { toast } = useToast()

  const fetcher = useCallback((url: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()).then(data => {
      const raw = data.data || data
      return raw.map((a: any) => ({ ...a, status: String(a.status ?? "").trim().toUpperCase() }))
    }), [token])

  const { data: applications = [], isLoading: loading, isValidating, mutate: refreshApplications } = useSWR(
    '/api/admin/requests',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 0,
      onError: () => toast({ title: "데이터 로드 실패", description: "신청 목록을 불러오는 중 오류가 발생했습니다", variant: "destructive" }),
    }
  )

  useEffect(() => {
    fetch('/data/contacts.json')
      .then(res => res.json())
      .then(data => setContacts(data))
      .catch(() => { })
  }, [])

  useEffect(() => {
    applyFilters()
  }, [applications, activeTab, statusFilter, areaFilter, searchQuery, dateFrom, dateTo, sortField, sortDirection, user])

  useEffect(() => {
    if (applications.length > 0 && token) {
      applications.forEach((app) => {
        fetch(`/api/admin/requests/check?application_id=${app.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.my_check) {
              setCheckStates((prev) => ({ ...prev, [String(app.id)]: !!data.my_check.checked }))
            }
          })
          .catch(() => { })
      })
    }
  }, [applications, token])

  const handleCheck = async (applicationId: string, checked: boolean) => {
    if (!token) return
    setCheckLoading((prev) => ({ ...prev, [applicationId]: true }))
    try {
      await fetch("/api/admin/requests/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ application_id: Number(applicationId), checked }),
      })
      setCheckStates((prev) => ({ ...prev, [applicationId]: checked }))
    } catch {
      toast({ title: "오류", description: "확인 처리 중 오류가 발생했습니다", variant: "destructive" })
    } finally {
      setCheckLoading((prev) => ({ ...prev, [applicationId]: false }))
    }
  }

  const applyFilters = () => {
    let filtered = applications

    if (user?.role === "manager" && user?.name) {
      const myName = user.name.trim()
      filtered = filtered.filter((app) => {
        const raw = (app.contact_name || "").trim()
        const namepart = raw.split(">")[0].trim()
        return namepart === myName || raw === myName || raw.startsWith(myName + ">")
      })
    }

    if (activeTab !== "ALL") {
      filtered = filtered.filter((app) => {
        const receipt = app.receipt || ''
        if (activeTab === "PORT_ACCESS") return receipt.startsWith("PA-")
        if (activeTab === "VISIT_R3") return receipt.startsWith("VR-")
        if (activeTab === "GROUP_VISIT") return receipt.startsWith("GV-")
        return false
      })
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((app) => app.status === statusFilter)
    }

    if (areaFilter !== "ALL") {
      filtered = filtered.filter((app) => app.access_area === areaFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (app) =>
          app.receipt.toLowerCase().includes(query) ||
          app.contact_name?.toLowerCase().includes(query) ||
          (app as any).organization?.toLowerCase().includes(query) ||
          (app as any).representative?.toLowerCase().includes(query) ||
          (app as any).visitor_name?.toLowerCase().includes(query),
      )
    }

    if (dateFrom) {
      filtered = filtered.filter((app) => new Date(app.created_at) >= new Date(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter((app) => new Date(app.created_at) <= new Date(dateTo + "T23:59:59"))
    }

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any, bVal: any

        switch (sortField) {
          case 'type':
            aVal = a.receipt.substring(0, 3)
            bVal = b.receipt.substring(0, 3)
            break
          case 'created_at':
            aVal = new Date(a.created_at).getTime()
            bVal = new Date(b.created_at).getTime()
            break
          case 'visit_date':
            aVal = new Date((a as any).visit_start_date || (a as any).visit_datetime || 0).getTime()
            bVal = new Date((b as any).visit_start_date || (b as any).visit_datetime || 0).getTime()
            break
          case 'status':
            aVal = a.status
            bVal = b.status
            break
          default:
            return 0
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    setFilteredApplications(filtered)
  }

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

  const handleApproval = async (application: Application, action: "approve" | "reject", reason?: string) => {
    try {
      const response = await fetch("/api/admin/requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: application.id, action, reason }),
      })

      const responseData = await response.json()

      if (response.ok) {
        toast({
          title: action === "approve" ? "승인 완료" : "반려 완료",
          description: `신청이 ${action === "approve" ? "승인" : "반려"}되었습니다`,
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
    const mobile = contact?.mobile || "-"
    return { name, dept: dept || contact?.department || '', mobile }
  }

  const tabCounts = {
    ALL: applications.length,
    GROUP_VISIT: applications.filter((app) => (app.receipt || '').startsWith("GV-")).length,
    PORT_ACCESS: applications.filter((app) => (app.receipt || '').startsWith("PA-")).length,
    GOODS_INOUT: applications.filter((app) => app.type === "GOODS_INOUT").length,
    VISIT_R3: applications.filter((app) => (app.receipt || '').startsWith("VR-")).length,
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/60">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
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
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center justify-between w-full md:hidden"
          >
            <h3 className="text-lg font-black text-white">🔍 필터 및 검색</h3>
            {filterOpen ? <ChevronUp size={20} className="text-white/40" /> : <ChevronDown size={20} className="text-white/40" />}
          </button>
          {/* 데스크탑: 항상 보임 */}
          <h3 className="text-xl font-black text-white mb-6 hidden md:block">🔍 필터 및 검색</h3>

          {/* 모바일: 검색만 항상 노출 */}
          <div className="mt-3 md:hidden">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40">🔍</span>
              <Input
                placeholder="접수번호, 담당자명, 신청자명"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-xl"
              />
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
                    <SelectItem value="정문">정문</SelectItem>
                    <SelectItem value="본관동(1층)">본관동(1층)</SelectItem>
                    <SelectItem value="본관동(3층)">본관동(3층)</SelectItem>
                    <SelectItem value="공정지역">공정지역</SelectItem>
                    <SelectItem value="제1부두">제1부두</SelectItem>
                    <SelectItem value="제2부두">제2부두</SelectItem>
                    <SelectItem value="제1,2부두">제1,2부두</SelectItem>
                    <SelectItem value="정비동 앞">정비동 앞</SelectItem>
                    <SelectItem value="정비동 뒤">정비동 뒤</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/60">시작일</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-white/5 border-white/10 text-white h-11 rounded-xl [color-scheme:dark]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/60">종료일</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-white/5 border-white/10 text-white h-11 rounded-xl [color-scheme:dark]" />
              </div>
              {/* 데스크탑에서만 검색 표시 (모바일은 위에서 이미 노출) */}
              <div className="space-y-2 hidden md:block">
                <label className="text-sm font-bold text-white/60">검색</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40">🔍</span>
                  <Input
                    placeholder="접수번호, 담당자명 등"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11 rounded-xl"
                  />
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
                <h3 className="text-xl sm:text-2xl font-black text-white">신청 목록 ({filteredApplications.length}건)</h3>
                <p className="text-sm text-white/40 mt-1">
                  {filteredApplications.length > 0
                    ? `총 ${filteredApplications.length}건의 신청이 있습니다`
                    : "조건에 맞는 신청이 없습니다"}
                </p>
              </div>

              {filteredApplications.length > 0 ? (
                <>
                  {/* 모바일: 카드 리스트 */}
                  <div className="md:hidden space-y-3">
                    {filteredApplications.map((application) => {
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
                            </div>
                            <Button
                              size="sm"
                              onClick={() => fetchFullApplication(application.receipt, application)}
                              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs px-3 py-1.5"
                            >
                              보기
                            </Button>
                          </div>

                          {/* 담당자 확인 체크 — 별도 강조 영역 */}
                          <div
                            className={`flex items-center justify-between px-4 py-2.5 transition-all ${checkStates[String(application.id)]
                              ? "bg-amber-500/15 border-b border-amber-500/20"
                              : "bg-white/[0.02] border-b border-white/5"
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={!!checkStates[String(application.id)]}
                                disabled={!!checkLoading[String(application.id)]}
                                onCheckedChange={(checked) => handleCheck(String(application.id), !!checked)}
                                className="w-6 h-6 border-2 border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 rounded-md"
                              />
                              <span className={`text-sm font-bold ${checkStates[String(application.id)] ? "text-amber-400" : "text-amber-500/70"
                                }`}>
                                담당자 확인
                              </span>
                            </div>
                            {checkStates[String(application.id)] && (
                              <span className="text-[11px] text-amber-400/60 font-medium">확인 완료</span>
                            )}
                            {!checkStates[String(application.id)] && isMyTask && (
                              <span className="text-[11px] text-amber-400 font-bold animate-pulse">확인 필요</span>
                            )}
                          </div>


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
                              <span className="text-white/60">{new Date(application.created_at).toLocaleDateString("ko-KR")}</span>
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
                        {filteredApplications.map((application) => {
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
                              <TableCell className="text-white/80">{new Date(application.created_at).toLocaleDateString("ko-KR")}</TableCell>
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
                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${getStatusBadgeStyle(application.status)}`}>
                                  {getStatusLabel(application.status)}
                                </span>
                              </TableCell>
                              <TableCell className={`${user?.name && contactInfo.name && user.name === contactInfo.name ? "bg-amber-500/10 backdrop-blur-sm" : ""}`}>
                                <div className="flex items-center justify-center">
                                  <Checkbox
                                    checked={!!checkStates[String(application.id)]}
                                    disabled={!!checkLoading[String(application.id)]}
                                    onCheckedChange={(checked) => handleCheck(String(application.id), !!checked)}
                                    className="w-5 h-5 border-white/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                  />
                                </div>
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
    </div>
  )
}
