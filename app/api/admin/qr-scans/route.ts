import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const scanSite = url.searchParams.get("scan_site") || "main"
    
    // scan_site 매핑: main -> MAIN, pier_1 -> PIER_1, pier_2 -> PIER_2
    const scanSiteUpper = scanSite === "pier_1" ? "PIER_1" 
                        : scanSite === "pier_2" ? "PIER_2" 
                        : "MAIN"

    const data = await AzureSqlDB.getQrScanLogs(scanSiteUpper)
    const stats = await AzureSqlDB.getQrScanStats(scanSiteUpper)

    return NextResponse.json({ data, stats })
  } catch (error) {
    console.error("[v0] Failed to get QR scan logs:", error)
    return NextResponse.json(
      { message: "QR 스캔 이력을 불러오지 못했습니다.", data: [], stats: null },
      { status: 500 }
    )
  }
}
