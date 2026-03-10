import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receipt: string }> }
) {
  try {
    const { receipt } = await params
    console.log("[v0] QR Verify API called with receipt:", receipt)

    if (!receipt || receipt.trim() === "") {
      return NextResponse.json(
        { result: "DENY", message: "접수번호가 필요합니다." },
        { status: 400 }
      )
    }

    // visit_passes 테이블에서 pass_receipt로 조회
    const passData = await AzureSqlDB.getPassByReceipt(receipt)
    console.log("[v0] Pass data found:", passData ? `ID: ${passData.application_id}` : "NOT FOUND")

    if (!passData) {
      return NextResponse.json(
        { result: "DENY", message: "출입권을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 연결된 visit_applications 정보 조회
    const application = await AzureSqlDB.getApplicationById(String(passData.application_id))
    console.log("[v0] Application found:", application ? `Name: ${application.visitor_name}` : "NOT FOUND")

    if (!application) {
      return NextResponse.json(
        { result: "DENY", message: "신청 정보를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 상태 확인
    if (passData.status !== "active") {
      return NextResponse.json(
        { result: "DENY", message: "비활성화된 출입권입니다." },
        { status: 400 }
      )
    }

    // 방문 기간 확인
    const now = new Date()
    const visitStart = new Date(application.visit_start_date)
    const visitEnd = new Date(application.visit_end_date)
    visitEnd.setHours(23, 59, 59, 999) // 종료일 끝까지 유효

    if (now < visitStart) {
      return NextResponse.json({
        result: "DENY",
        message: "방문 기간이 아직 시작되지 않았습니다.",
        errorDetail: `방문 시작일: ${visitStart.toLocaleDateString("ko-KR")}`,
      })
    }

    if (now > visitEnd) {
      return NextResponse.json({
        result: "DENY",
        message: "방문 기간이 종료되었습니다.",
        errorDetail: `방문 종료일: ${visitEnd.toLocaleDateString("ko-KR")}`,
      })
    }

    // 성공 응답
    return NextResponse.json({
      result: "ALLOW",
      message: "유효한 출입권입니다.",
      data: {
        receipt: application.application_number || application.receipt || receipt,
        applicantName: application.visitor_name || "",
        organization: application.visitor_organization || "",
        visitDate: application.visit_start_date,
        visitTime: application.visit_start_time || "09:00",
        accessArea: application.access_area || "",
        applicationType: application.application_type || "VISIT_R3",
        approvedAt: application.approved_at,
        validUntil: new Date(application.visit_end_date).toLocaleDateString("ko-KR"),
      },
    })
  } catch (e) {
    console.error("[v0] Verify QR error:", e)
    return NextResponse.json(
      { result: "DENY", message: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
