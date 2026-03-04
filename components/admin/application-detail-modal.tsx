"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { type Application, APPLICATION_STATUS_LABELS } from "@/lib/types"
import { X, Download, FileText, Image as ImageIcon } from "lucide-react"

interface ApplicationDetailModalProps {
  application: Application
  open: boolean
  loading?: boolean
  onClose: () => void
}

// 이미지 파일인지 확인
function isImageFile(filename: string, fileType?: string): boolean {
  const ext = filename?.split(".").pop()?.toLowerCase() || ""
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp"]
  if (imageExts.includes(ext)) return true
  if (fileType && fileType.startsWith("image/")) return true
  return false
}

// 파일 카드 컴포넌트 — 이미지는 호버 시 카드 하단에 미리보기
function FileCard({ file }: { file: any }) {
  const [hovered, setHovered] = useState(false)
  const fileUrl = file.url || file.key
  const isImage = isImageFile(file.filename || "", file.type)
  const previewUrl = fileUrl ? `/api/files/${encodeURIComponent(fileUrl)}` : null

  return (
    <div className="relative">
      <div
        className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl p-4 group hover:border-amber-500/40 transition-all"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
            {isImage
              ? <ImageIcon size={18} className="text-blue-400" />
              : <FileText size={18} className="text-amber-400" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate max-w-[180px]">{file.filename || "파일"}</p>
            <p className="text-xs text-white/30 uppercase tracking-wider">{isImage ? "IMAGE" : "DOCUMENT"}</p>
          </div>
        </div>
        {previewUrl && (
          <Button
            onClick={() => window.open(previewUrl, "_blank")}
            size="icon"
            className="bg-white/5 hover:bg-amber-500 text-white/60 hover:text-black rounded-xl transition-all flex-shrink-0"
            title="다운로드 / 열기"
          >
            <Download size={16} />
          </Button>
        )}
      </div>

      {/* 호버 시 이미지 미리보기 — 카드 하단 */}
      {isImage && hovered && previewUrl && (
        <div className="mt-2 rounded-2xl overflow-hidden border border-amber-500/30 bg-black/60 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={file.filename}
            className="w-full object-contain max-h-64"
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}

// 첨부파일 섹션 컴포넌트
function AttachmentSection({ title, files }: { title: string; files: any[] }) {
  if (!files || files.length === 0) return null
  return (
    <div className="pt-6 border-t border-white/10 space-y-3">
      <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest">{title}</p>
      <div className="grid grid-cols-1 gap-2">
        {files.map((file: any, idx: number) => (
          <FileCard key={idx} file={file} />
        ))}
      </div>
    </div>
  )
}

export function ApplicationDetailModal({ application, open, loading = false, onClose }: ApplicationDetailModalProps) {
  const app = application as any

  const getStatusColor = (status: string) => {
    const statusUpper = status?.toUpperCase() || ""
    switch (statusUpper) {
      case "PENDING":       return "bg-amber-500/20 text-amber-300 border-amber-500/50"
      case "APPROVED":      return "bg-green-500/20 text-green-300 border-green-500/50"
      case "REJECTED":      return "bg-red-500/20 text-red-300 border-red-500/50"
      case "CANCELLED":     return "bg-gray-500/20 text-gray-300 border-gray-500/50"
      default:              return "bg-blue-500/20 text-blue-300 border-blue-500/50"
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
      <p className="text-xs text-white/40 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-base text-white font-semibold break-words">{value || "-"}</p>
    </div>
  )

  // 신청자 본인 항만이수증
  const applicantPortCerts: any[] = app.portCertFiles || []
  // 일반 첨부파일 (기존 GENERAL 타입)
  const generalFiles: any[] = (app.files || []).filter((f: any) => f.attachment_type !== 'PORT_CERT')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[60vw] xl:max-w-[1200px] max-h-[92vh] overflow-hidden flex flex-col bg-black/95 border border-white/20 text-white p-0 shadow-2xl backdrop-blur-2xl">

        {/* 헤더 */}
        <DialogHeader className="flex-shrink-0 border-b border-white/10 p-8 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-3xl font-black text-white tracking-tight">신청 상세정보</DialogTitle>
              </div>
              <p className="text-sm font-mono text-white/40">RECEIPT NO: {app.receipt}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={`${getStatusColor(app.status)} font-black px-6 py-2.5 text-sm border-2 rounded-full shadow-lg`}>
                {APPLICATION_STATUS_LABELS[app.status] || app.status}
              </Badge>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="text-white/40 hover:text-white hover:bg-white/10 rounded-full w-12 h-12 transition-all"
              >
                <X size={28} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-3xl bg-white/5" />
              <Skeleton className="h-48 w-full rounded-3xl bg-white/5" />
              <Skeleton className="h-48 w-full rounded-3xl bg-white/5" />
            </div>
          ) : (
            <>
              {/* 01. 기본정보 */}
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.07] transition-colors">
                <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                  <span className="p-2 bg-amber-500/20 rounded-xl text-amber-500 text-sm">01</span>
                  기본정보
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-8">
                  <InfoField label="이름" value={app.visitor_name} />
                  <InfoField label="휴대전화번호" value={app.visitor_phone} />
                  <InfoField label="생년월일" value={formatDate(app.visitor_birth_date)} />
                  <InfoField label="소속" value={app.visitor_organization} />
                  <InfoField label="직책" value={app.visitor_position} />
                  <InfoField label="이메일" value={app.visitor_email || app.contact_email} />
                  <InfoField label="회사주소" value={app.visitor_address} />
                  <InfoField label="차량번호" value={app.vehicle_number} />
                  <InfoField label="차종" value={app.vehicle_model} />
                </div>

                {/* 본인 전자기기 */}
                {app.electronicDevices && app.electronicDevices.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                    <p className="text-xs font-black text-amber-500/80 uppercase tracking-widest">PERSONAL DEVICES</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {app.electronicDevices.map((device: any, idx: number) => (
                        <div key={idx} className="bg-black/40 border border-white/5 rounded-2xl p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <InfoField label="품명" value={device.item_name} />
                          <InfoField label="모델명" value={device.model_name} />
                          <InfoField label="시리얼" value={device.serial_number} />
                          <InfoField label="사유" value={device.reason} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 신청자 본인 항만이수증 */}
                <AttachmentSection title="항만이수증 (신청자)" files={applicantPortCerts} />

                {/* 일반 첨부파일 */}
                <AttachmentSection title="첨부파일" files={generalFiles} />
              </div>

              {/* 02. 방문정보 */}
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.07] transition-colors">
                <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                  <span className="p-2 bg-blue-500/20 rounded-xl text-blue-400 text-sm">02</span>
                  방문정보
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-8">
                  <InfoField label="담당자" value={app.contact_name} />
                  <InfoField label="담당자 연락처" value={app.contact_mobile} />
                  <InfoField label="방문목적" value={app.visit_purpose || app.access_purpose} />
                  <InfoField label="출입지역" value={app.access_area} />
                  <InfoField label="방문시작일" value={formatDate(app.visit_start_date || app.access_start_datetime)} />
                  <InfoField label="방문종료일" value={formatDate(app.visit_end_date || app.access_end_datetime)} />
                </div>
                {app.detailed_purpose && (
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-xs font-bold text-white/40 mb-3 uppercase tracking-wider">상세 방문 사유</p>
                    <p className="text-base text-white/90 leading-relaxed bg-black/20 p-5 rounded-2xl border border-white/5">{app.detailed_purpose}</p>
                  </div>
                )}
              </div>

              {/* 03. 동행인 정보 */}
              {app.companions && app.companions.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 transition-colors">
                  <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                    <span className="p-2 bg-purple-500/20 rounded-xl text-purple-400 text-sm">03</span>
                    동행인 정보 ({app.companions.length}명)
                  </h3>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {app.companions.map((companion: any, idx: number) => (
                      <div key={idx} className="bg-black/40 border border-white/10 rounded-3xl p-6 space-y-5">
                        {/* 이름 / 생년월일 — 이수증 비교를 위해 상단에 크게 */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <InfoField label="이름" value={companion.name} />
                          <InfoField label="연락처" value={companion.phone} />
                          <InfoField label="생년월일" value={formatDate(companion.birth_date)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoField label="소속" value={companion.organization} />
                          <InfoField label="직책" value={companion.position} />
                        </div>

                        {/* 동행인 전자기기 */}
                        {companion.electronicDevices && companion.electronicDevices.length > 0 && (
                          <div className="pt-4 border-t border-white/10">
                            <p className="text-[10px] font-black text-white/40 mb-3 uppercase tracking-widest">Device List</p>
                            {companion.electronicDevices.map((d: any, dIdx: number) => (
                              <div key={dIdx} className="bg-white/5 rounded-xl p-3 grid grid-cols-2 gap-2 text-sm mb-2">
                                <span className="text-white/60">{d.item_name} ({d.model_name})</span>
                                <span className="text-white/40 text-right font-mono">{d.serial_number}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 동행인 항만이수증 */}
                        <AttachmentSection
                          title={`항만이수증 — ${companion.name || `동행인 ${idx + 1}`}`}
                          files={companion.portCertFiles || []}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 반려 사유 */}
              {app.rejection_reason && (
                <div className="bg-red-500/10 border-2 border-red-500/30 rounded-[32px] p-8">
                  <h3 className="text-xl font-black text-red-400 mb-4">반려 사유 안내</h3>
                  <div className="bg-black/20 p-6 rounded-2xl border border-red-500/10 text-white/90 leading-relaxed whitespace-pre-wrap">
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
