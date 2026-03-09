import { NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { sendSMS } from "@/lib/services/solapi"
import { getSubmissionSmsText } from "@/lib/messages/sms-templates"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Extract client IP address
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown'

    const result = await AzureSqlDB.createVisitApplication({
      ...body,
      submission_ip: clientIp
    })

    // SMS 발송 (신청자에게 접수 확인 문자)
    const visitorPhone = body.visitor_phone || body.contact_phone
    if (visitorPhone) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""
        const statusUrl = baseUrl ? `${baseUrl}/status/${result.application_number}` : ""
        
        const smsMessage = getSubmissionSmsText({
          receipt: result.application_number || result.receipt || "N/A",
          visitor_name: body.visitor_name || body.name || "",
          visitor_phone: visitorPhone,
          visitor_organization: body.visitor_organization || body.organization || "",
          visit_start_date: body.visit_start_date || body.visit_datetime || "",
          visit_end_date: body.visit_end_date || body.visit_datetime || "",
          access_area: body.access_area || "",
          visit_purpose: body.visit_purpose || body.purpose || "",
          status: "pending",
          companionsCount: body.companions?.length || 0,
          statusUrl: statusUrl,
        })

        await sendSMS({ to: visitorPhone, message: smsMessage })
      } catch (smsError) {
        console.error("[v0] SMS 발송 실패 (신청 접수는 정상 처리됨):", smsError)
        // SMS 실패해도 신청 접수는 성공으로 처리
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "방문 신청이 접수되었습니다.",
        data: result,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("[v0] Error creating visit application:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "신청 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    )
  }
}
