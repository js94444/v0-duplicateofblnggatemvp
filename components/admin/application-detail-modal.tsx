"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { type Application, APPLICATION_STATUS_LABELS } from "@/lib/types"
import { X, Download, FileText, ZoomIn, Loader2 } from "lucide-react"

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
}

// 이미지 파일인지 확인
function isImageFile(filename: string, fileType?: string): boolean {
  const ext = filename?.split(".").pop()?.toLowerCase() || ""
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) return true
  if (fileType?.startsWith("image/")) return true
  return false
}

// 라이트박스 컴포넌트
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
      >
        <X size={20} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

// 썸네일 카드 — 이미지는 실제 이미지로, PDF는 아이콘으로 표시
function FileThumbnail({ file, onLightbox }: { file: any; onLightbox: (url: string, name: string) => void }) {
  const fileUrl = file.url || file.key
  const isImage = isImageFile(file.filename || "", file.type)
  const previewUrl = fileUrl ? `/api/files/${encodeURIComponent(fileUrl)}` : null

  if (isImage && previewUrl) {
    return (
      <div className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-black/40 hover:border-amber-500/50 transition-all cursor-pointer w-full sm:w-[200px]">
        {/* 썸네일 이미지 */}
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
          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn size={24} className="text-white drop-shadow-lg" />
          </div>
        </div>
        {/* 하단 파일명 + 다운로드 */}
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

  // PDF / 기타 문서
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

// 항만이수증 전용 썸네일 목록 — 라이트박스 포함
function PortCertThumbnails({ files }: { files: any[] }) {
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null)

  if (!files || files.length === 0) return null

  return (
    <>
      <div className="flex flex-col gap-3">
        {files.map((file, idx) => (
          <FileThumbnail
            key={idx}
            file={file}
            onLightbox={(url, name) => setLightbox({ url, name })}
          />
        ))}
      </div>
      {lightbox && (
        <Lightbox src={lightbox.url} alt={lightbox.name} onClose={() => setLightbox(null)} />
      )}
    </>
  )
}

// 첨부파일 섹션 — 이미지는 썸네일 그리드, 문서는 리스트
function AttachmentSection({ title, files }: { title: string; files: any[] }) {
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null)

  if (!files || files.length === 0) return null

  const imageFiles = files.filter((f) => isImageFile(f.filename || "", f.type))
  const docFiles = files.filter((f) => !isImageFile(f.filename || "", f.type))

  return (
    <div className="pt-6 border-t border-white/10 space-y-3">
      <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest">{title}</p>

      {/* 이미지 썸네일 그리드 */}
      {imageFiles.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {imageFiles.map((file, idx) => (
            <FileThumbnail
              key={idx}
              file={file}
              onLightbox={(url, name) => setLightbox({ url, name })}
            />
          ))}
        </div>
      )}

      {/* 문서 파일 리스트 */}
      {docFiles.length > 0 && (
        <div className="grid grid-cols-1 gap-2 mt-2">
          {docFiles.map((file, idx) => (
            <FileThumbnail key={idx} file={file} onLightbox={() => { }} />
          ))}
        </div>
      )}

      {/* 라이트박스 */}
      {lightbox && (
        <Lightbox
          src={lightbox.url}
          alt={lightbox.name}
          onClose={() => setLightbox(null)}
        />
      )}
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

      {/* 01 기본정보 카드 형태 */}
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
        <div className="flex flex-wrap gap-3 pt-2">
          <Skeleton className="h-[200px] w-full rounded-2xl bg-white/10 sm:h-[220px] sm:w-[180px]" />
          <Skeleton className="h-[200px] w-full rounded-2xl bg-white/10 sm:h-[220px] sm:w-[180px]" />
        </div>
      </div>

      {/* 02 방문정보 카드 형태 */}
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
        <Skeleton className="h-24 w-full rounded-2xl bg-white/10" />
      </div>
    </div>
  )
}

