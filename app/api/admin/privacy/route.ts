import { type NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { getAuthenticatedAdmin, isAuthError } from "@/lib/auth/require-admin"

export const runtime = "nodejs"

// GET: 3년 경과 데이터 건수 + 목록 조회
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthenticatedAdmin(request)
    if (isAuthError(auth)) return auth

    // super_admin만 접근 가능
    if ((auth as any).role !== "super_admin") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "슈퍼어드민만 접근 가능합니다" },
        { status: 403 }
      )
    }

    const result = await AzureSqlDB.getExpiredApplications()
    return NextResponse.json(result)
  } catch (error) {
    console.error("[privacy] Failed to fetch expired data:", error)
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// POST: 3년 경과 개인정보 마스킹 처리
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthenticatedAdmin(request)
    if (isAuthError(auth)) return auth

    if ((auth as any).role !== "super_admin") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "슈퍼어드민만 접근 가능합니다" },
        { status: 403 }
      )
    }

    const adminName = (auth as any).name || "unknown"
    const result = await AzureSqlDB.purgeExpiredApplications(adminName)

    return NextResponse.json({
      message: `${result.affected}건 처리 완료 (Blob 삭제: ${result.blobsDeleted}건, 실패: ${result.blobsFailed}건)`,
      affected: result.affected,
      blobsDeleted: result.blobsDeleted,
      blobsFailed: result.blobsFailed,
    })
  } catch (error) {
    console.error("[privacy] Failed to mask expired data:", error)
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "마스킹 처리 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
