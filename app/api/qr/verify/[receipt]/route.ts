import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { validateScannerToken } from "@/lib/scanner-auth"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receipt: string }> }
) {
  try {
    const { receipt } = await params
    const { searchParams } = new URL(request.url)
    const direction = searchParams.get("direction") === "EXIT" ? "EXIT" : "ENTRY"
    const gate = searchParams.get("gate") ?? "main"

    console.log("[v0] QR Verify GET - receipt:", receipt, "direction:", direction, "gate:", gate)

    if (!receipt || receipt.trim() === "") {
      return NextResponse.json(
        { result: "DENY", message: "접수번호가 필요합니다." },
        { status: 400 }
      )
    }

    // 스캐너 토큰 검증 - 인증된 스캐너에서만 출입 처리 가능
    const scannerToken = searchParams.get("scanner_token")
    if (!validateScannerToken(scannerToken)) {
      return NextResponse.json(
        { result: "DENY", message: "인증된 스캐너에서만 출입 처리가 가능합니다." },
        { status: 403 }
      )
    }

    // 스캔 기록 저장 및 검증
    const result = await AzureSqlDB.verifyVisitPassByReceiptWithDirection(
      receipt,
      direction,
      "WEB",
      null,
      request.headers.get("user-agent"),
      gate
    )
    
    console.log("[v0] QR Verify result:", result)

    return NextResponse.json({
      result: result.result,
      message: result.message,
      visitor_name: result.visitor_name,
      visitor_org: result.visitor_org,
      access_area: result.access_area,
      visit_start_date: result.visit_start_date,
      visit_end_date: result.visit_end_date,
    })
  } catch (e) {
    console.error("[v0] QR Verify GET error:", e)
    return NextResponse.json(
      { result: "DENY", message: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const receipt = body.receipt?.trim()
    const receipts: string[] | undefined = Array.isArray(body.receipts)
      ? body.receipts.map((r: unknown) => String(r || "").trim()).filter((r: string) => r.length > 0)
      : undefined
    const direction = body.direction === "EXIT" ? "EXIT" : body.direction === "ENTRY" ? "ENTRY" : null

    if (!receipt || !direction) {
      return NextResponse.json(
        { success: false, message: "receipt와 direction(ENTRY|EXIT)이 필요합니다." },
        { status: 400 }
      )
    }

    // 처리 대상 접수번호 목록: 지정된 배열이 있으면 그것을 사용, 없으면 단일 receipt만 처리
    const targetReceipts = receipts && receipts.length > 0 ? receipts : [receipt]

    const results = []
    let successCount = 0
    for (const r of targetReceipts) {
      const result = await AzureSqlDB.verifyVisitPassByReceiptWithDirection(
        r,
        direction,
        "ADMIN",
        null,
        null
      )
      results.push({ receipt: r, ...result })
      if (result.result === "ALLOW") {
        successCount += 1
      }
    }

    const allSuccess = successCount === targetReceipts.length
    const baseMessage = direction === "ENTRY" ? "입장 처리되었습니다." : "퇴장 처리되었습니다."
    const messageDetail =
      targetReceipts.length > 1
        ? `${baseMessage} (${targetReceipts.length}건 중 ${successCount}건 성공)`
        : baseMessage

    return NextResponse.json({
      success: allSuccess,
      message: messageDetail,
      results,
    })
  } catch (e) {
    console.error("[v0] Admin entry-exit error:", e)
    return NextResponse.json(
      { success: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
