import { type NextRequest, NextResponse } from "next/server"
import { validateAdminToken, hashPassword, canManageAccounts } from "@/lib/auth/admin"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

function getUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  return validateAdminToken(token)
}

export async function POST(request: NextRequest) {
  const user = getUser(request)
  if (!user || !canManageAccounts(user.role)) {
    return NextResponse.json({ code: "FORBIDDEN", message: "권한이 없습니다" }, { status: 403 })
  }

  const { accounts } = await request.json()
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return NextResponse.json({ code: "MISSING_DATA", message: "계정 데이터가 없습니다" }, { status: 400 })
  }

  const results: { username: string; status: "created" | "skipped" | "error"; message?: string }[] = []

  for (const acc of accounts) {
    const { username, name, role, password } = acc
    if (!username?.trim() || !name?.trim() || !password?.trim()) {
      results.push({ username: username || "(빈값)", status: "skipped", message: "필수 필드 누락" })
      continue
    }
    if (!["super_admin", "security", "manager"].includes(role)) {
      results.push({ username, status: "skipped", message: `올바르지 않은 역할: ${role}` })
      continue
    }
    try {
      const password_hash = await hashPassword(password)
      await AzureSqlDB.createAccount({ username: username.trim(), name: name.trim(), password_hash, role })
      results.push({ username, status: "created" })
    } catch (e: any) {
      const isDuplicate = e?.message?.includes("UNIQUE") || e?.message?.includes("duplicate")
      results.push({
        username,
        status: isDuplicate ? "skipped" : "error",
        message: isDuplicate ? "이미 존재하는 계정" : e?.message,
      })
    }
  }

  const created = results.filter((r) => r.status === "created").length
  const skipped = results.filter((r) => r.status === "skipped").length
  const errors  = results.filter((r) => r.status === "error").length

  return NextResponse.json({ created, skipped, errors, results }, { status: 200 })
}
