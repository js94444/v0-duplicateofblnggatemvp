/**
 * Solapi SMS 발송 서비스 (LMS - 장문 문자)
 * 신청 승인 시 QR 코드 URL 포함해서 발송
 */

import { SolapiMessageService } from "solapi"

const FROM = process.env.SOLAPI_FROM
const API_KEY = process.env.SOLAPI_API_KEY
const API_SECRET = process.env.SOLAPI_API_SECRET

export interface SmsResult {
  success: boolean
  error?: string
}

/** 휴대폰 번호 정규화 (숫자만 추출) */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== "string") return ""
  return phone.replace(/[^0-9]/g, "")
}

/**
 * LMS 문자 발송 (한글 등 장문)
 */
export async function sendSms(to: string, text: string): Promise<SmsResult> {
  const normalizedTo = normalizePhone(to)
  if (!normalizedTo || normalizedTo.length < 10) {
    return { success: false, error: "유효하지 않은 수신 번호" }
  }

  if (!API_KEY || !API_SECRET || !FROM) {
    console.error("[SMS] 환경변수 미설정: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_FROM")
    return { success: false, error: "SMS 발송 설정이 없습니다." }
  }

  try {
    const messageService = new SolapiMessageService(API_KEY, API_SECRET)
    await messageService.sendOne({
      to: normalizedTo,
      from: FROM,
      text,
      type: "LMS",
      subject: "B-Link 방문 안내",
    })
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[SMS] 발송 실패:", message)
    return { success: false, error: message }
  }
}
