import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const phone = url.searchParams.get("phone")?.trim()
    if (!phone) {
      return NextResponse.json(
        { error: "phone 파라미터가 필요합니다.", data: [] },
        { status: 400 }
      )
    }
    const list = await AzureSqlDB.getApprovedApplicationsByPhone(phone)
    return NextResponse.json({ data: list })
  } catch (e) {
    console.error("[v0] by-phone error:", e)
    return NextResponse.json(
      { error: "조회 중 오류가 발생했습니다.", data: [] },
      { status: 500 }
    )
  }
}
