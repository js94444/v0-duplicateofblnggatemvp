"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { ApplicationDetailModal } from "@/components/admin/application-detail-modal"
import { Application } from "@/lib/types"

interface ScanRow {
  scan_id: string
  pass_id: string
  application_id: number
  entry_direction: string
  entry_at: string
  entry_device_id: string | null
  entry_scanned_ip: string | null
  scan_site: string
  entry_result: "ALLOW" | "DENY"
  entry_deny_reason: string | null
  visitor_name: string | null
  visitor_org: string | null
  contact_name: string | null
  access_area: string | null
  contact_mobile: string | null
  visitor_birth_date: string | null
  vehicle_number: string | null
  vehicle_model: string | null
  spark_arrestor: string | null
  portCertFiles: Array<{ file_url: string; file_name: string }>
  // 퇴장 데이터 (있으면)
  exit_scan_id?: string | null
  exit_direction?: string | null
  exit_at?: string | null
  exit_device_id?: string | null
  exit_scanned_ip?: string | null
  exit_result?: string | null
  exit_deny_reason?: string | null
  last_event_at: string
}

interface ScanStats {
  totalScans: number
  allowScans: number
  denyScans: number
  entryCount?: number
  exitCount?: number
  applicationCount: number
}

type TabKind = "main" | "pier"
type PierKind = "1부두" | "2부두"

