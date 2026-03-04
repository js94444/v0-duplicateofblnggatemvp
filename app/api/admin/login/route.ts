import { type NextRequest, NextResponse } from "next/server"
import { validateAdminCredentials, generateAdminToken } from "@/lib/auth/admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { code: "MISSING_CREDENTIALS", message: "아이디와 비밀번호를 입력해주세요" },
        { status: 400 }
      )
    }

    console.log("[v0] login attempt:", username)
    const user = await validateAdminCredentials(username, password)
    console.log("[v0] validateAdminCredentials result:", user)

    if (!user) {
      return NextResponse.json(
        { code: "INVALID_CREDENTIALS", message: "아이디 또는 비밀번호가 올바르지 않습니다" },
        { status: 401 }
      )
    }

    const token = generateAdminToken(user)

    return NextResponse.json({
      token,
      user,
      must_change_password: user.must_change_password ?? false,
      message: "로그인 성공",
    })
  } catch (error) {
    console.error("[admin/login] error:", error)
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
