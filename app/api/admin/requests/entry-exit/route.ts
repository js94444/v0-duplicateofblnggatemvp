import { type NextRequest, NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { ApplicationStatus } from "@/lib/types"
import { sendEmail } from "@/lib/email/sender"
import { getApprovalEmailTemplate, getRejectionEmailTemplate } from "@/lib/email/templates"
import { getApprovalSmsText, getRejectionSmsText } from "@/lib/messages/sms-templates"
import { sendSMS } from "@/lib/services/solapi"

// 전화번호 정규화 함수
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ""
  return phone.replace(/[^0-9]/g, "")
}

// SMS 실패 시 관리자 알림 (로그만 남김)
async function notifyAdminSmsFailure(error: string, context: any) {
  console.error("[v0] SMS 발송 실패:", error, context)
}

// SMS 발송 wrapper (기존 코드와 호환)
async function sendSms(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendSMS({ to, message })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

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

    const app = updatedApplication as any
    
    // 승인 시 QR 출입권(visit_passes) 발급
    let passReceipt: string | null = null
    if (action === "approve") {
      try {
        passReceipt = AzureSqlDB.generatePassReceipt()
        await AzureSqlDB.createPassForApplication(id, passReceipt)
      } catch (passError) {
        console.error("[v0] Failed to issue visit pass:", passError)
        // QR 발급 실패해도 승인/알림 플로우는 계속 진행
      }

      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
      const qrPageUrl = passReceipt && baseUrl ? `${baseUrl}/qr/${encodeURIComponent(passReceipt)}` : ""
      const approvalText = getApprovalSmsText({
        receipt: app.receipt || passReceipt || "N/A",
        visit_start_date: app.visit_start_date ?? app.visit_datetime,
        visit_end_date: app.visit_end_date ?? app.visit_datetime,
        access_area: app.access_area ?? "",
        qr_page_url: qrPageUrl || undefined,
      })

      // 신청자에게 승인 문자
      const visitorPhone = app.visitor_phone || app.contact_phone
      if (normalizePhone(visitorPhone).length >= 10) {
        const smsResult = await sendSms(visitorPhone, approvalText)
        if (!smsResult.success) {
          await notifyAdminSmsFailure(smsResult.error ?? "알 수 없음", {
            receipt: app.receipt,
            to: visitorPhone,
            recipientType: "신청자",
            applicationId: id,
          })
        }
      }
    } else if (action === "reject") {
      const rejectionText = getRejectionSmsText({
        receipt: app.receipt,
        rejection_reason: reason ?? app.rejection_reason,
      })
      // 신청자에게 반려 안내 SMS
      const visitorPhone = app.visitor_phone ?? ""
      if (normalizePhone(visitorPhone).length >= 10) {
        const smsResult = await sendSms(visitorPhone, rejectionText)
        if (!smsResult.success) {
          await notifyAdminSmsFailure(smsResult.error ?? "알 수 없음", {
            receipt: app.receipt,
            to: visitorPhone,
            recipientType: "신청자",
            applicationId: id,
          })
        }
      }
      // 담당자에게 반려 안내 SMS
      const contactMobile = app.contact_mobile ?? ""
      if (normalizePhone(contactMobile).length >= 10) {
        const smsResult = await sendSms(contactMobile, rejectionText)
        if (!smsResult.success) {
          await notifyAdminSmsFailure(smsResult.error ?? "알 수 없음", {
            receipt: app.receipt,
            to: contactMobile,
            recipientType: "담당자",
            applicationId: id,
          })
        }
      }
    }

    try {
      const emailTemplate =
        action === "approve"
          ? getApprovalEmailTemplate(updatedApplication)
          : getRejectionEmailTemplate(updatedApplication, reason || "")

      const to =
        (updatedApplication as any).contact_email ??
        (updatedApplication as any).contactEmail ??
        null

      if (to) {
        await sendEmail(to, emailTemplate)
      } else {
        console.warn("[v0] No contact email found for application:", id)
      }
    } catch (emailError) {
      console.error("Failed to send approval/rejection email:", emailError)
      // Continue with the response even if email fails
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
