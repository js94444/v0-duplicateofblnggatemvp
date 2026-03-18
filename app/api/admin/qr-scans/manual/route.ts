import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { getServerSession } from "@/lib/auth/session"

/**
 * POST /api/admin/qr-scans/manual
 * 수동 체크인 / 체크아웃 / 재입장 처리
 *
 * body: {
 *   action: 'checkin' | 'checkout' | 'reentry'
 *   scan_site: 'main' | 'pier_1' | 'pier_2'
 *   // 기존 스캔 이력이 있는 방문자 - scan_id 업데이트
 *   scanIds?: number[]
 *   // 스캔 이력이 없거나 재입장 - 새 행 INSERT
 *   passRows?: Array<{
 *     pass_id: string
 *     application_id: number
 *     companion_id?: number | null
 *     visitor_name: string
 *     visitor_org?: string
 *     contact_name?: string
 *     access_area?: string
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
    }

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

    const manualTime = new Date()
    const adminName = session.user.name || session.user.username || "관리자"

    const result = await AzureSqlDB.manualScanAction({
      action,
      scanIds: scanIds || [],
      passRows: passRows || [],
      scan_site,
      adminName,
      manualTime,
    })

    return NextResponse.json({
      success: true,
      affected: result.affected,
      action,
      manualTime: manualTime.toISOString(),
    })
  } catch (error) {
    console.error("[v0] Manual scan action error:", error)
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다" }, { status: 500 })
  }
}
