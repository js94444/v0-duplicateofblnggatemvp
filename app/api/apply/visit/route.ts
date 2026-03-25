import { NextResponse } from "next/server"
import { AzureSqlDB } from "@/lib/db/azure-sql"
import { sendSms } from "@/lib/services/solapi"
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

    // SMS 발송 (보안담당자 + 담당자에게 접수 알림)
    try {
      // 보안담당자 전화번호 목록 조회
      const securityPhones = await AzureSqlDB.getSecurityAccountPhones()
      console.log("[v0] 보안담당자 전화번호 목록:", securityPhones)

      // 담당자 전화번호 (contact_mobile 또는 contact_phone)
      const contactPhone = body.contact_mobile || body.contact_phone
      console.log("[v0] 담당자 전화번호:", contactPhone)
      
      // 보안담당자용 메시지
      const securitySmsMessage = getSubmissionSmsText({
        receipt: result.application_number || result.receipt || "N/A",
        visitor_name: body.visitor_name || body.name || "",
        visitor_phone: body.visitor_phone || body.contact_phone || "",
        visitor_organization: body.visitor_organization || body.organization || "",
        visit_start_date: body.visit_start_date || body.visit_datetime || "",
        visit_end_date: body.visit_end_date || body.visit_datetime || "",
        access_area: body.access_area || "",
        visit_purpose: body.visit_purpose || body.purpose || "",
        status: "pending",
        companionsCount: body.companions?.length || 0,
        statusUrl: "https://v0-lng-tml.vercel.app",
      }, 'security')

      // 담당자용 메시지
      const contactSmsMessage = getSubmissionSmsText({
        receipt: result.application_number || result.receipt || "N/A",
        visitor_name: body.visitor_name || body.name || "",
        visitor_phone: body.visitor_phone || body.contact_phone || "",
        visitor_organization: body.visitor_organization || body.organization || "",
        visit_start_date: body.visit_start_date || body.visit_datetime || "",
        visit_end_date: body.visit_end_date || body.visit_datetime || "",
        access_area: body.access_area || "",
        visit_purpose: body.visit_purpose || body.purpose || "",
        status: "pending",
        companionsCount: body.companions?.length || 0,
        statusUrl: "https://v0-lng-tml.vercel.app",
      }, 'contact')

      // 보안담당자들에게 발송
      const smsResults = await Promise.allSettled(
        securityPhones.map((phone) => sendSms(phone, securitySmsMessage))
      )
      console.log("[v0] 보안담당자 SMS 발송 결과:", smsResults)

      // 담당자에게도 발송
      if (contactPhone) {
        await sendSms(contactPhone, contactSmsMessage).catch((err) => {
          console.error("[v0] 담당자 SMS 발송 실패:", err)
        })
      }
    } catch (smsError) {
      console.error("[v0] SMS 발송 실패 (신청 접수는 정상 처리됨):", smsError)
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
