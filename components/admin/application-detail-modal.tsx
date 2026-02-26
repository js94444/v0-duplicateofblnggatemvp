import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { type Application, APPLICATION_STATUS_LABELS } from "@/lib/types"
import { X, Download, Loader2 } from "lucide-react"

interface ApplicationDetailModalProps {
  application: Application
  open: boolean
  loading?: boolean
  onClose: () => void
}

export function ApplicationDetailModal({ application, open, loading = false, onClose }: ApplicationDetailModalProps) {
  const app = application as any
  
  const getStatusColor = (status: string) => {
    const statusUpper = status.toUpperCase()
    switch (statusUpper) {
      case "PENDING":
        return "bg-amber-500/20 text-amber-300 border-amber-500/50"
      case "APPROVED":
        return "bg-green-500/20 text-green-300 border-green-500/50"
      case "REJECTED":
        return "bg-red-500/20 text-red-300 border-red-500/50"
      case "CANCELLED":
        return "bg-gray-500/20 text-gray-300 border-gray-500/50"
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-500/50"
    }
  }

  const formatDate = (date: any) => {
    if (!date || date === "Invalid Date") return "-"
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return "-"
      return d.toLocaleDateString("ko-KR")
    } catch {
      return "-"
    }
  }

  const InfoField = ({ label, value }: { label: string; value: any }) => (
    <div>
      <p className="text-xs text-white/40 mb-1 font-bold">{label}</p>
      <p className="text-sm text-white font-medium break-words">{value || "-"}</p>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col bg-black/95 border-white/20 text-white">
        <DialogHeader className="flex-shrink-0 border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <div>
  <div className="flex items-center gap-2">
    <DialogTitle className="text-2xl font-black text-white mb-2">신청 상세정보</DialogTitle>
    {loading && <Loader2 className="w-5 h-5 text-[#0298c2] animate-spin mb-2" />}
  </div>
  <p className="text-sm text-white/40">접수번호: {app.receipt}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor(app.status)} font-bold px-4 py-2`}>
                {APPLICATION_STATUS_LABELS[app.status] || app.status}
              </Badge>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X size={20} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-2xl bg-white/10" />
              <Skeleton className="h-24 w-full rounded-2xl bg-white/10" />
              <Skeleton className="h-24 w-full rounded-2xl bg-white/10" />
              <Skeleton className="h-20 w-full rounded-2xl bg-white/10" />
            </div>
          ) : (<>

          {/* 기본정보 카드 */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <span className="text-amber-500">📋</span>
              기본정보
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* 전자기기 정보 */}
            {app.electronicDevices && app.electronicDevices.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="text-sm font-bold text-white/80 mb-3">전자기기 정보</h4>
                <div className="space-y-3">
                  {app.electronicDevices.map((device: any, idx: number) => (
                    <div key={idx} className="bg-white/5 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <InfoField label="품명" value={device.item_name} />
                      <InfoField label="모델명" value={device.model_name} />
                      <InfoField label="시리얼넘버" value={device.serial_number} />
                      <InfoField label="사유" value={device.reason} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 방문정보 카드 */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <span className="text-amber-500">📅</span>
              방문정보
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoField label="담당자" value={app.contact_name} />
              <InfoField label="담당자 연락처" value={app.contact_mobile} />
              <InfoField label="방문목적" value={app.visit_purpose || app.access_purpose} />
              <InfoField label="출입지역" value={app.access_area} />
              <InfoField label="방문시작일" value={formatDate(app.visit_start_date || app.access_start_datetime)} />
              <InfoField label="방문종료일" value={formatDate(app.visit_end_date || app.access_end_datetime)} />
            </div>
            {app.detailed_purpose && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">상세 방문 사유</label>
                <p className="text-sm text-white/80 mt-2 whitespace-pre-wrap">{app.detailed_purpose}</p>
              </div>
            )}
          </div>

          {/* 동행인 정보 카드 */}
          {app.companions && app.companions.length > 0 && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <span className="text-amber-500">👥</span>
                동행인 정보 ({app.companions.length}명)
              </h3>
              <div className="space-y-4">
                {app.companions.map((companion: any, idx: number) => (
                  <div key={idx} className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <InfoField label="이름" value={companion.name} />
                      <InfoField label="휴대전화번호" value={companion.phone} />
                      <InfoField label="생년월일" value={formatDate(companion.birth_date)} />
                      <InfoField label="소속" value={companion.organization} />
                      <InfoField label="직책" value={companion.position} />
                    </div>
                    
                    {/* 동행인 전자기기 */}
                    {companion.electronicDevices && companion.electronicDevices.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <h5 className="text-xs font-bold text-white/60 mb-2">전자기기</h5>
                        <div className="space-y-2">
                          {companion.electronicDevices.map((device: any, deviceIdx: number) => (
                            <div key={deviceIdx} className="bg-white/5 rounded-xl p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                              <InfoField label="품명" value={device.item_name} />
                              <InfoField label="모델명" value={device.model_name} />
                              <InfoField label="시리얼넘버" value={device.serial_number} />
                              <InfoField label="사유" value={device.reason} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 첨부파일 카드 */}
          {app.files && app.files.length > 0 && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <span className="text-amber-500">📎</span>
                첨부파일 ({app.files.length}개)
              </h3>
              <div className="space-y-2">
                {app.files.map((file: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl">📄</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{file.filename}</p>
                        {file.size && (
                          <p className="text-xs text-white/40">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                    </div>
                    {(file.key || file.url) && (
                      <Button
                        onClick={() => {
                          // key 또는 blob_url 전체를 API에 전달 (서버에서 blob name 추출)
                          const identifier = file.key || file.url
                          window.open(`/api/files/${encodeURIComponent(identifier)}`, '_blank')
                        }}
                        size="sm"
                        className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-lg"
                      >
                        <Download size={16} className="mr-1" />
                        다운로드
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 거부 사유 */}
          {app.rejection_reason && (
            <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-3xl p-6">
              <h3 className="text-lg font-black text-red-300 mb-3 flex items-center gap-2">
                <span>❌</span>
                반려 사유
              </h3>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{app.rejection_reason}</p>
            </div>
          )}

          </>)}
        </div>
      </DialogContent>
    </Dialog>
  )
}
