"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { type Application, APPLICATION_STATUS_LABELS } from "@/lib/types"
import { X, Download, FileText, ZoomIn, Loader2, Pencil, Save, XCircle, RotateCcw } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

interface ScanHistoryItem {
  scan_id: number
  direction: "ENTRY" | "EXIT"
  scanned_at: string
  result: string
  scan_site: string
  user_agent: string
}

interface ApplicationDetailModalProps {
  application: Application | null
  open: boolean
  loading?: boolean
  scanHistory?: ScanHistoryItem[]
  onClose: () => void
  onUpdated?: () => void
}

// 이미지 파일인지 확인
function isImageFile(filename: string, fileType?: string): boolean {
  const ext = filename?.split(".").pop()?.toLowerCase() || ""
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) return true
  if (fileType?.startsWith("image/")) return true
  return false
}

function isPdfFile(filename: string, fileType?: string): boolean {
  const ext = filename?.split(".").pop()?.toLowerCase() || ""
  if (ext === "pdf") return true
  if (fileType === "application/pdf") return true
  return false
}

// 라이트박스 컴포넌트
function Lightbox({ src, alt, onClose, kind = "image" }: { src: string; alt: string; onClose: () => void; kind?: "image" | "pdf" }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all z-10"
      >
        <X size={20} />
      </button>
      {kind === "pdf" ? (
        <iframe
          src={src}
          title={alt}
          className="w-[92vw] h-[90vh] rounded-2xl shadow-2xl bg-white"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  )
}

// 썸네일 카드
function FileThumbnail({ file, onLightbox, authToken }: { file: any; onLightbox: (url: string, name: string, kind?: "image" | "pdf") => void; authToken?: string | null }) {
  const fileUrl = file.url || file.key
  const isImage = isImageFile(file.filename || "", file.type)
  const isPdf = isPdfFile(file.filename || "", file.type)
  const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : ""
  const previewUrl = fileUrl ? `/api/files/${encodeURIComponent(fileUrl)}${tokenParam}` : null

  if (isPdf && previewUrl) {
    return (
      <div className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-black/40 hover:border-amber-500/50 transition-all cursor-pointer w-full sm:w-[200px]">
        <div
          className="relative overflow-hidden h-[200px] sm:h-[280px] bg-white"
          onClick={() => onLightbox(previewUrl, file.filename || "이수증", "pdf")}
        >
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
            title={file.filename || "PDF"}
            className="w-full h-full pointer-events-none"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn size={24} className="text-white drop-shadow-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between px-2 py-1.5 bg-black/60 gap-1">
          <p className="text-[10px] text-white/50 truncate flex-1">{file.filename || "이수증"}</p>
          <button
            onClick={(e) => { e.stopPropagation(); if (previewUrl) window.open(previewUrl, "_blank") }}
            className="flex-shrink-0 text-white/40 hover:text-amber-400 transition-colors"
            title="다운로드"
          >
            <Download size={12} />
          </button>
        </div>
      </div>
    )
  }

  if (isImage && previewUrl) {
    return (
      <div className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-black/40 hover:border-amber-500/50 transition-all cursor-pointer w-full sm:w-[200px]">
        <div
          className="relative overflow-hidden h-[200px] sm:h-[280px]"
          onClick={() => onLightbox(previewUrl, file.filename || "이수증")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={file.filename}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn size={24} className="text-white drop-shadow-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between px-2 py-1.5 bg-black/60 gap-1">
          <p className="text-[10px] text-white/50 truncate flex-1">{file.filename || "이수증"}</p>
          <button
            onClick={(e) => { e.stopPropagation(); if (previewUrl) window.open(previewUrl, "_blank") }}
            className="flex-shrink-0 text-white/40 hover:text-amber-400 transition-colors"
            title="다운로드"
          >
            <Download size={12} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate max-w-[180px]">{file.filename || "파일"}</p>
          <p className="text-xs text-white/30 uppercase tracking-wider">DOCUMENT</p>
        </div>
      </div>
      {previewUrl && (
        <Button
          onClick={() => window.open(previewUrl, "_blank")}
          size="icon"
          className="bg-white/5 hover:bg-amber-500 text-white/60 hover:text-black rounded-xl transition-all flex-shrink-0"
        >
          <Download size={16} />
        </Button>
      )}
    </div>
  )
}

function PortCertThumbnails({ files, authToken }: { files: any[]; authToken?: string | null }) {
  const [lightbox, setLightbox] = useState<{ url: string; name: string; kind: "image" | "pdf" } | null>(null)
  if (!files || files.length === 0) return null
  return (
    <>
      <div className="flex flex-col gap-3">
        {files.map((file, idx) => (
          <FileThumbnail key={idx} file={file} authToken={authToken} onLightbox={(url, name, kind = "image") => setLightbox({ url, name, kind })} />
        ))}
      </div>
      {lightbox && <Lightbox src={lightbox.url} alt={lightbox.name} kind={lightbox.kind} onClose={() => setLightbox(null)} />}
    </>
  )
}

function AttachmentSection({ title, files, authToken }: { title: string; files: any[]; authToken?: string | null }) {
  const [lightbox, setLightbox] = useState<{ url: string; name: string; kind: "image" | "pdf" } | null>(null)
  if (!files || files.length === 0) return null
  const previewable = files.filter((f) => isImageFile(f.filename || "", f.type) || isPdfFile(f.filename || "", f.type))
  const otherFiles = files.filter((f) => !isImageFile(f.filename || "", f.type) && !isPdfFile(f.filename || "", f.type))
  return (
    <div className="pt-6 border-t border-white/10 space-y-3">
      <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest">{title}</p>
      {previewable.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {previewable.map((file, idx) => (
            <FileThumbnail key={idx} file={file} authToken={authToken} onLightbox={(url, name, kind = "image") => setLightbox({ url, name, kind })} />
          ))}
        </div>
      )}
      {otherFiles.length > 0 && (
        <div className="grid grid-cols-1 gap-2 mt-2">
          {otherFiles.map((file, idx) => (
            <FileThumbnail key={idx} file={file} authToken={authToken} onLightbox={() => { }} />
          ))}
        </div>
      )}
      {lightbox && <Lightbox src={lightbox.url} alt={lightbox.name} kind={lightbox.kind} onClose={() => setLightbox(null)} />}
    </div>
  )
}

function ModalBodySkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div
        className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 sm:px-5 sm:py-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-400" aria-hidden />
        <p className="text-sm font-semibold text-white/90">
          신청 정보를 불러오는 중입니다<span className="inline-block w-6 animate-pulse text-amber-400">…</span>
        </p>
      </div>
      <div className="rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-11 rounded-lg bg-white/10 sm:h-10 sm:w-12 sm:rounded-xl" />
          <Skeleton className="h-7 w-28 rounded-md bg-white/10 sm:h-8 sm:w-36" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20 rounded bg-white/10" />
              <Skeleton className="h-5 w-full max-w-[220px] rounded-md bg-white/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-11 rounded-lg bg-white/10 sm:h-10 sm:w-12 sm:rounded-xl" />
          <Skeleton className="h-7 w-24 rounded-md bg-white/10 sm:h-8 sm:w-32" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 sm:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16 rounded bg-white/10" />
              <Skeleton className="h-5 w-full rounded-md bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 수정 가능 필드 input
function EditableField({ label, value, onChange, type = "text" }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] sm:text-xs text-amber-500 font-bold uppercase tracking-wider">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg bg-white/5 border border-amber-500/30 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
      />
    </div>
  )
}

