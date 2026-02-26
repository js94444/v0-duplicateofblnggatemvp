import { type NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper admin authentication check
    const stats = await AzureSqlDB.getApplicationStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Admin stats fetch error:", error)
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "서버 오류가 발생했습니다",
      },
      { status: 500 },
    )
  }
}
