import { type NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")

    if (!phone) {
      return NextResponse.json(
        {
          code: "MISSING_PARAMETER",
          message: "휴대전화번호가 필요합니다",
        },
        { status: 400 },
      )
    }

    // 휴대전화번호로 조회
    const applications = await AzureSqlDB.getApplicationsByPhone(phone)

    if (!applications || applications.length === 0) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "해당 휴대전화번호로 신청한 내역이 없습니다",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({ applications })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "서버 오류가 발생했습니다",
      },
      { status: 500 },
    )
  }
}