// 수정 가능 select
function EditableSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] sm:text-xs text-amber-500 font-bold uppercase tracking-wider">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg bg-white/5 border border-amber-500/30 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all appearance-none"
      >
        <option value="">선택</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-zinc-900">{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

const ACCESS_AREA_OPTIONS = [
  { value: "전체지역", label: "전체지역" },
  { value: "정문", label: "정문" },
  { value: "본관동(1층)", label: "본관동(1층)" },
  { value: "본관동(3층)", label: "본관동(3층)" },
  { value: "공정지역", label: "공정지역" },
  { value: "제1부두", label: "제1부두" },
  { value: "제2부두", label: "제2부두" },
  { value: "제1,2부두", label: "제1,2부두" },
  { value: "정비동 앞", label: "정비동 앞" },
  { value: "정비동 뒤", label: "정비동 뒤" },
]

const VEHICLE_MODEL_OPTIONS = [
  { value: "휘발유", label: "휘발유" },
  { value: "경유", label: "경유" },
  { value: "LPG", label: "LPG" },
  { value: "전기", label: "전기" },
]

const SPARK_ARRESTOR_OPTIONS = [
  { value: "Y", label: "Y" },
  { value: "N", label: "N" },
]

const VISIT_PURPOSE_OPTIONS = [
  { value: "업무 협의 및 회의 등", label: "업무 협의 및 회의 등" },
  { value: "공사/작업, 유지보수, A/S 등", label: "공사/작업, 유지보수, A/S 등" },
  { value: "물품반입/반출, 납품 등", label: "물품반입/반출, 납품 등" },
  { value: "점검 및 감사, 훈련 등", label: "점검 및 감사, 훈련 등" },
  { value: "부두 작업 및 부두 출입 등", label: "부두 작업 및 부두 출입 등" },
  { value: "견학", label: "견학" },
  { value: "기타 업무", label: "기타 업무" },
]

