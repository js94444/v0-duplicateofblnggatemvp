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

  const { application_id, checked, note } = await request.json()
  if (application_id === undefined || checked === undefined) {
    return NextResponse.json({ code: "MISSING_FIELDS", message: "필수 값이 누락되었습니다" }, { status: 400 })
  }

  await AzureSqlDB.setApplicationCheck(Number(application_id), Number(user.id), checked, note)
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

  // 현재 로그인 유저의 체크 여부도 함께 반환
  const myCheck = await AzureSqlDB.getApplicationCheck(Number(application_id), Number(user.id))
  
  // checked 값을 명시적으로 boolean으로 변환
  if (myCheck && typeof myCheck.checked !== 'boolean') {
    myCheck.checked = myCheck.checked ? true : false
  }

  return NextResponse.json({ checks, my_check: myCheck })
}
