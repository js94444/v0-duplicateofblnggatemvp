import { type NextRequest, NextResponse } from "next/server"
import { validateAdminCredentials, generateAdminToken, MOCK_ADMIN_USER } from "@/lib/auth/admin"

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        {
          code: "MISSING_CREDENTIALS",
          message: "아이디와 비밀번호를 입력해주세요",
        },
        { status: 400 },
      )
    }

    // TODO: Replace with proper authentication
    const isValid = validateAdminCredentials(username, password)

    if (!isValid) {
      return NextResponse.json(
        {
          code: "INVALID_CREDENTIALS",
          message: "아이디 또는 비밀번호가 올바르지 않습니다",
        },
        { status: 401 },
      )
    }

    const token = generateAdminToken(MOCK_ADMIN_USER)

    return NextResponse.json({
      token,
      user: MOCK_ADMIN_USER,
      message: "로그인 성공",
    })
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "서버 오류가 발생했습니다",
      },
      { status: 500 },
    )
  }
}
