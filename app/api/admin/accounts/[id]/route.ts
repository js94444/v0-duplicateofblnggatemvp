import { type NextRequest, NextResponse } from "next/server"
import { validateAdminToken, hashPassword, canManageAccounts } from "@/lib/auth/admin"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

function getUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  return validateAdminToken(token)
}

// 계정 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(request)
  if (!user || !canManageAccounts(user.role)) {
    return NextResponse.json({ code: "FORBIDDEN", message: "권한이 없습니다" }, { status: 403 })
  }

  const { id } = await params
  const accountId = Number(id)
  const body = await request.json()

  // 비밀번호 초기화 요청
  if (body.reset_password) {
    const hash = await hashPassword(body.reset_password)
    await AzureSqlDB.updatePassword(accountId, hash)
    return NextResponse.json({ message: "비밀번호가 초기화되었습니다" })
  }

  await AzureSqlDB.updateAccount(accountId, {
    name: body.name,
    role: body.role,
    is_active: body.is_active,
  })
  return NextResponse.json({ message: "계정이 수정되었습니다" })
}

// 계정 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(request)
  if (!user || !canManageAccounts(user.role)) {
    return NextResponse.json({ code: "FORBIDDEN", message: "권한이 없습니다" }, { status: 403 })
  }

  const { id } = await params
  const accountId = Number(id)
  if (String(accountId) === user.id) {
    return NextResponse.json({ code: "SELF_DELETE", message: "본인 계정은 삭제할 수 없습니다" }, { status: 400 })
  }

  await AzureSqlDB.deleteAccount(accountId)
  return NextResponse.json({ message: "계정이 삭제되었습니다" })
}
