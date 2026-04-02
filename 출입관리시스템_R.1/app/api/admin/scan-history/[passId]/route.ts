import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { getAuthenticatedAdmin, isAuthError } from "@/lib/auth/require-admin"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ passId: string }> }
) {
  try {
    const auth = getAuthenticatedAdmin(request)
    if (isAuthError(auth)) return auth

    const { passId } = await params
    if (!passId) {
      return NextResponse.json({ error: "passId가 필요합니다" }, { status: 400 })
    }

    const history = await AzureSqlDB.getScanHistoryByPassId(passId)
    return NextResponse.json({ history })
  } catch (error) {
    console.error("scan-history API error:", error)
    return NextResponse.json({ error: "서버 오류" }, { status: 500 })
  }
}
