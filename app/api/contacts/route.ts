import { NextResponse } from "next/server"
import contactsData from "@/lib/data/contacts-private.json"

export const runtime = "nodejs"

// 담당자 목록 조회 (이름+부서만 반환, 전화번호 제외)
export async function GET() {
  const list = (contactsData as any[]).map((c) => ({
    name: c.name,
    department: c.department,
  }))

  return NextResponse.json(list)
}
