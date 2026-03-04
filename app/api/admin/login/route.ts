import { type NextRequest, NextResponse } from "next/server"
import { validateAdminCredentials, generateAdminToken } from "@/lib/auth/admin"
import bcrypt from "bcryptjs"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

// 초기 설정 엔드포인트 — 슈퍼어드민 비밀번호 해시를 서버에서 생성해 DB에 직접 업데이트
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get("secret")
  const password = searchParams.get("password") || "Admin@1234"

  if (secret !== "blink-setup-2026") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const hash = await bcrypt.hash(password, 10)
  await AzureSqlDB.updatePassword(1, hash)

  return NextResponse.json({
    ok: true,
    message: "비밀번호가 업데이트되었습니다. 이제 로그인하세요.",
    username: "admin",
    password,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { code: "MISSING_CREDENTIALS", message: "아이디와 비밀번호를 입력해주세요" },
        { status: 400 }
      )
    }

    const user = await validateAdminCredentials(username, password)

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
