import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "ID가 필요합니다." },
        { status: 400 }
      )
    }

    // getAllApplications에서 동행인, 첨부파일 등 전체 정보가 포함된 데이터 사용
    const applications = await AzureSqlDB.getAllApplications()
    const application = applications.find(app => app.id === id)

    if (!application) {
      return NextResponse.json(
        { error: "신청을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error("Failed to fetch application:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
