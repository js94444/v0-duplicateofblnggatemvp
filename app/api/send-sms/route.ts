import { type NextRequest, NextResponse } from "next/server"
import { sendSms } from "@/lib/services/solapi"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { to, text } = await request.json()

    if (!to || !text) {
      return NextResponse.json(
        { code: "INVALID_PARAMS", message: "to와 text 파라미터가 필요합니다" },
        { status: 400 }
      )
    }

    const result = await sendSms(to, text)
    if (!result.success) {
      return NextResponse.json(
        { code: "SMS_ERROR", message: result.error || "SMS 발송 실패" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "SMS 발송 완료" })
  } catch (error) {
    console.error("[send-sms] error:", error)
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "서버 오류" },
      { status: 500 }
    )
  }
}
