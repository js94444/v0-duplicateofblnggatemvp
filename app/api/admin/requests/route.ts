import { type NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { getAuthenticatedAdmin, isAuthError } from "@/lib/auth/require-admin"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthenticatedAdmin(request)
    if (isAuthError(auth)) return auth

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20')
    const search = url.searchParams.get('search') || undefined
    const status = url.searchParams.get('status') || undefined
    const type = url.searchParams.get('type') || undefined
    const area = url.searchParams.get('area') || undefined
    const dateFrom = url.searchParams.get('dateFrom') || undefined
    const dateTo = url.searchParams.get('dateTo') || undefined
    const sortField = url.searchParams.get('sortField') || undefined
    const sortDirection = (url.searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
    // manager 역할은 본인 담당 건만 조회
    const contactName = (auth as any).role === 'manager' ? (auth as any).name : undefined

    const result = await AzureSqlDB.getAllApplications({
      page,
      pageSize,
      search,
      status,
      contactName,
      type,
      area,
      dateFrom,
      dateTo,
      sortField,
      sortDirection,
    })

    return NextResponse.json({
      count: result.data.length,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
      data: result.data,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error("Admin requests fetch error:", error)
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다" },
      { status: 500 },
    )
  }
}
