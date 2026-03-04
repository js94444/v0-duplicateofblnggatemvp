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

    if (!new_password || new_password.length < 6) {
      return NextResponse.json({ code: "INVALID_PASSWORD", message: "새 비밀번호는 6자 이상이어야 합니다" }, { status: 400 })
    }

    const hash = await hashPassword(new_password)
    await AzureSqlDB.updatePassword(Number(user.id), hash)

    return NextResponse.json({ message: "비밀번호가 변경되었습니다" })
  } catch (error) {
    console.error("[change-password] error:", error)
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다" }, { status: 500 })
  }
}
