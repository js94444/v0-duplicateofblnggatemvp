import { NextRequest, NextResponse } from "next/server"
import { validateAdminToken, type AdminUser } from "@/lib/auth/admin"

/** Admin API 인증 헬퍼 - 토큰이 없거나 유효하지 않으면 401 반환 */
export function getAuthenticatedAdmin(request: NextRequest): AdminUser | NextResponse {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "인증이 필요합니다" },
      { status: 401 }
    )
  }

  const user = validateAdminToken(token)
  if (!user) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "인증이 만료되었습니다. 다시 로그인해주세요." },
      { status: 401 }
    )
  }

  return user
}

/** 인증 결과가 에러 응답인지 확인 */
export function isAuthError(result: AdminUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
