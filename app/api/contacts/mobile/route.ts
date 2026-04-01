import { NextRequest, NextResponse } from "next/server"
import contactsData from "@/lib/data/contacts-private.json"

export const runtime = "nodejs"

// 담당자 이름으로 전화번호 조회 (서버에서만 처리)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get("name")?.trim()

  if (!name) {
    return NextResponse.json({ error: "name 파라미터가 필요합니다." }, { status: 400 })
  }

  const contact = (contactsData as any[]).find(
    (c) => c.name === name
  )

  if (!contact || !contact.mobile) {
    return NextResponse.json({ mobile: "" })
  }

  return NextResponse.json({ mobile: contact.mobile })
}
