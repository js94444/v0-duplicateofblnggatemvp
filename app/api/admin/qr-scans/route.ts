import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const scanSite = url.searchParams.get("scan_site") || "main"
    
    // 정문(main)은 모든 scan_site 필터링 없이 전체 데이터 반환
    // 부두는 pier_1 또는 pier_2로 필터링
    const scanSiteFilter = scanSite === "main" ? "ALL" 
                          : scanSite === "pier_1" ? "PIER_1" 
                          : "PIER_2"

    const data = await AzureSqlDB.getQrScanLogs(scanSiteFilter)
    const stats = await AzureSqlDB.getQrScanStats(scanSiteFilter)

    return NextResponse.json({ data, stats })
  } catch (error) {
    console.error("[v0] Failed to get QR scan logs:", error)
    return NextResponse.json(
      { message: "QR 스캔 이력을 불러오지 못했습니다.", data: [], stats: null },
      { status: 500 }
    )
  }
}
