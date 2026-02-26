import { NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Extract client IP address
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown'
    
    console.log("[v0] POST /api/apply/visit - Creating new application:", body)
    console.log("[v0] Client IP:", clientIp)

    const result = await AzureSqlDB.createVisitApplication({
      ...body,
      submission_ip: clientIp
    })
    console.log("[v0] Application created with ID:", result.application_id)

    return NextResponse.json(
      {
        success: true,
        message: "방문 신청이 접수되었습니다.",
        data: result,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("[v0] Error creating visit application:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "신청 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    )
  }
}
