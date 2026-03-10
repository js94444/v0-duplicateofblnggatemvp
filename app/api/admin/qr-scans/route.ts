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

    // 고유 application_id 목록 추출
    const applicationIds = [...new Set(data.map((d: any) => d.application_id).filter(Boolean))]
    
    // 각 application_id별 항만이수증 파일 조회
    const portCertMap = new Map<number, Array<{ file_url: string; file_name: string }>>()
    if (applicationIds.length > 0) {
      const portCertFiles = await AzureSqlDB.getPortCertFilesByApplicationIds(applicationIds as number[])
      for (const file of portCertFiles) {
        const appId = file.application_id
        if (!portCertMap.has(appId)) {
          portCertMap.set(appId, [])
        }
        portCertMap.get(appId)!.push({ file_url: file.file_url, file_name: file.file_name })
      }
    }

    // 각 스캔 데이터에 portCertFiles 추가
    const dataWithCerts = data.map((d: any) => ({
      ...d,
      portCertFiles: d.application_id ? (portCertMap.get(d.application_id) || []) : []
    }))

    return NextResponse.json({ data: dataWithCerts, stats })
  } catch (error) {
    console.error("[v0] Failed to get QR scan logs:", error)
    return NextResponse.json(
      { message: "QR 스캔 이력을 불러오지 못했습니다.", data: [], stats: null },
      { status: 500 }
    )
  }
}
