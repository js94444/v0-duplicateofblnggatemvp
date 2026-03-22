import { NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ passId: string }> }
) {
  try {
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
