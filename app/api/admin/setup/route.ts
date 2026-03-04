import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

// 임시 설정 엔드포인트 - 초기 슈퍼어드민 비밀번호 해시 생성용
// 사용 후 반드시 삭제할 것
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const password = searchParams.get("password")
  const secret = searchParams.get("secret")

  // 간단한 보안 키 확인
  if (secret !== "blink-setup-2026") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!password) {
    return NextResponse.json({ error: "password query param required" }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 10)

  // DB에 직접 업데이트
  try {
    const { AzureSqlDB } = await import("@/lib/db/azure-sql")
    // updateAccount 대신 직접 쿼리
    const sql = await import("mssql")
    const pool = await (AzureSqlDB as any).getPool?.() 

    return NextResponse.json({
      password,
      hash,
      sql: `UPDATE admin_accounts SET password_hash = '${hash}', must_change_password = 1, updated_at = GETDATE() WHERE username = 'admin';`,
      note: "위 SQL을 DB에서 실행하세요"
    })
  } catch (e) {
    return NextResponse.json({
      password,
      hash,
      sql: `UPDATE admin_accounts SET password_hash = '${hash}', must_change_password = 1, updated_at = GETDATE() WHERE username = 'admin';`,
      note: "위 SQL을 DB에서 실행하세요"
    })
  }
}
