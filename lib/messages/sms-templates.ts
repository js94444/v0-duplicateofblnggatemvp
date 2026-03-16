/**
 * SMS 메시지 템플릿
 * - 신청 접수 시: 담당자·관리자용
 * - 승인 시: 신청자용 (QR 코드 URL 포함)
 * - 반려 시: 신청자·담당자용
 * - 취소 시: 담당자·관리자용
 */

const TYPE_LABELS: Record<string, string> = {
  VR: "개인방문신청",
  GV: "단체방문신청",
  PA: "항만출입신청",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "접수 대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "신청취소",
  under_review: "검토 중",
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-"
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "")
}

function getTypeLabel(receipt: string): string {
  const code = receipt?.trim().split("-")[0] || ""
  return TYPE_LABELS[code] || receipt || "방문신청"
}

function getStatusLabel(status: string | undefined): string {
  if (!status) return "접수 대기"
  const lower = status.toLowerCase()
  return STATUS_LABELS[lower] || status
}

/** 단체 방문 시 신청자 표기: 대표자만 + "외 N명" */
function formatApplicantName(visitorName: string, companionsCount: number): string {
  const name = (visitorName || "").trim() || "신청자"
  if (companionsCount > 0) {
    return `${name} 외 ${companionsCount}명`
  }
  return name
}

export interface SubmissionSmsPayload {
  receipt: string
  visitor_name: string
  visitor_phone: string
  visitor_organization: string
  visit_start_date: string
  visit_end_date: string
  access_area: string
  visit_purpose: string
  status?: string
  companionsCount?: number
  statusUrl: string
  isChangeResubmission?: boolean
}

export function getSubmissionSmsText(payload: SubmissionSmsPayload, recipientType: 'security' | 'contact' = 'security'): string {
  const typeLabel = getTypeLabel(payload.receipt)
  const applicantName = formatApplicantName(payload.visitor_name, payload.companionsCount ?? 0)
  const period = `${formatDate(payload.visit_start_date)} ~ ${formatDate(payload.visit_end_date)}`
  const statusLabel = getStatusLabel(payload.status)
  const recipientLabel = recipientType === 'security' ? '[보안담당자용]' : '[담당자용]'

  const firstLine = payload.isChangeResubmission
    ? `${recipientLabel} 보령LNG터미널 신청 내용 수정사항이 발생하여, 재접수되었습니다.`
    : `${recipientLabel} 보령LNG터미널 방문 신청이 접수되었습니다.`

  return [
    firstLine,
    "",
    `유형 : ${typeLabel}`,
    `신청자 이름 : ${applicantName}`,
    `소속 : ${payload.visitor_organization || "-"}`,
    `연락처 : ${payload.visitor_phone || "-"}`,
    `방문기간 : ${period}`,
    `출입지역 : ${payload.access_area || "-"}`,
    `방문목적 : ${payload.visit_purpose || "-"}`,
    `접수번호 : ${payload.receipt}`,
    `접수상태 : ${statusLabel}`,
    `URL : ${payload.statusUrl}`,
  ].join("\n")
}

/** 방문 취소 시 담당자·관리자 안내용 */
export interface CancelSmsPayload {
  receipt: string
  visitor_name: string
  visitor_phone: string
  visitor_organization: string
  visit_start_date: string | Date
  visit_end_date: string | Date
  access_area: string
  visit_purpose: string
  statusUrl: string
  companionsCount?: number
}

export function getCancelSmsText(payload: CancelSmsPayload): string {
  const typeLabel = getTypeLabel(payload.receipt)
  const applicantName = formatApplicantName(payload.visitor_name, payload.companionsCount ?? 0)
  const period = `${formatDate(payload.visit_start_date)} ~ ${formatDate(payload.visit_end_date)}`
  const statusLabel = getStatusLabel("cancelled")

  return [
    "보령LNG터미널 방문 신청이 취소 되었습니다.",
    "",
    `유형 : ${typeLabel}`,
    `신청자 이름 : ${applicantName}`,
    `소속 : ${payload.visitor_organization || "-"}`,
    `연락처 : ${payload.visitor_phone || "-"}`,
    `방문기간 : ${period}`,
    `출입지역 : ${payload.access_area || "-"}`,
    `방문목적 : ${payload.visit_purpose || "-"}`,
    `접수번호 : ${payload.receipt}`,
    `접수상태 : ${statusLabel}`,
    `URL : ${payload.statusUrl}`,
  ].join("\n")
}

export interface ApprovalSmsPayload {
  receipt: string
  visit_start_date: string | Date
  visit_end_date: string | Date
  access_area: string
  qr_page_url?: string
}

const APPROVAL_NOTES = [
  "신분증을 반드시 지참해 주세요.",
  "보안검색에 협조해 주세요.",
  "지정된 구역 외 출입을 금지합니다.",
  "안전수칙을 준수해 주세요.",
]

export function getApprovalSmsText(payload: ApprovalSmsPayload, recipientType: 'applicant' | 'companion' = 'applicant'): string {
  const period = `${formatDate(payload.visit_start_date)} ~ ${formatDate(payload.visit_end_date)}`
  const recipientLabel = recipientType === 'companion' ? '[동행인용]' : '[신청자용]'

  const lines = [
    `${recipientLabel} 보령LNG터미널 방문 신청이 승인되었습니다.`,
    "",
    `방문기간 : ${period}`,
    `출입지역 : ${payload.access_area || "-"}`,
    `접수번호 : ${payload.receipt}`,
  ]
  if (payload.qr_page_url?.trim()) {
    lines.push("", `QR 출입권 : ${payload.qr_page_url.trim()}`)
  }
  lines.push("", "유의사항 :", ...APPROVAL_NOTES)
  return lines.join("\n")
}

/** 반려 시 신청자·담당자 안내용 */
export interface RejectionSmsPayload {
  receipt: string
  rejection_reason?: string
}

export function getRejectionSmsText(payload: RejectionSmsPayload, recipientType: 'applicant' | 'contact' = 'applicant'): string {
  const recipientLabel = recipientType === 'contact' ? '[담당자용]' : '[신청자용]'

  const lines = [
    `${recipientLabel} 보령LNG터미널 방문 신청이 반려되었습니다.`,
    "",
    `접수번호 : ${payload.receipt}`,
  ]
  if (payload.rejection_reason?.trim()) {
    lines.push("", `반려 사유 : ${payload.rejection_reason.trim()}`)
  }
  return lines.join("\n")
}

/** Approve API에서 호출용: pass_receipt와 application 객체로 SMS 메시지 생성 */
export function getApprovalSMSMessage(pass_receipt: string | null, application: any, recipientType: 'applicant' | 'companion' = 'applicant'): string {
  const qrUrl = pass_receipt
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://v0-lng-tml.vercel.app'}/qr/${pass_receipt}`
    : null

  // 동행인의 경우 pass_receipt를 접수번호로 사용 (PA-20260310-904-1 형식)
  const receiptNumber = pass_receipt || application.receipt || "N/A"

  return getApprovalSmsText({
    receipt: receiptNumber,
    visit_start_date: application.visit_start_date,
    visit_end_date: application.visit_end_date,
    access_area: application.access_area || "N/A",
    qr_page_url: qrUrl,
  }, recipientType)
}

/** Approve API에서 호출용: 반려 메시지 생성 */
export function getRejectionSMSMessage(application: any, rejection_reason: string, recipientType: 'applicant' | 'contact' = 'applicant'): string {
  return getRejectionSmsText({
    receipt: application.receipt || "N/A",
    rejection_reason,
  }, recipientType)
}
