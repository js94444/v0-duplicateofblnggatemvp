import { type NextRequest, NextResponse } from "next/server"
import { validateAdminToken, hashPassword, canManageAccounts } from "@/lib/auth/admin"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

function getUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  return validateAdminToken(token)
}

// 전체 계정 목록 조회 (슈퍼어드민 전용)
export async function GET(request: NextRequest) {
  const user = getUser(request)
  if (!user || !canManageAccounts(user.role)) {
    return NextResponse.json({ code: "FORBIDDEN", message: "권한이 없습니다" }, { status: 403 })
  }
  const accounts = await AzureSqlDB.getAllAccounts()
  return NextResponse.json({ data: accounts })
}

// 계정 생성 (슈퍼어드민 전용)
export async function POST(request: NextRequest) {
  const user = getUser(request)
  if (!user || !canManageAccounts(user.role)) {
    return NextResponse.json({ code: "FORBIDDEN", message: "권한이 없습니다" }, { status: 403 })
  }

  const { username, name, password, role } = await request.json()
  if (!username || !name || !password || !role) {
    return NextResponse.json({ code: "MISSING_FIELDS", message: "모든 필드를 입력해주세요" }, { status: 400 })
  }
  if (!["super_admin", "security", "manager"].includes(role)) {
    return NextResponse.json({ code: "INVALID_ROLE", message: "올바르지 않은 역할입니다" }, { status: 400 })
  }

  const password_hash = await hashPassword(password)
  await AzureSqlDB.createAccount({ username, name, password_hash, role })
  return NextResponse.json({ message: "계정이 생성되었습니다" }, { status: 201 })
}
