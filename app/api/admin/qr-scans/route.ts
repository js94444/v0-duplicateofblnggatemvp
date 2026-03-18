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

    // Debug: scan_id 확인
    console.log("[v0] DB scan data sample:", data.slice(0, 3).map((d: any) => ({
      name: d.visitor_name,
      entry_scan_id: d.entry_scan_id,
      exit_scan_id: d.exit_scan_id,
      cycleNum: d.cycle_num
    })))

    // 신청자(companion_id가 null 또는 0)와 동행인(companion_id가 있음) 분리
    const applicantRows = data.filter((d: any) => !d.companion_id || d.companion_id === 0)
    const companionRows = data.filter((d: any) => d.companion_id && d.companion_id !== 0)
    
    // 고유 application_id 목록 추출 (신청자용)
    const applicationIds = [...new Set(applicantRows.map((d: any) => d.application_id).filter(Boolean))]
    // 고유 companion_id 목록 추출 (동행인용)
    const companionIds = [...new Set(companionRows.map((d: any) => d.companion_id).filter(Boolean))]
    
    // 신청자 항만이수증 파일 조회
    const portCertByAppId = new Map<number, Array<{ file_url: string; file_name: string }>>()
    if (applicationIds.length > 0) {
      try {
        const portCertFiles = await AzureSqlDB.getPortCertFilesByApplicationIds(applicationIds as number[])
        for (const file of portCertFiles) {
          const appId = file.application_id
          if (!portCertByAppId.has(appId)) {
            portCertByAppId.set(appId, [])
          }
          portCertByAppId.get(appId)!.push({ file_url: file.file_url, file_name: file.file_name })
        }
      } catch (certError) {
        console.error("[v0] Failed to get applicant port certificates:", certError)
      }
    }

    // 동행인 항만이수증 파일 조회
    const portCertByCompanionId = new Map<number, Array<{ file_url: string; file_name: string }>>()
    if (companionIds.length > 0) {
      try {
        const companionCertFiles = await AzureSqlDB.getPortCertFilesByCompanionIds(companionIds as number[])
        for (const file of companionCertFiles) {
          const compId = file.companion_id
          if (!portCertByCompanionId.has(compId)) {
            portCertByCompanionId.set(compId, [])
          }
          portCertByCompanionId.get(compId)!.push({ file_url: file.file_url, file_name: file.file_name })
        }
      } catch (certError) {
        console.error("[v0] Failed to get companion port certificates:", certError)
      }
    }

    // 각 스캔 데이터에 portCertFiles 추가 (신청자/동행인 구분)
    const dataWithCerts = data.map((d: any) => {
      // 동행인인 경우 companion_id로 조회
      if (d.companion_id && d.companion_id !== 0) {
        return {
          ...d,
          portCertFiles: portCertByCompanionId.get(d.companion_id) || []
        }
      }
      // 신청자인 경우 application_id로 조회
      return {
        ...d,
        portCertFiles: d.application_id ? (portCertByAppId.get(d.application_id) || []) : []
      }
    })

    return NextResponse.json({ data: dataWithCerts, stats })
  } catch (error) {
    console.error("[v0] Failed to get QR scan logs:", error)
    return NextResponse.json(
      { message: "QR 스캔 이력을 불러오지 못했습니다.", data: [], stats: null },
      { status: 500 }
    )
  }
}
