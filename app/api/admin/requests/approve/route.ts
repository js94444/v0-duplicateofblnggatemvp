import { type NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { ApplicationStatus } from "@/lib/types"
import { sendEmail } from "@/lib/email/sender"
import { getApprovalEmailTemplate, getRejectionEmailTemplate } from "@/lib/email/templates"
import { sendSms } from "@/lib/services/solapi"
import { getApprovalSMSMessage, getRejectionSMSMessage } from "@/lib/messages/sms-templates"

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper admin authentication check
    const { id, action, reason } = await request.json()

    console.log("[v0] Approval API called with:", { id, action, reason })

    if (!id || !action) {
      console.error("[v0] Missing parameters:", { id, action })
      return NextResponse.json(
        {
          code: "MISSING_PARAMETERS",
          message: "필수 매개변수가 누락되었습니다",
        },
        { status: 400 },
      )
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        {
          code: "MISSING_REASON",
          message: "반려 사유를 입력해주세요",
        },
        { status: 400 },
      )
    }

    const status = action === "approve" ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED
    console.log("[v0] Updating application status to:", status)
    const updatedApplication = await AzureSqlDB.updateApplicationStatus(id, status, reason)

    console.log("[v0] Updated application:", updatedApplication ? "Success" : "Not found")

    if (!updatedApplication) {
      console.error("[v0] Application not found:", id)
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "해당 신청을 찾을 수 없습니다",
        },
        { status: 404 },
      )
    }

    // 승인 시 QR pass_receipt 생성
    let pass_receipt: string | null = null
    if (action === "approve") {
      pass_receipt = AzureSqlDB.generatePassReceipt()
      await AzureSqlDB.createPassForApplication(id, pass_receipt)
      console.log("[v0] Created pass_receipt:", pass_receipt)
    }

    // 이메일 발송
    const visitorEmail = updatedApplication.visitor_email || updatedApplication.contactEmail
    if (visitorEmail) {
      try {
        const emailTemplate =
          action === "approve"
            ? getApprovalEmailTemplate(updatedApplication)
            : getRejectionEmailTemplate(updatedApplication, reason || "")

        await sendEmail({
          to: visitorEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        })
      } catch (emailError) {
        console.error("Failed to send approval/rejection email:", emailError)
      }
    }

    // SMS 발송
    try {
      const visitorPhone = updatedApplication.visitor_phone || updatedApplication.contactPhone
      const contactPhone = updatedApplication.contact_mobile || updatedApplication.contact_phone

      if (action === "approve") {
        // 승인 시: 신청자 + 동행인에게 QR 포함 문자
        const companionPhones = await AzureSqlDB.getCompanionPhonesByApplicationId(id)
        const approvalRecipients = new Set<string>()
        
        // 신청자에게 발송 (신청자용 라벨)
        if (visitorPhone) {
          const applicantMsg = getApprovalSMSMessage(pass_receipt, updatedApplication, 'applicant')
          await sendSms(visitorPhone, applicantMsg).catch((err) => {
            console.error("[v0] 신청자 SMS 발송 실패:", err)
          })
        }

        // 동행인들에게 발송 (동행인용 라벨)
        if (companionPhones.length > 0) {
          const companionMsg = getApprovalSMSMessage(pass_receipt, updatedApplication, 'companion')
          await Promise.allSettled(
            companionPhones.map((phone) => sendSms(phone, companionMsg))
          )
        }

        // 승인 시: 담당자에게 승인 완료 알림
        if (contactPhone) {
          const contactMsg = `[담당자용] [B-Link] 방문 신청이 승인되었습니다.\n신청자: ${updatedApplication.visitor_name || ""}\n접수번호: ${updatedApplication.application_number || updatedApplication.receipt || ""}`
          await sendSms(contactPhone, contactMsg).catch(() => {})
        }
      } else {
        // 반려 시: 신청자 + 담당자에게 반려 문자
        // 신청자에게 발송 (신청자용 라벨)
        if (visitorPhone) {
          const applicantMsg = getRejectionSMSMessage(updatedApplication, reason || "", 'applicant')
          await sendSms(visitorPhone, applicantMsg).catch((err) => {
            console.error("[v0] 신청자 반려 SMS 발송 실패:", err)
          })
        }

        // 담당자에게 발송 (담당자용 라벨)
        if (contactPhone) {
          const contactMsg = getRejectionSMSMessage(updatedApplication, reason || "", 'contact')
          await sendSms(contactPhone, contactMsg).catch((err) => {
            console.error("[v0] 담당자 반려 SMS 발송 실패:", err)
          })
        }
      }
    } catch (smsError) {
      console.error("Failed to send SMS:", smsError)
    }

    return NextResponse.json({
      message: `신청이 ${action === "approve" ? "승인" : "반려"}되었습니다`,
      application: updatedApplication,
    })
  } catch (error) {
    console.error("[v0] Admin approval error:", error)
    console.error("[v0] Error details:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "서버 오류가 발생했습니다",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 },
    )
  }
}
