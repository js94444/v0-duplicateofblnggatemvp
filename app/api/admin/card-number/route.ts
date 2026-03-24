import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { updates } = body as { updates: { pass_id: string; card_number: string }[] }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "업데이트할 데이터가 없습니다." }, { status: 400 })
    }

    await AzureSqlDB.updateCardNumbers(updates)

    return NextResponse.json({ success: true, count: updates.length })
  } catch (error) {
    console.error("Card number update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "카드번호 저장 실패" },
      { status: 500 }
    )
  }
}
