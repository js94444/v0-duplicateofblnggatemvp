import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

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
