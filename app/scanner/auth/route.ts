import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export const runtime = "nodejs"

// 스캐너 PIN 인증 API
// 환경변수 SCANNER_PIN이 설정되어 있으면 해당 PIN으로 인증
// 설정되어 있지 않으면 기본값 "0000" 사용 (반드시 변경 필요)
export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { success: false, message: "PIN을 입력해주세요." },
        { status: 400 }
      )
    }

    const validPin = process.env.SCANNER_PIN || "0000"

    if (pin !== validPin) {
      return NextResponse.json(
        { success: false, message: "PIN이 올바르지 않습니다." },
        { status: 401 }
      )
    }

    // 인증 성공 - 스캐너 토큰 생성 (24시간 유효)
    const tokenData = {
      type: "scanner",
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24시간
      nonce: crypto.randomBytes(16).toString("hex"),
    }

    const token = Buffer.from(JSON.stringify(tokenData)).toString("base64")

    return NextResponse.json({
      success: true,
      token,
      message: "스캐너 인증 완료",
    })
  } catch (e) {
    console.error("[Scanner Auth] Error:", e)
    return NextResponse.json(
      { success: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
