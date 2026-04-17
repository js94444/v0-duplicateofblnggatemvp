import { type NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { ApplicationStatus } from "@/lib/types"
import { sendEmail } from "@/lib/email/sender"
import { getApprovalEmailTemplate, getRejectionEmailTemplate } from "@/lib/email/templates"
import { sendSms } from "@/lib/services/solapi"
import { getApprovalSMSMessage, getRejectionSMSMessage, getCancelApprovalSMSMessage } from "@/lib/messages/sms-templates"
import { getAuthenticatedAdmin, isAuthError } from "@/lib/auth/require-admin"

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthenticatedAdmin(request)
    if (isAuthError(auth)) return auth
    const { id, action, reason, isFreePass } = await request.json()

    console.log("[v0] Approval API called with:", { id, action, reason, isFreePass })

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

    // ── 승인 취소 처리 ────────────────────────────────────────────────────
    if (action === "cancel") {
      // 1) 상태를 PENDING으로 복귀
      const cancelledApp = await AzureSqlDB.updateApplicationStatus(id, ApplicationStatus.PENDING, undefined)
      if (!cancelledApp) {
        return NextResponse.json({ code: "NOT_FOUND", message: "해당 신청을 찾을 수 없습니다" }, { status: 404 })
      }

      // 2) QR pass 무효화 (REVOKED)
      await AzureSqlDB.revokePassesByApplicationId(id)
      console.log("[v0] Revoked passes for application:", id)

      // 2-1) 프리패스 플래그 리셋 (재승인 시 다시 선택하도록)
      await AzureSqlDB.setFreePassFlag(id, false)

      // 3) SMS 발송 (신청자 + 담당자)
      try {
        const visitorPhone = cancelledApp.visitor_phone || (cancelledApp as any).contactPhone
        const contactPhone = (cancelledApp as any).contact_mobile || (cancelledApp as any).contact_phone
        if (visitorPhone) {
          await sendSms(visitorPhone, getCancelApprovalSMSMessage(cancelledApp, 'applicant')).catch(() => {})
        }
        if (contactPhone) {
          await sendSms(contactPhone, getCancelApprovalSMSMessage(cancelledApp, 'contact')).catch(() => {})
        }
      } catch (smsErr) {
        console.error("[v0] 승인취소 SMS 발송 실패:", smsErr)
      }

      return NextResponse.json({
        message: "승인이 취소되었습니다. 신청이 접수 대기 상태로 변경됩니다.",
        application: cancelledApp,
      })
    }
    // ────────────────────────────────────────────────────────────────────

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

    // 승인 시 QR pass_receipt 생성 (신청자 + 동행인 각각)
    let pass_receipt: string | null = null
    let companionPasses: { companion_id: number; name: string; phone: string; pass_receipt: string }[] = []

    if (action === "approve") {
      // 프리패스 플래그 저장
      if (isFreePass) {
        await AzureSqlDB.setFreePassFlag(id, true)
        console.log("[v0] Marked as FREE PASS:", id)
      }

      // 신청자 QR 생성 - application_number 사용
      const applicationNumber = updatedApplication.application_number || updatedApplication.receipt || AzureSqlDB.generatePassReceipt()
      pass_receipt = applicationNumber
      await AzureSqlDB.createPassForApplication(id, pass_receipt)
      console.log("[v0] Created applicant pass_receipt:", pass_receipt)

      // 동행인 QR 생성 - application_number-1, -2 형식
      const companions = await AzureSqlDB.getCompanionsWithIdByApplicationId(id)
      for (let i = 0; i < companions.length; i++) {
        const companion = companions[i]
        const companionPassReceipt = `${applicationNumber}-${i + 1}`
        await AzureSqlDB.createPassForCompanion(id, companion.companion_id, companionPassReceipt)
        companionPasses.push({
          companion_id: companion.companion_id,
          name: companion.name,
          phone: companion.phone,
          pass_receipt: companionPassReceipt
        })
        console.log("[v0] Created companion pass_receipt:", companionPassReceipt, "for:", companion.name)
      }
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
        // 승인 시: 신청자에게 본인 QR 발송
        if (visitorPhone) {
          const applicantMsg = getApprovalSMSMessage(pass_receipt, updatedApplication, 'applicant')
          await sendSms(visitorPhone, applicantMsg).catch((err) => {
            console.error("[v0] 신청자 SMS 발송 실패:", err)
          })
        }

        // 동행인들에게 각자의 QR 발송
        for (const companion of companionPasses) {
          if (companion.phone) {
            const companionMsg = getApprovalSMSMessage(companion.pass_receipt, updatedApplication, 'companion')
            await sendSms(companion.phone, companionMsg).catch((err) => {
              console.error("[v0] 동행인 SMS 발송 실패:", companion.name, err)
            })
          }
        }

        // 승인 시: 담당자에게 승인 완료 알림
        if (contactPhone) {
          const contactMsg = `[담당자용] 보령LNG터미널 방문 신청이 승인되었습니다.\n신청자: ${updatedApplication.visitor_name || ""}\n접수번호: ${updatedApplication.application_number || updatedApplication.receipt || ""}\n동행인: ${companionPasses.length}명`
          await sendSms(contactPhone, contactMsg).catch(() => { })
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
