import { type NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper admin authentication check
    const queryTime = new Date().toISOString()
    console.log('[v0] API /admin/requests called at:', queryTime)
    const applications = await AzureSqlDB.getAllApplications()
    console.log('[v0] Returning', applications.length, 'applications')
    
    // Debug: Check companions data in first few applications
    applications.slice(0, 3).forEach(app => {
      console.log(`[v0] API Response - ${app.receipt}:`, {
        type: app.type,
        hasCompanions: !!(app as any).companions,
        companionsCount: ((app as any).companions || []).length,
        companionsData: ((app as any).companions || []),
        hasDevices: !!(app as any).electronicDevices,
        devicesCount: ((app as any).electronicDevices || []).length
      })
    })
    
    return NextResponse.json({
      queryTime,
      count: applications.length,
      data: applications
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Query-Time': queryTime,
      },
    })
  } catch (error) {
    console.error("Admin requests fetch error:", error)
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "서버 오류가 발생했습니다",
      },
      { status: 500 },
    )
  }
}
