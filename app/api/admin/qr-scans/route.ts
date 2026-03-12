import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const scanSite = url.searchParams.get("scan_site") || "main"
    const filterDate = url.searchParams.get("date") || undefined // YYYY-MM-DD 형식
    const startDate = url.searchParams.get("startDate") || undefined // YYYY-MM-DD 형식
    const endDate = url.searchParams.get("endDate") || undefined // YYYY-MM-DD 형식
    
    // 범위 검색이면 startDate/endDate 사용, 단일 날짜 검색이면 date 사용
    const dateParam = startDate && endDate ? { startDate, endDate } : { date: filterDate }
    
    // 정문(main), 1부두(pier_1), 2부두(pier_2) 각각 해당 scan_site로 필터링
    const data = await AzureSqlDB.getQrScanLogs(scanSite, 100, dateParam)
    const stats = await AzureSqlDB.getQrScanStats(scanSite, dateParam)

    // 고유 application_id 목록 추출
    const applicationIds = [...new Set(data.map((d: any) => d.application_id).filter(Boolean))]
    
    // 각 application_id별 항만이수증 파일 조회
    const portCertMap = new Map<number, Array<{ file_url: string; file_name: string }>>()
    if (applicationIds.length > 0) {
      try {
        const portCertFiles = await AzureSqlDB.getPortCertFilesByApplicationIds(applicationIds as number[])
        for (const file of portCertFiles) {
          const appId = file.application_id
          if (!portCertMap.has(appId)) {
            portCertMap.set(appId, [])
          }
          portCertMap.get(appId)!.push({ file_url: file.file_url, file_name: file.file_name })
        }
      } catch (certError) {
        console.error("[v0] Failed to get port certificates:", certError)
        // 항만이수증 조회 실패해도 스캔 데이터는 반환하도록 계속 진행
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
