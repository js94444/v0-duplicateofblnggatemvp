import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")?.trim()

    if (!phone) {
      return NextResponse.json({ error: "휴대폰 번호가 필요합니다." }, { status: 400 })
    }

    const rows = await AzureSqlDB.getApprovedApplicationsByPhone(phone)

    const data = rows.map((row) => ({
      receipt: row.pass_receipt,
      visitor_name: row.visitor_name,
      visit_start_date: row.visit_start_date
        ? new Date(row.visit_start_date).toISOString().split("T")[0]
        : "",
      visit_end_date: row.visit_end_date
        ? new Date(row.visit_end_date).toISOString().split("T")[0]
        : "",
      access_area: row.access_area,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[v0] by-phone API error:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
  }
}