export default function AdminQrScanPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAdminAuth()
  const [activeTab, setActiveTab] = useState<TabKind>("main")
  const [pierTab, setPierTab] = useState<PierKind>("1부두")
  const [loading, setLoading] = useState(true)
  // 각 사이트별 데이터 캐싱
  const [dataCache, setDataCache] = useState<Record<string, { scans: ScanRow[]; stats: ScanStats | null }>>({})
  const [scans, setScans] = useState<ScanRow[]>([])
  const [stats, setStats] = useState<ScanStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [portCertModal, setPortCertModal] = useState<{ open: boolean; files: Array<{ file_url: string; file_name: string }>; visitorName: string; birthDate: string }>({ open: false, files: [], visitorName: "", birthDate: "" })

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

  const loadData = useCallback(async (forceRefresh = false) => {
    // 캐시된 데이터가 있고 강제 새로고침이 아니면 캐시 사용
    if (!forceRefresh && dataCache[scanSiteParam]) {
      setScans(dataCache[scanSiteParam].scans)
      setStats(dataCache[scanSiteParam].stats)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const t = Date.now()
      const res = await fetch(`/api/admin/qr-scans?t=${t}&scan_site=${scanSiteParam}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message || "QR 스캔 이력을 불러오지 못했습니다.")
      }
      const json = await res.json()
      const next: ScanRow[] = json.data || []
      const nextStats = json.stats || null

      // 캐시에 저장
      setDataCache(prev => ({
        ...prev,
        [scanSiteParam]: { scans: next, stats: nextStats }
      }))
      setScans(next)
      setStats(nextStats)
    } catch (e) {
      console.error("[v0] Failed to load qr-scans:", e)
      setError(e instanceof Error ? e.message : "데이터 로드 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }, [scanSiteParam, dataCache])

  useEffect(() => {
    loadData(false)
  }, [scanSiteParam])

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
    }))
  }, [scans])

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
    const hour = d.getUTCHours()
    const minute = d.getUTCMinutes().toString().padStart(2, '0')
    const ampm = hour < 12 ? '오전' : '오후'
    const hour12 = hour % 12 || 12
    return `${year}. ${month}. ${day}. ${ampm} ${hour12}:${minute}`
  }

  const currentStats: ScanStats = {
    totalScans: stats?.totalScans ?? stats?.total ?? scans.length,
    allowScans: stats?.allowScans ?? stats?.allowCount ?? scans.filter((s) => s.result === "ALLOW").length,
    denyScans: stats?.denyScans ?? stats?.denyCount ?? scans.filter((s) => s.result === "DENY").length,
    entryCount: stats?.entryCount ?? scans.filter((s) => s.result === "ALLOW" && s.direction === "ENTRY").length,
    exitCount: stats?.exitCount ?? scans.filter((s) => s.result === "ALLOW" && s.direction === "EXIT").length,
    applicationCount: stats?.applicationCount ?? new Set(scans.map((s) => s.application_id)).size,
  }
  const entryCount = currentStats.entryCount ?? 0
  const exitCount = currentStats.exitCount ?? 0

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
            {activeTab === "main" ? "정문 QR 스캔 · Visit Pass Scans" : "부두별 출입 이력"}
          </p>
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

      {/* Summary cards: 정문 탭에서만 */}
      {activeTab === "main" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60">방문 신청</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{currentStats.applicationCount.toLocaleString("ko-KR")}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60">입장</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-emerald-400">
                {entryCount.toLocaleString("ko-KR")}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60">퇴장</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-amber-400">
                {exitCount.toLocaleString("ko-KR")}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60">전체 스캔</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">
                {currentStats.totalScans.toLocaleString("ko-KR")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
        {activeTab === "main" && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">정문 출입 이력 (인원별 {rowsByPerson.length}명)</h2>
              <p className="text-sm text-white/40 mt-1">
                신청자·동행인별로 한 행씩, 입장/퇴장 시각을 열로 표시합니다.
              </p>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
                {error}
              </div>
            )}

            {rowsByPerson.length === 0 && !loading ? (
              <div className="text-center py-12 text-white/40">표시할 출입 이력이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70 min-w-[100px]">방문자</TableHead>
                      <TableHead className="text-white/70 min-w-[100px]">생년월일</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">소속</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">담당자</TableHead>
                      <TableHead className="text-white/70 min-w-[100px]">출입 구역</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">입장 시각</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">퇴장 시각</TableHead>
                      <TableHead className="text-white/70 min-w-[100px]">차량 번호</TableHead>
                      <TableHead className="text-white/70 min-w-[80px]">차량유종</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">불꽃방지망</TableHead>
                      <TableHead className="text-white/70 min-w-[80px]">상세</TableHead>
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

        {activeTab === "pier" && (
          <>
            <div className="mb-4 flex items-center gap-3 flex-wrap">
              <span className="text-sm text-white/60">부두 선택</span>
              <div className="flex rounded-lg border border-white/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPierTab("1부두")}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${pierTab === "1부두" ? "bg-amber-500 text-black" : "bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                >
                  1부두
                </button>
                <button
                  type="button"
                  onClick={() => setPierTab("2부두")}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${pierTab === "2부두" ? "bg-amber-500 text-black" : "bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                >
                  2부두
                </button>
              </div>
            </div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">{pierTab} 출입 이력 (인원별 {rowsByPerson.length}명)</h2>
              <p className="text-sm text-white/40 mt-1">
                부두에서 QR 스캔된 출입 이력을 인원별로 표시합니다. 최근 10분 이내 행은 색으로 강조됩니다.
              </p>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
                {error}
              </div>
            )}

            {rowsByPerson.length === 0 && !loading ? (
              <div className="text-center py-12 text-white/40">표시할 출입 이력이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70 min-w-[100px]">방문자</TableHead>
                      <TableHead className="text-white/70 min-w-[100px]">생년월일</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">소속</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">담당자</TableHead>
                      <TableHead className="text-white/70 min-w-[100px]">출입 구역</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">입장 시각</TableHead>
                      <TableHead className="text-white/70 min-w-[140px]">퇴장 시각</TableHead>
                      <TableHead className="text-white/70 min-w-[100px]">차량 번호</TableHead>
                      <TableHead className="text-white/70 min-w-[80px]">차량유종</TableHead>
                      <TableHead className="text-white/70 min-w-[70px]">불꽃방지망</TableHead>
                      <TableHead className="text-white/70 min-w-[80px]">상세</TableHead>
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

