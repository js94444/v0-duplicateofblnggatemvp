import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, scan_site, scanIds, passRows } = body

    if (!action || !scan_site) {
      return NextResponse.json({ error: "action과 scan_site는 필수입니다" }, { status: 400 })
    }

    if (!["checkin", "checkout", "reentry"].includes(action)) {
      return NextResponse.json({ error: "action은 checkin | checkout | reentry 중 하나여야 합니다" }, { status: 400 })
    }

    const hasAnything = (scanIds && scanIds.length > 0) || (passRows && passRows.length > 0)
    if (!hasAnything) {
      return NextResponse.json({ error: "처리할 방문자가 없습니다" }, { status: 400 })
    }

    // 한국 시간(KST, UTC+9)으로 변환
    const now = new Date()
    const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000)

    const result = await AzureSqlDB.manualScanAction({
      action,
      scanIds: scanIds || [],
      passRows: passRows || [],
      scan_site,
      adminName: "관리자",
      manualTime: koreaTime,
    })

    return NextResponse.json({ success: true, affected: result.affected, action })
  } catch (error) {
    console.error("[v0] Manual scan action error:", error)
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다" }, { status: 500 })
  }
}
