import { type NextRequest, NextResponse } from "next/server"
import { validateAdminToken } from "@/lib/auth/admin"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

function getUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return null
  return validateAdminToken(token)
}

// 확인 체크 저장/업데이트
export async function POST(request: NextRequest) {
  const user = getUser(request)
  if (!user) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "인증이 필요합니다" }, { status: 401 })
  }

  const { application_id, checked, note, decision } = await request.json()
  if (application_id === undefined || checked === undefined) {
    return NextResponse.json({ code: "MISSING_FIELDS", message: "필수 값이 누락되었습니다" }, { status: 400 })
  }

  // decision: 'approve' | 'reject' | null (참고용 의견)
  const normalizedDecision = decision === 'approve' || decision === 'reject' ? decision : null
  await AzureSqlDB.setApplicationCheck(Number(application_id), Number(user.id), checked, note, normalizedDecision)
  return NextResponse.json({ message: checked ? "확인 완료" : "확인 취소" })
}

// 특정 신청서의 체크 목록 조회
export async function GET(request: NextRequest) {
  const user = getUser(request)
  if (!user) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "인증이 필요합니다" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const application_id = searchParams.get("application_id")
  if (!application_id) {
    return NextResponse.json({ code: "MISSING_ID", message: "application_id가 필요합니다" }, { status: 400 })
  }

  const checks = await AzureSqlDB.getApplicationChecks(Number(application_id))

  // 모든 계정이 공유하는 체크 상태 반환 (담당자가 체크하면 슈퍼어드민/특수경비대도 동일하게 보임)
  const sharedCheck = await AzureSqlDB.getApplicationCheck(Number(application_id))
  
  // checked 값을 명시적으로 boolean으로 변환
  if (sharedCheck && typeof sharedCheck.checked !== 'boolean') {
    sharedCheck.checked = sharedCheck.checked ? true : false
  }

  return NextResponse.json({ checks, my_check: sharedCheck })
}