export function ApplicationDetailModal({ application, open, loading = false, scanHistory = [], onClose, onUpdated }: ApplicationDetailModalProps) {
  const { user, token } = useAdminAuth()
  const app = application as any
  const isLoading = Boolean(loading)

  const canEdit = user?.role === "super_admin" || user?.role === "security"

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isCancellingApproval, setIsCancellingApproval] = useState(false)

  // 수정 모드 진입 시 현재 데이터로 초기화
  const startEditing = () => {
    if (!app) return
    setEditData({
      visitor_name: app.visitor_name || "",
      visitor_phone: app.visitor_phone || "",
      visitor_birth_date: app.visitor_birth_date ? new Date(app.visitor_birth_date).toISOString().split("T")[0] : "",
      visitor_organization: app.visitor_organization || "",
      visitor_position: app.visitor_position || "",
      visitor_email: app.visitor_email || app.contact_email || "",
      visitor_address: app.visitor_address || "",
      vehicle_number: app.vehicle_number || "",
      vehicle_model: app.vehicle_model || "",
      spark_arrestor: app.spark_arrestor || "",
      contact_name: app.contact_name || "",
      contact_mobile: app.contact_mobile || "",
      visit_purpose: app.visit_purpose || app.access_purpose || "",
      detailed_purpose: app.detailed_purpose || "",
      access_area: app.access_area || "",
      visit_start_date: app.visit_start_date ? new Date(app.visit_start_date).toISOString().split("T")[0] : "",
      visit_end_date: app.visit_end_date ? new Date(app.visit_end_date).toISOString().split("T")[0] : "",
    })
    setSaveError(null)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditData({})
    setSaveError(null)
  }

  const updateEdit = (field: string, value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!app?.id) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/applications/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "저장 실패")
      }
      setIsEditing(false)
      setEditData({})
      onUpdated?.()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelApproval = async () => {
    if (!app?.id) return
    const confirmed = window.confirm(
      `"${app.visitor_name}" 방문자의 승인을 취소하시겠습니까?\n\n` +
      "• 기존 QR코드가 무효화됩니다.\n" +
      "• 신청자와 담당자에게 취소 안내 문자가 발송됩니다.\n" +
      "• 취소 후 접수 대기 상태로 변경되며 재승인 또는 반려 처리가 가능합니다."
    )
    if (!confirmed) return

    setIsCancellingApproval(true)
    setSaveError(null)
    try {
      const res = await fetch("/api/admin/requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: app.id, action: "cancel" }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "승인 취소 실패")
      }
      onUpdated?.()
      onClose()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "승인 취소 중 오류가 발생했습니다.")
    } finally {
      setIsCancellingApproval(false)
    }
  }

  // 모달 닫힐 때 수정 모드 해제
  useEffect(() => {
    if (!open) {
      setIsEditing(false)
      setEditData({})
      setSaveError(null)
      setIsCancellingApproval(false)
    }
  }, [open])

  const getStatusColor = (status: string) => {
    const statusUpper = status?.toUpperCase() || ""
    switch (statusUpper) {
      case "PENDING": return "bg-amber-500/20 text-amber-300 border-amber-500/50"
      case "APPROVED": return "bg-green-500/20 text-green-300 border-green-500/50"
      case "REJECTED": return "bg-red-500/20 text-red-300 border-red-500/50"
      case "CANCELLED": return "bg-gray-500/20 text-gray-300 border-gray-500/50"
      default: return "bg-blue-500/20 text-blue-300 border-blue-500/50"
    }
  }

  const formatDate = (date: any) => {
    if (!date || date === "Invalid Date") return "-"
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return "-"
      return d.toLocaleDateString("ko-KR")
    } catch { return "-" }
  }

  const InfoField = ({ label, value }: { label: string; value: any }) => (
    <div className="space-y-1">
      <p className="text-[11px] sm:text-xs text-white/40 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-sm sm:text-base text-white font-semibold break-words">{value || "-"}</p>
    </div>
  )

  const applicantPortCerts: any[] = !isLoading && app ? (app.portCertFiles || []) : []
  const generalFiles: any[] = !isLoading && app ? ((app.files || []).filter((f: any) => f.attachment_type !== 'PORT_CERT')) : []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[60vw] xl:max-w-[1200px] max-h-[95vh] sm:max-h-[92vh] overflow-hidden flex flex-col bg-black/95 border border-white/20 text-white p-0 shadow-2xl backdrop-blur-2xl rounded-2xl sm:rounded-3xl">

        {/* 헤더 */}
        <DialogHeader className="flex-shrink-0 border-b border-white/10 p-4 sm:p-8 bg-white/5">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <DialogTitle className="text-xl sm:text-3xl font-black text-white tracking-tight">
                  {isEditing ? "신청 정보 수정" : "신청 상세정보"}
                </DialogTitle>
              </div>
              <p className="text-xs sm:text-sm font-mono text-white/40 truncate">RECEIPT: {app?.receipt || "-"}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* 승인 취소 버튼 (APPROVED 상태일 때만) */}
              {canEdit && !isLoading && app && !isEditing && app.status?.toUpperCase() === "APPROVED" && (
                <Button
                  onClick={handleCancelApproval}
                  disabled={isCancellingApproval}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-bold rounded-xl text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  {isCancellingApproval
                    ? <Loader2 size={14} className="mr-1.5 animate-spin" />
                    : <RotateCcw size={14} className="mr-1.5" />}
                  승인 취소
                </Button>
              )}
              {/* 수정/저장/취소 버튼 */}
              {canEdit && !isLoading && app && !isEditing && (
                <Button
                  onClick={startEditing}
                  className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold rounded-xl text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  <Pencil size={14} className="mr-1.5" />
                  수정
                </Button>
              )}
              {isEditing && (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-bold rounded-xl text-xs sm:text-sm px-3 sm:px-4 py-2"
                  >
                    {isSaving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
                    저장
                  </Button>
                  <Button
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 font-bold rounded-xl text-xs sm:text-sm px-3 sm:px-4 py-2"
                  >
                    <XCircle size={14} className="mr-1.5" />
                    취소
                  </Button>
                </>
              )}
              <Badge className={`${app ? getStatusColor(app.status) : 'bg-white/10'} font-black px-3 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm border-2 rounded-full shadow-lg`}>
                {app ? (APPLICATION_STATUS_LABELS[app.status] || app.status) : "로딩 중"}
              </Badge>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="text-white/40 hover:text-white hover:bg-white/10 rounded-full w-9 h-9 sm:w-12 sm:h-12 transition-all"
              >
                <X className="w-5 h-5 sm:w-7 sm:h-7" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
          {isLoading ? (
            <ModalBodySkeleton />
          ) : (
            <>
              {/* 저장 에러 표시 */}
              {saveError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
                  {saveError}
                </div>
              )}

              {/* 01. 기본정보 */}
              <div className={`bg-white/5 border rounded-2xl sm:rounded-[32px] p-4 sm:p-8 transition-colors ${isEditing ? "border-amber-500/30" : "border-white/10 hover:bg-white/[0.07]"}`}>
                <h3 className="text-lg sm:text-xl font-black text-white mb-5 sm:mb-8 flex items-center gap-2 sm:gap-3">
                  <span className="p-1.5 sm:p-2 bg-amber-500/20 rounded-lg sm:rounded-xl text-amber-500 text-xs sm:text-sm">01</span>
                  기본정보
                  {isEditing && <span className="text-xs text-amber-400/60 font-medium ml-2">수정 중</span>}
                </h3>

                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-5 sm:gap-y-8">
                      {isEditing ? (
                        <>
                          <EditableField label="이름" value={editData.visitor_name} onChange={(v) => updateEdit("visitor_name", v)} />
                          <EditableField label="휴대전화번호" value={editData.visitor_phone} onChange={(v) => updateEdit("visitor_phone", v)} type="tel" />
                          <EditableField label="생년월일" value={editData.visitor_birth_date} onChange={(v) => updateEdit("visitor_birth_date", v)} type="date" />
                          <EditableField label="소속" value={editData.visitor_organization} onChange={(v) => updateEdit("visitor_organization", v)} />
                          <EditableField label="직책" value={editData.visitor_position} onChange={(v) => updateEdit("visitor_position", v)} />
                          <EditableField label="이메일" value={editData.visitor_email} onChange={(v) => updateEdit("visitor_email", v)} type="email" />
                          <EditableField label="회사주소" value={editData.visitor_address} onChange={(v) => updateEdit("visitor_address", v)} />
                          <EditableField label="차량번호" value={editData.vehicle_number} onChange={(v) => updateEdit("vehicle_number", v)} />
                          <EditableSelect label="차량유종" value={editData.vehicle_model} onChange={(v) => updateEdit("vehicle_model", v)} options={VEHICLE_MODEL_OPTIONS} />
                          <EditableSelect label="불꽃방지망보유" value={editData.spark_arrestor} onChange={(v) => updateEdit("spark_arrestor", v)} options={SPARK_ARRESTOR_OPTIONS} />
                        </>
                      ) : (
                        <>
                          <InfoField label="이름" value={app.visitor_name} />
                          <InfoField label="휴대전화번호" value={app.visitor_phone} />
                          <InfoField label="생년월일" value={formatDate(app.visitor_birth_date)} />
                          <InfoField label="소속" value={app.visitor_organization} />
                          <InfoField label="직책" value={app.visitor_position} />
                          <InfoField label="이메일" value={app.visitor_email || app.contact_email} />
                          <InfoField label="회사주소" value={app.visitor_address} />
                          <InfoField label="차량번호" value={app.vehicle_number} />
                          <InfoField label="차량유종" value={app.vehicle_model} />
                          <InfoField
                            label="불꽃방지망보유"
                            value={app.spark_arrestor || "-"}
                          />
                        </>
                      )}
                    </div>

                    {/* 전자기기 — 읽기 전용 */}
                    {app.electronicDevices && app.electronicDevices.length > 0 && (
                      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 space-y-4">
                        <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest">PERSONAL DEVICES</p>
                        <div className="grid grid-cols-1 gap-4">
                          {app.electronicDevices.map((device: any, idx: number) => (
                            <div key={idx} className="bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                              <InfoField label="품명" value={device.item_name} />
                              <InfoField label="모델명" value={device.model_name} />
                              <InfoField label="시리얼" value={device.serial_number} />
                              <InfoField label="사유" value={device.reason} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <AttachmentSection title="첨부파일" files={generalFiles} authToken={token} />
                  </div>

                  {applicantPortCerts.length > 0 && (
                    <div className="w-full md:w-auto flex-shrink-0 space-y-3">
                      <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest">항만이수증</p>
                      <PortCertThumbnails files={applicantPortCerts} authToken={token} />
                    </div>
                  )}
                </div>
              </div>

              {/* 02. 방문정보 */}
              <div className={`bg-white/5 border rounded-2xl sm:rounded-[32px] p-4 sm:p-8 transition-colors ${isEditing ? "border-amber-500/30" : "border-white/10 hover:bg-white/[0.07]"}`}>
                <h3 className="text-lg sm:text-xl font-black text-white mb-5 sm:mb-8 flex items-center gap-2 sm:gap-3">
                  <span className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg sm:rounded-xl text-blue-400 text-xs sm:text-sm">02</span>
                  방문정보
                  {isEditing && <span className="text-xs text-amber-400/60 font-medium ml-2">수정 중</span>}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 sm:gap-x-8 gap-y-5 sm:gap-y-8">
                  {isEditing ? (
                    <>
                      <EditableField label="담당자" value={editData.contact_name} onChange={(v) => updateEdit("contact_name", v)} />
                      <EditableField label="담당자 연락처" value={editData.contact_mobile} onChange={(v) => updateEdit("contact_mobile", v)} type="tel" />
                      <EditableSelect label="방문목적" value={editData.visit_purpose} onChange={(v) => updateEdit("visit_purpose", v)} options={VISIT_PURPOSE_OPTIONS} />
                      <EditableSelect label="출입지역" value={editData.access_area} onChange={(v) => updateEdit("access_area", v)} options={ACCESS_AREA_OPTIONS} />
                      <EditableField label="방문시작일" value={editData.visit_start_date} onChange={(v) => updateEdit("visit_start_date", v)} type="date" />
                      <EditableField label="방문종료일" value={editData.visit_end_date} onChange={(v) => updateEdit("visit_end_date", v)} type="date" />
                    </>
                  ) : (
                    <>
                      <InfoField label="담당자" value={app.contact_name} />
                      <InfoField label="담당자 연락처" value={app.contact_mobile} />
                      <InfoField label="방문목적" value={app.visit_purpose || app.access_purpose} />
                      <InfoField label="출입지역" value={app.access_area} />
                      <InfoField label="방문시작일" value={formatDate(app.visit_start_date || app.access_start_datetime)} />
                      <InfoField label="방문종료일" value={formatDate(app.visit_end_date || app.access_end_datetime)} />
                    </>
                  )}
                </div>
                {isEditing ? (
                  <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                    <p className="text-[11px] sm:text-xs text-amber-500 font-bold mb-2 uppercase tracking-wider">상세 방문 사유</p>
                    <textarea
                      value={editData.detailed_purpose}
                      onChange={(e) => updateEdit("detailed_purpose", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-amber-500/30 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 resize-none transition-all"
                    />
                  </div>
                ) : app.detailed_purpose ? (
                  <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                    <p className="text-xs font-bold text-white/40 mb-3 uppercase tracking-wider">상세 방문 사유</p>
                    <p className="text-sm sm:text-base text-white/90 leading-relaxed bg-black/20 p-4 sm:p-5 rounded-2xl border border-white/5">{app.detailed_purpose}</p>
                  </div>
                ) : null}
              </div>

              {/* 03. 동행인 정보 — 읽기 전용 */}
              {app.companions && app.companions.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[32px] p-4 sm:p-8 transition-colors">
                  <h3 className="text-lg sm:text-xl font-black text-white mb-5 sm:mb-8 flex items-center gap-2 sm:gap-3">
                    <span className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg sm:rounded-xl text-purple-400 text-xs sm:text-sm">03</span>
                    동행인 정보 ({app.companions.length}명)
                  </h3>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                    {app.companions.map((companion: any, idx: number) => {
                      const companionPortCerts = companion.portCertFiles || []
                      return (
                        <div key={idx} className="bg-black/40 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
                          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
                            <div className="flex-1 min-w-0 w-full space-y-4 sm:space-y-5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5">
                                <InfoField label="이름" value={companion.name} />
                                <InfoField label="연락처" value={companion.phone} />
                                <InfoField label="생년월일" value={formatDate(companion.birth_date)} />
                                <InfoField label="소속" value={companion.organization} />
                                <InfoField label="직책" value={companion.position} />
                              </div>
                              {companion.electronicDevices && companion.electronicDevices.length > 0 && (
                                <div className="pt-4 border-t border-white/10">
                                  <p className="text-[10px] font-black text-white/40 mb-3 uppercase tracking-widest">Device List</p>
                                  {companion.electronicDevices.map((d: any, dIdx: number) => (
                                    <div key={dIdx} className="bg-white/5 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                                      <span className="text-white/60">{d.item_name} ({d.model_name})</span>
                                      <span className="text-white/40 sm:text-right font-mono">{d.serial_number}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {companionPortCerts.length > 0 && (
                              <div className="w-full md:w-auto flex-shrink-0 space-y-3">
                                <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest">항만이수증</p>
                                <PortCertThumbnails files={companionPortCerts} authToken={token} />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 출입 이력 */}
              {scanHistory.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[32px] p-4 sm:p-8 transition-colors">
                  <h3 className="text-lg sm:text-xl font-black text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                    <span className="p-1.5 sm:p-2 bg-emerald-500/20 rounded-lg sm:rounded-xl text-emerald-400 text-xs sm:text-sm">
                      {app.companions && app.companions.length > 0 ? "04" : "03"}
                    </span>
                    출입 이력
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-xs font-black text-white/40 uppercase tracking-wider pb-3 pr-4 sm:pr-6">구분</th>
                          <th className="text-left text-xs font-black text-white/40 uppercase tracking-wider pb-3 pr-4 sm:pr-6">시각</th>
                          <th className="text-left text-xs font-black text-white/40 uppercase tracking-wider pb-3">출입구</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const GATE_LABELS: Record<string, string> = { main: "정문", pier_1: "제1부두", pier_2: "제2부두" }
                          const formatDT = (dt: string) => {
                            try {
                              const d = new Date(dt)
                              const yy = d.getUTCFullYear().toString().slice(-2)
                              const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0')
                              const dd = d.getUTCDate().toString().padStart(2, '0')
                              const hh = d.getUTCHours().toString().padStart(2, '0')
                              const min = d.getUTCMinutes().toString().padStart(2, '0')
                              return `${yy}.${mm}.${dd} ${hh}:${min}`
                            } catch { return dt }
                          }
                          const pierScans = scanHistory.filter(item =>
                            item.scan_site === 'pier_1' || item.scan_site === 'pier_2'
                          )
                          const displayScans = pierScans.length > 0 ? pierScans : scanHistory
                          return displayScans.map((item) => (
                            <tr key={item.scan_id} className="border-b border-white/5">
                              <td className="py-3 pr-4 sm:pr-6">
                                {item.direction === "ENTRY"
                                  ? <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black">입장</span>
                                  : <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black">퇴장</span>
                                }
                              </td>
                              <td className="py-3 pr-4 sm:pr-6 text-white font-mono text-xs sm:text-sm">{formatDT(item.scanned_at)}</td>
                              <td className="py-3 text-white/60 text-xs sm:text-sm">{GATE_LABELS[item.scan_site] || item.scan_site}</td>
                            </tr>
                          ))
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 반려 사유 */}
              {app.rejection_reason && (
                <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl sm:rounded-[32px] p-4 sm:p-8">
                  <h3 className="text-lg sm:text-xl font-black text-red-400 mb-4">반려 사유 안내</h3>
                  <div className="bg-black/20 p-4 sm:p-6 rounded-2xl border border-red-500/10 text-white/90 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {app.rejection_reason}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}