import { NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { sendSms } from "@/lib/services/solapi"
import { getCancelSmsText, getSubmissionSmsText } from "@/lib/messages/sms-templates"

// GET: 신청 데이터 조회 (수정을 위해)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    console.log("[v0] Getting application for edit:", id)

    const application = await AzureSqlDB.getApplicationById(id)

    if (!application) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "신청 내역을 찾을 수 없습니다",
        },
        { status: 404 }
      )
    }

    // 대기중 상태만 수정 가능
    if (application.status !== "pending") {
      return NextResponse.json(
        {
          code: "NOT_EDITABLE",
          message: "대기중인 신청만 수정할 수 있습니다",
        },
        { status: 403 }
      )
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error("[v0] Get application error:", error)
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "서버 오류가 발생했습니다",
      },
      { status: 500 }
    )
  }
}

// PUT: 신청 내용 수정
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    console.log("[v0] Updating application:", id)

    // 기존 신청 확인
    const existingApp = await AzureSqlDB.getApplicationById(id)
    if (!existingApp) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "신청 내역을 찾을 수 없습니다",
        },
        { status: 404 }
      )
    }

    // 대기중 상태만 수정 가능
    if (existingApp.status !== "pending") {
      return NextResponse.json(
        {
          code: "NOT_EDITABLE",
          message: "대기중인 신청만 수정할 수 있습니다",
        },
        { status: 403 }
      )
    }

    // 데이터 업데이트 및 상태를 pending으로 재설정
    const updatedApp = await AzureSqlDB.updateApplication(id, {
      ...body,
      status: "pending", // 수정 시 다시 대기중으로 변경
    })

    // 수정 재접수 SMS 발송 (보안담당자 + 담당자)
    try {
      const securityPhones = await AzureSqlDB.getSecurityAccountPhones()
      const contactPhone = body.contact_mobile || body.contact_phone || existingApp.contact_mobile

      // 보안담당자용 메시지 (수정 재접수 표시)
      const securitySmsMessage = getSubmissionSmsText({
        receipt: updatedApp.receipt || existingApp.receipt || "N/A",
        visitor_name: body.visitor_name || existingApp.visitor_name || "",
        visitor_phone: body.visitor_phone || existingApp.visitor_phone || "",
        visitor_organization: body.visitor_organization || existingApp.visitor_organization || "",
        visit_start_date: body.visit_start_date || existingApp.visit_start_date || "",
        visit_end_date: body.visit_end_date || existingApp.visit_end_date || "",
        access_area: body.access_area || existingApp.access_area || "",
        visit_purpose: body.visit_purpose || existingApp.visit_purpose || "",
        status: "pending",
        companionsCount: body.companions?.length || 0,
        statusUrl: "https://v0-lng-tml.vercel.app",
        isChangeResubmission: true, // 수정 재접수 플래그
      }, 'security')

      // 담당자용 메시지
      const contactSmsMessage = getSubmissionSmsText({
        receipt: updatedApp.receipt || existingApp.receipt || "N/A",
        visitor_name: body.visitor_name || existingApp.visitor_name || "",
        visitor_phone: body.visitor_phone || existingApp.visitor_phone || "",
        visitor_organization: body.visitor_organization || existingApp.visitor_organization || "",
        visit_start_date: body.visit_start_date || existingApp.visit_start_date || "",
        visit_end_date: body.visit_end_date || existingApp.visit_end_date || "",
        access_area: body.access_area || existingApp.access_area || "",
        visit_purpose: body.visit_purpose || existingApp.visit_purpose || "",
        status: "pending",
        companionsCount: body.companions?.length || 0,
        statusUrl: "https://v0-lng-tml.vercel.app",
        isChangeResubmission: true,
      }, 'contact')

      // 보안담당자들에게 발송
      await Promise.allSettled(
        securityPhones.map((phone) => sendSms(phone, securitySmsMessage))
      )

      // 담당자에게도 발송
      if (contactPhone) {
        await sendSms(contactPhone, contactSmsMessage).catch((err) => {
          console.error("[v0] 수정 재접수 담당자 SMS 발송 실패:", err)
        })
      }
    } catch (smsError) {
      console.error("[v0] 수정 재접수 SMS 발송 실패 (신청 수정은 정상 처리됨):", smsError)
    }

    return NextResponse.json({
      success: true,
      receipt: updatedApp.receipt,
      message: "신청이 수정되었습니다. 재심사 대기중입니다.",
    })
  } catch (error) {
    console.error("[v0] Update application error:", error)
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "신청 수정 중 오류가 발생했습니다",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// DELETE: 방문 취소
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    console.log("[v0] Cancelling application:", id)

    // 기존 신청 확인
    const existingApp = await AzureSqlDB.getApplicationById(id)
    if (!existingApp) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "신청 내역을 찾을 수 없습니다",
        },
        { status: 404 }
      )
    }

    // 대기중 또는 승인된 신청만 취소 가능
    if (existingApp.status !== "pending" && existingApp.status !== "approved") {
      return NextResponse.json(
        {
          code: "NOT_CANCELLABLE",
          message: "대기중 또는 승인된 신청만 취소할 수 있습니다",
        },
        { status: 403 }
      )
    }

    // 상태를 cancelled로 변경
    await AzureSqlDB.updateApplicationStatus(id, "cancelled" as any)

    // 취소 SMS 발송 (보안담당자 + 담당자)
    try {
      const securityPhones = await AzureSqlDB.getSecurityAccountPhones()
      const contactPhone = existingApp.contact_mobile || existingApp.contact_phone

      const cancelSmsMessage = getCancelSmsText({
        receipt: existingApp.receipt || "N/A",
        visitor_name: existingApp.visitor_name || "",
        visitor_phone: existingApp.visitor_phone || "",
        visitor_organization: existingApp.visitor_organization || "",
        visit_start_date: existingApp.visit_start_date || "",
        visit_end_date: existingApp.visit_end_date || "",
        access_area: existingApp.access_area || "",
        visit_purpose: existingApp.visit_purpose || "",
        statusUrl: "https://v0-lng-tml.vercel.app",
        companionsCount: 0,
      })

      // 보안담당자들에게 발송
      await Promise.allSettled(
        securityPhones.map((phone) => sendSms(phone, cancelSmsMessage))
      )

      // 담당자에게도 발송
      if (contactPhone) {
        await sendSms(contactPhone, cancelSmsMessage).catch((err) => {
          console.error("[v0] 취소 담당자 SMS 발송 실패:", err)
        })
      }
    } catch (smsError) {
      console.error("[v0] 취소 SMS 발송 실패 (취소 처리는 정상 완료됨):", smsError)
    }

    return NextResponse.json({
      success: true,
      message: "방문이 취소되었습니다",
    })
  } catch (error) {
    console.error("[v0] Cancel application error:", error)
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "방문 취소 중 오류가 발생했습니다",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
