import { type NextRequest, NextResponse } from "next/server"
import { validateAdminToken, hashPassword } from "@/lib/auth/admin"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "인증이 필요합니다" }, { status: 401 })
    }

    const user = validateAdminToken(token)
    if (!user) {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "인증이 만료되었습니다" }, { status: 401 })
    }

    const { current_password, new_password } = await request.json()

    // 현재 비밀번호 검증
    if (!current_password) {
      return NextResponse.json({ code: "MISSING_CURRENT_PASSWORD", message: "현재 비밀번호를 입력해주세요" }, { status: 400 })
    }

    const account = await AzureSqlDB.getAccountByUsername(user.username)
    if (!account) {
      return NextResponse.json({ code: "ACCOUNT_NOT_FOUND", message: "계정을 찾을 수 없습니다" }, { status: 404 })
    }

    const bcrypt = await import("bcryptjs")
    const isCurrentValid = await bcrypt.compare(current_password, account.password_hash)
    if (!isCurrentValid) {
      return NextResponse.json({ code: "WRONG_PASSWORD", message: "현재 비밀번호가 올바르지 않습니다" }, { status: 401 })
    }

    // 새 비밀번호 정책: 최소 8자, 영문+숫자+특수문자 포함
    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ code: "INVALID_PASSWORD", message: "새 비밀번호는 8자 이상이어야 합니다" }, { status: 400 })
    }

    const hasLetter = /[a-zA-Z]/.test(new_password)
    const hasNumber = /[0-9]/.test(new_password)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(new_password)
    if (!hasLetter || !hasNumber || !hasSpecial) {
      return NextResponse.json({ code: "WEAK_PASSWORD", message: "비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다" }, { status: 400 })
    }

    const hash = await hashPassword(new_password)
    await AzureSqlDB.updatePassword(Number(user.id), hash)

    return NextResponse.json({ message: "비밀번호가 변경되었습니다" })
  } catch (error) {
    console.error("[change-password] error:", error)
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}