export function ApplicationDetailModal({ application, open, loading = false, scanHistory = [], onClose }: ApplicationDetailModalProps) {
  const app = application as any
  /** 부모에서 fetch 중일 때 true로 넘기면 스켈레톤·로딩 문구가 표시됩니다 */
  const isLoading = Boolean(loading)

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
      {/* shadcn DialogContent가 우측 상단 기본 X를 렌더링하므로 숨김(헤더 닫기만 사용) */}
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[60vw] xl:max-w-[1200px] max-h-[95vh] sm:max-h-[92vh] overflow-hidden flex flex-col bg-black/95 border border-white/20 text-white p-0 shadow-2xl backdrop-blur-2xl rounded-2xl sm:rounded-3xl [&>button]:hidden">

        {/* 헤더 */}
        <DialogHeader className="flex-shrink-0 border-b border-white/10 p-4 sm:p-8 bg-white/5">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <DialogTitle className="text-xl sm:text-3xl font-black text-white tracking-tight">신청 상세정보</DialogTitle>
              </div>
              <p className="text-xs sm:text-sm font-mono text-white/40 truncate flex items-center gap-2 min-h-[1.25rem]">
                RECEIPT:{" "}
                {isLoading ? (
                  <Skeleton className="inline-block h-4 w-28 rounded bg-white/10 align-middle sm:w-36" />
                ) : (
                  app?.receipt || "-"
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <Badge className={`${app ? getStatusColor(app.status) : 'bg-white/10'} font-black px-3 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm border-2 rounded-full shadow-lg`}>
                {app ? (APPLICATION_STATUS_LABELS[app.status] || app.status) : "로딩 중"}
              </Badge>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="text-white/40 hover:text-white hover:bg-white/10 rounded-full w-9 h-9 sm:w-12 sm:h-12 transition-all"
              >
                <X size={20} className="sm:hidden" />
                <X size={28} className="hidden sm:block" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
          {isLoading ? (
            <ModalBodySkeleton />
          ) : !application ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 sm:px-10 sm:py-16 text-center">
              <p className="text-sm sm:text-base text-white/50">
                표시할 신청 정보가 없습니다. 목록에서 다시 선택하거나 조회를 시도해 주세요.
              </p>
            </div>
          ) : (
            <>
              {/* 01. 기본정보 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[32px] p-4 sm:p-8 hover:bg-white/[0.07] transition-colors">
                <h3 className="text-lg sm:text-xl font-black text-white mb-5 sm:mb-8 flex items-center gap-2 sm:gap-3">
                  <span className="p-1.5 sm:p-2 bg-amber-500/20 rounded-lg sm:rounded-xl text-amber-500 text-xs sm:text-sm">01</span>
                  기본정보
                </h3>

                {/* 모바일: 세로 / 데스크탑: 가로 레이아웃 */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                  {/* 텍스트 필드 */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-5 sm:gap-y-8">
                      <InfoField label="이름" value={app.visitor_name} />
                      <InfoField label="휴대전화번호" value={app.visitor_phone} />
                      <InfoField label="생년월일" value={formatDate(app.visitor_birth_date)} />
                      <InfoField label="소속" value={app.visitor_organization} />
                      <InfoField label="직책" value={app.visitor_position} />
                      <InfoField label="이메일" value={app.visitor_email || app.contact_email} />
                      <InfoField label="회사주소" value={app.visitor_address} />
                      <InfoField label="차량번호" value={app.vehicle_number} />
                      <InfoField label="차량유종" value={app.vehicle_model} />
                      <InfoField label="불꽃방지망보유" value={app.spark_arrestor || "-"} />
                    </div>

                    {/* 본인 전자기기 */}
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

                    {/* 일반 첨부파일 */}
                    <AttachmentSection title="첨부파일" files={generalFiles} />
                  </div>

                  {/* 항만이수증 썸네일 */}
                  {applicantPortCerts.length > 0 && (
                    <div className="w-full md:w-auto flex-shrink-0 space-y-3">
                      <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest">항만이수증</p>
                      <PortCertThumbnails files={applicantPortCerts} />
                    </div>
                  )}
                </div>
              </div>

              {/* 02. 방문정보 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[32px] p-4 sm:p-8 hover:bg-white/[0.07] transition-colors">
                <h3 className="text-lg sm:text-xl font-black text-white mb-5 sm:mb-8 flex items-center gap-2 sm:gap-3">
                  <span className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg sm:rounded-xl text-blue-400 text-xs sm:text-sm">02</span>
                  방문정보
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 sm:gap-x-8 gap-y-5 sm:gap-y-8">
                  <InfoField label="담당자" value={app.contact_name} />
                  <InfoField label="담당자 연락처" value={app.contact_mobile} />
                  <InfoField label="방문목적" value={app.visit_purpose || app.access_purpose} />
                  <InfoField label="출입지역" value={app.access_area} />
                  <InfoField label="방문시작일" value={formatDate(app.visit_start_date || app.access_start_datetime)} />
                  <InfoField label="방문종료일" value={formatDate(app.visit_end_date || app.access_end_datetime)} />
                </div>
                {app.detailed_purpose && (
                  <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                    <p className="text-xs font-bold text-white/40 mb-3 uppercase tracking-wider">상세 방문 사유</p>
                    <p className="text-sm sm:text-base text-white/90 leading-relaxed bg-black/20 p-4 sm:p-5 rounded-2xl border border-white/5">{app.detailed_purpose}</p>
                  </div>
                )}
              </div>

              {/* 03. 동행인 정보 */}
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
                            {/* 텍스트 필드 */}
                            <div className="flex-1 min-w-0 w-full space-y-4 sm:space-y-5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5">
                                <InfoField label="이름" value={companion.name} />
                                <InfoField label="연락처" value={companion.phone} />
                                <InfoField label="생년월일" value={formatDate(companion.birth_date)} />
                                <InfoField label="소속" value={companion.organization} />
                                <InfoField label="직책" value={companion.position} />
                              </div>

                              {/* 동행인 전자기기 */}
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

                            {/* 동행인 항만이수증 썸네일 */}
                            {companionPortCerts.length > 0 && (
                              <div className="w-full md:w-auto flex-shrink-0 space-y-3">
                                <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest">항만이수증</p>
                                <PortCertThumbnails files={companionPortCerts} />
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
