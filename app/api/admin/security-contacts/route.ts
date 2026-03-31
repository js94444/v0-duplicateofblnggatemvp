import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { getAuthenticatedAdmin, isAuthError } from "@/lib/auth/require-admin"

// 보안담당자 지정/해제 및 전화번호 저장
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthenticatedAdmin(request)
    if (isAuthError(auth)) return auth
    const body = await request.json()
    const { account_id, is_security_contact, phone } = body

    if (!account_id) {
      return NextResponse.json({ message: "account_id가 필요합니다" }, { status: 400 })
    }

    await AzureSqlDB.updateSecurityContact(account_id, is_security_contact, phone)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Failed to update security contact:", error)
    return NextResponse.json({ message: error.message || "저장 실패" }, { status: 500 })
  }
}

// 보안담당자 목록 조회
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthenticatedAdmin(request)
    if (isAuthError(auth)) return auth
    const contacts = await AzureSqlDB.getSecurityContacts()
    return NextResponse.json({ data: contacts })
  } catch (error: any) {
    console.error("[v0] Failed to get security contacts:", error)
    return NextResponse.json({ message: error.message || "조회 실패" }, { status: 500 })
  }
}
