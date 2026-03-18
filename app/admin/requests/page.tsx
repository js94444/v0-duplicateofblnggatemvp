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
import { RefreshCw } from "lucide-react"
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
  // 체크 상태 관리: { [applicationId]: boolean }
  const [checkStates, setCheckStates] = useState<Record<string, boolean>>({})
  const [checkLoading, setCheckLoading] = useState<Record<string, boolean>>({})

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

  // SWR로 목록 캐싱 - 30초마다 자동 갱신, 포커스 시 재검증
  const fetcher = useCallback((url: string) =>
    fetch(url).then(res => res.json()).then(data => {
      const raw = data.data || data
      return raw.map((a: any) => ({ ...a, status: String(a.status ?? "").trim().toUpperCase() }))
    }), [])

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

  // 체크 상태 초기화 (applications 로드 시)
  useEffect(() => {
    if (applications.length > 0 && token) {
      // 현재 로그인 유저의 체크 여부를 한번에 가져오기
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

    // 역할 기반 필터링: manager는 contact_name에 본인 이름이 포함된 것만
    if (user?.role === "manager" && user?.name) {
      const myName = user.name.trim()
      filtered = filtered.filter((app) => {
        const raw = (app.contact_name || "").trim()
        // "김인호>기술혁신팀" 또는 "김인호" 형식 모두 대응
        const namepart = raw.split(">")[0].trim()
        return namepart === myName || raw === myName || raw.startsWith(myName + ">")
      })
    }

    // Type filter by receipt number prefix
    if (activeTab !== "ALL") {
      filtered = filtered.filter((app) => {
        const receipt = app.receipt || ''
        if (activeTab === "PORT_ACCESS") return receipt.startsWith("PA-")
        if (activeTab === "VISIT_R3") return receipt.startsWith("VR-")
        if (activeTab === "GROUP_VISIT") return receipt.startsWith("GV-")
        return false
      })
    }

    // Status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((app) => app.status === statusFilter)
    }

    // Area filter
    if (areaFilter !== "ALL") {
      filtered = filtered.filter((app) => app.access_area === areaFilter)
    }

    // Search filter
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

    // Date filter
    if (dateFrom) {
      filtered = filtered.filter((app) => new Date(app.created_at) >= new Date(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter((app) => new Date(app.created_at) <= new Date(dateTo + "T23:59:59"))
    }

    // Sorting
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
    // 캐시에 있으면 즉시 표시 (로딩 상태 없음)
    if (detailCache[receipt]) {
      setSelectedApplication(detailCache[receipt])
      return
    }
    // 캐시가 없으면 로딩 시작 후 기본 데이터 표시
    setModalLoading(true)
    if (baseApplication) {
      setSelectedApplication(baseApplication)
    }
    try {
      const response = await fetch(`/api/status/${receipt}`)
      if (response.ok) {
        const fullData = await response.json()
        // 캐시에 저장
        setDetailCache(prev => ({ ...prev, [receipt]: fullData }))
        setSelectedApplication(fullData)
      } else {
        console.error("[v0] Failed to fetch full application data")
        toast({
          title: "데이터 로드 실패",
          description: "상세 정보를 불러올 수 없습니다",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching full application:", error)
      toast({
        title: "데이터 로드 실패",
        description: "상세 정보를 불러오는 중 오류가 발생했습니다",
        variant: "destructive",
      })
    } finally {
      setModalLoading(false)
    }
  }

  const handleApproval = async (application: Application, action: "approve" | "reject", reason?: string) => {
    try {
      console.log("[v0] Approval request:", { id: application.id, action, reason })
      const response = await fetch("/api/admin/requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: application.id,
          action,
          reason,
        }),
      })

      console.log("[v0] Approval response status:", response.status)
      const responseData = await response.json()
      console.log("[v0] Approval response data:", responseData)

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
      console.error("[v0] Approval error:", error)
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
      case "PENDING":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
      case "UNDER_REVIEW":
        return "bg-blue-500/20 text-blue-300 border-blue-500/50"
      case "APPROVED":
        return "bg-green-500/20 text-green-300 border-green-500/50"
      case "REJECTED":
        return "bg-red-500/20 text-red-300 border-red-500/50"
      case "CANCELLED":
        return "bg-gray-500/20 text-gray-300 border-gray-500/50"
      default:
        return "bg-white/10 text-white/60 border-white/30"
    }
  }

  const getTypeIcon = (type: ApplicationType) => {
    switch (type) {
      case "GROUP_VISIT":
        return <span className="text-sm">👥</span>
      case "PORT_ACCESS":
        return <span className="text-sm">🚢</span>
      case "GOODS_INOUT":
        return <span className="text-sm">🚚</span>
      case "VISIT_R3":
        return <span className="text-sm">👤</span>
      default:
        return null
    }
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
      <div className="container mx-auto px-6 py-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/60">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">신청 관리</h1>
            <p className="text-white/40 text-sm mt-1 font-medium">출입 신청 목록 및 승인 처리</p>
          </div>
          <Button
            onClick={() => refreshApplications()}
            disabled={loading || isValidating} // 로딩 중이거나 검증 중일 때 버튼 비활성화
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-5 py-2 rounded-xl transition-all active:scale-95"
          >
            <RefreshCw
              size={15}
              className={`mr-2 ${(loading || isValidating) ? "animate-spin" : ""}`}
            />
            {isValidating ? "업데이트 중..." : "새로고침"}
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
          <h3 className="text-xl font-black text-white mb-6">🔍 필터 및 검색</h3>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
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
                    <SelectItem value="정문">정문</SelectItem>
                    <SelectItem value="본관동(1,2,3층)">본관동(1,2,3층)</SelectItem>
                    <SelectItem value="공정지역">공정지역</SelectItem>
                    <SelectItem value="항만">항만</SelectItem>
                    <SelectItem value="정비동">정비동</SelectItem>
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
              <div className="space-y-2">
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

        {/* Applications Table */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ApplicationType | "ALL")}>
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 p-1 rounded-2xl h-auto">
            <TabsTrigger value="ALL" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-white/60 font-bold rounded-xl py-3">전체 ({tabCounts.ALL})</TabsTrigger>
            <TabsTrigger value="GROUP_VISIT" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-white/60 font-bold rounded-xl py-3">단체방문 ({tabCounts.GROUP_VISIT})</TabsTrigger>
            <TabsTrigger value="PORT_ACCESS" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-white/60 font-bold rounded-xl py-3">항만출입 ({tabCounts.PORT_ACCESS})</TabsTrigger>
            <TabsTrigger value="VISIT_R3" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-white/60 font-bold rounded-xl py-3">개인방문 ({tabCounts.VISIT_R3})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
              <div className="mb-6">
                <h3 className="text-2xl font-black text-white">신청 목록 ({filteredApplications.length}건)</h3>
                <p className="text-sm text-white/40 mt-1">
                  {filteredApplications.length > 0
                    ? `총 ${filteredApplications.length}건의 신청이 있습니다`
                    : "조건에 맞는 신청이 없습니다"}
                </p>
              </div>
              <div>
                {filteredApplications.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <Table>
                      <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="min-w-[100px] text-white/80 font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                if (sortField === "type") {
                                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                                } else {
                                  setSortField("type")
                                  setSortDirection("asc")
                                }
                              }}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              유형
                              {sortField === "type" && (
                                <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[120px] text-white/80 font-bold">휴대전화번호</TableHead>
                          <TableHead className="min-w-[100px] text-white/80 font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                if (sortField === "created_at") {
                                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                                } else {
                                  setSortField("created_at")
                                  setSortDirection("desc")
                                }
                              }}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              신청일
                              {sortField === "created_at" && (
                                <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[150px] text-white/80 font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                if (sortField === "visit_date") {
                                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                                } else {
                                  setSortField("visit_date")
                                  setSortDirection("asc")
                                }
                              }}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              방문일
                              {sortField === "visit_date" && (
                                <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[150px] text-white/80 font-bold">신청자</TableHead>
                          <TableHead className="min-w-[150px] text-white/80 font-bold">담당자</TableHead>
                          <TableHead className="min-w-[100px] text-white/80 font-bold">출입지역</TableHead>
                          <TableHead className="min-w-[80px] text-white/80 font-bold">
                            <button
                              type="button"
                              onClick={() => {
                                if (sortField === "status") {
                                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                                } else {
                                  setSortField("status")
                                  setSortDirection("asc")
                                }
                              }}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              상태
                              {sortField === "status" && (
                                <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[80px] text-white/80 font-bold"> 담당자 확인</TableHead>
                          <TableHead className="min-w-[120px] text-white/80 font-bold">상세보기</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApplications.map((application) => {
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
                              const start = formatDateFull(startDate)
                              const end = formatDateShort(endDate)
                              const result = `${start}~${end}`
                              console.log('[v0] Visit date formatted:', result)
                              return result
                            } else if ((app as any).visit_datetime) {
                              const date = formatDateFull(new Date((app as any).visit_datetime))
                              console.log('[v0] Visit datetime formatted:', date)
                              return date
                            }
                            return "-"
                          }

                          const getApplicantInfo = (app: Application) => {
                            const name = (app as any).visitor_name || "-"
                            const org = (app as any).visitor_organization || (app as any).organization || (app as any).company || "-"
                            return `${name}/${org}`
                          }

                          const getContactInfo = (app: Application) => {
                            const contactName = app.contact_name || "-"

                            // contacts.json에서 담당자 정보 찾기
                            const contactDisplay = contactName.includes('>') ? contactName.split('>') : [contactName, '']
                            const name = contactDisplay[0]
                            const dept = contactDisplay[1] || ''

                            // contacts.json에서 mobile 찾기
                            const contact = contacts.find(c => c.name === name)
                            const mobile = contact?.mobile || "-"

                            return { name, dept: dept || contact?.department || '', mobile }
                          }

                          const contactInfo = getContactInfo(application)

                          console.log('[v0] Rendering row for:', {
                            receipt: application.receipt,
                            all_keys: Object.keys(application),
                            visitor_phone: (application as any).visitor_phone,
                            visit_start_date: (application as any).visit_start_date,
                            visit_end_date: (application as any).visit_end_date,
                            visit_datetime: (application as any).visit_datetime,
                            formatted_date: getVisitDateRange(application),
                            contact_name: application.contact_name,
                            contact_info: contactInfo
                          })

                          return (
                            <TableRow key={application.id} className="border-white/5 hover:bg-white/5 transition-colors">
                              <TableCell className="text-white">
                                <div className="flex items-center gap-2">
                                  {getTypeIcon(application.type)}
                                  <span className="text-sm font-medium">
                                    {application.receipt.startsWith("GV-") ? "단체방문" :
                                      application.receipt.startsWith("VR-") ? "개인방문" :
                                        application.receipt.startsWith("PA-") ? "항만출입" : "-"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-white/80">{(application as any).visitor_phone || "-"}</TableCell>
                              <TableCell className="text-white/80">{new Date(application.created_at).toLocaleDateString("ko-KR")}</TableCell>
                              <TableCell className="text-sm text-white/80">{getVisitDateRange(application)}</TableCell>
                              <TableCell className="max-w-[150px] truncate text-sm text-white/80">
                                {getApplicantInfo(application)}
                              </TableCell>
                              <TableCell className="max-w-[150px]">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm truncate text-white/80">
                                    {contactInfo.dept ? `${contactInfo.name}>${contactInfo.dept}` : contactInfo.name}
                                  </span>
                                  <span className="text-xs text-white/40">
                                    : {contactInfo.mobile}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[100px] truncate text-white/80">
                                {(application as any).access_area || "-"}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${getStatusBadgeStyle(application.status)}`}>
                                  {(() => {
                                    const originalStatus = application.status;
                                    const statusKey = (typeof originalStatus === 'string'
                                      ? originalStatus.trim().toUpperCase()
                                      : String(originalStatus).trim().toUpperCase()) as ApplicationStatus;
                                    const label = APPLICATION_STATUS_LABELS[statusKey];

                                    return label || originalStatus;
                                  })()}
                                </span>
                              </TableCell>
                              <TableCell className={`${user?.name && contactInfo.name && user.name === contactInfo.name
                                ? "bg-amber-500/10 backdrop-blur-sm"
                                : ""
                                }`}>
                                <div className="flex items-center justify-center">
                                  <Checkbox
                                    checked={!!checkStates[String(application.id)]}
                                    disabled={!!checkLoading[String(application.id)]}
                                    onCheckedChange={(checked) =>
                                      handleCheck(String(application.id), !!checked)
                                    }
                                    className="w-5 h-5 border-white/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => fetchFullApplication(application.receipt, application)}
                                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg"
                                  >
                                    👁️ 보기
                                  </Button>
                                  {(() => {
                                    // 슈퍼어드민만 승인/반려 가능
                                    if (user?.role !== "super_admin") return null
                                    const statusUpper = String(application.status).toUpperCase()
                                    return statusUpper === "PENDING" || statusUpper === "UNDER_REVIEW" ? (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() => setApprovalDialog({ application, action: "approve" })}
                                          className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 rounded-lg"
                                        >
                                          ✓ 승인
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => setApprovalDialog({ application, action: "reject" })}
                                          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg"
                                        >
                                          ✕ 반려
                                        </Button>
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
                ) : (
                  <div className="text-center py-12">
                    <p className="text-white/40 text-lg">조건에 맞는 신청이 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          open={!!selectedApplication}
          loading={modalLoading}
          onClose={() => { setSelectedApplication(null); setModalLoading(false) }}
        />
      )}

      {/* Approval Dialog */}
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
