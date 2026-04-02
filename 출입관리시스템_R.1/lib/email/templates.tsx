export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export function getApplicationSubmissionTemplate(application: any): EmailTemplate {
  const applicantName = getApplicantName(application)
  const receiptNumber = application.receiptNumber || application.id
  const applicationDate = new Date(application.createdAt || Date.now()).toLocaleDateString("ko-KR")

  const subject = `[보령LNG터미널] 출입 신청이 접수되었습니다 - 접수번호: ${receiptNumber}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0298c2; margin: 0;">보령LNG터미널</h1>
        <p style="color: #666; margin: 5px 0;">출입 신청 접수 안내</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-top: 0;">신청이 정상적으로 접수되었습니다</h2>
        <p>안녕하세요, <strong>${applicantName}</strong>님</p>
        <p>보령LNG터미널 출입 신청이 정상적으로 접수되었습니다.</p>
      </div>
      
      <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">접수 정보</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">접수번호</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${receiptNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">신청일시</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${applicationDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">처리상태</td>
            <td style="padding: 8px 0; color: #f59e0b;">검토중</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h4 style="color: #1976d2; margin-top: 0;">처리 현황 확인</h4>
        <p style="margin: 0;">신청 현황은 B-LINK 홈페이지에서 접수번호로 확인하실 수 있습니다.</p>
      </div>
      
      <div style="border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 14px;">
        <p><strong>문의처:</strong> 보령LNG터미널 보안팀</p>
        <p><strong>이메일:</strong> security@boryeong-lng.co.kr</p>
        <p><strong>전화:</strong> 041-930-3000</p>
      </div>
    </div>
  `

  const text = `
보령LNG터미널 출입 신청 접수 안내

안녕하세요, ${applicantName}님

보령LNG터미널 출입 신청이 정상적으로 접수되었습니다.

접수 정보:
- 접수번호: ${receiptNumber}
- 신청일시: ${applicationDate}
- 처리상태: 검토중

처리 현황은 B-LINK 홈페이지에서 접수번호로 확인하실 수 있습니다.

문의처: 보령LNG터미널 보안팀
이메일: security@boryeong-lng.co.kr
전화: 041-930-3000
  `

  return { subject, html, text }
}

export const getApplicationSubmittedTemplate = getApplicationSubmissionTemplate

export function getApprovalEmailTemplate(application: any): EmailTemplate {
  const applicantName = getApplicantName(application)
  const receiptNumber = application.receiptNumber || application.id

  const subject = `[보령LNG터미널] 출입 신청이 승인되었습니다 - 접수번호: ${receiptNumber}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0298c2; margin: 0;">보령LNG터미널</h1>
        <p style="color: #666; margin: 5px 0;">출입 신청 승인 안내</p>
      </div>
      
      <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
        <h2 style="color: #155724; margin-top: 0;">✅ 출입 신청이 승인되었습니다</h2>
        <p>안녕하세요, <strong>${applicantName}</strong>님</p>
        <p>보령LNG터미널 출입 신청(접수번호: ${receiptNumber})이 승인되었습니다.</p>
      </div>
      
      <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">출입 시 준수사항</h3>
        <ul style="padding-left: 20px;">
          <li>신분증을 반드시 지참해주세요</li>
          <li>보안검색에 협조해주세요</li>
          <li>지정된 구역 외 출입을 금지합니다</li>
          <li>안전수칙을 준수해주세요</li>
          <li>촬영 및 녹음을 금지합니다</li>
        </ul>
      </div>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
        <h4 style="color: #856404; margin-top: 0;">⚠️ 중요 안내</h4>
        <p style="margin: 0;">출입 당일 신분증과 승인 확인서를 지참하시기 바랍니다.</p>
      </div>
      
      <div style="border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 14px;">
        <p><strong>문의처:</strong> 보령LNG터미널 보안팀</p>
        <p><strong>이메일:</strong> security@boryeong-lng.co.kr</p>
        <p><strong>전화:</strong> 041-930-3000</p>
      </div>
    </div>
  `

  const text = `
보령LNG터미널 출입 신청 승인 안내

안녕하세요, ${applicantName}님

보령LNG터미널 출입 신청(접수번호: ${receiptNumber})이 승인되었습니다.

출입 시 준수사항:
- 신분증을 반드시 지참해주세요
- 보안검색에 협조해주세요
- 지정된 구역 외 출입을 금지합니다
- 안전수칙을 준수해주세요
- 촬영 및 녹음을 금지합니다

중요: 출입 당일 신분증과 승인 확인서를 지참하시기 바랍니다.

문의처: 보령LNG터미널 보안팀
이메일: security@boryeong-lng.co.kr
전화: 041-930-3000
  `

  return { subject, html, text }
}

export function getRejectionEmailTemplate(application: any, reason: string): EmailTemplate {
  const applicantName = getApplicantName(application)
  const receiptNumber = application.receiptNumber || application.id

  const subject = `[보령LNG터미널] 출입 신청이 반려되었습니다 - 접수번호: ${receiptNumber}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0298c2; margin: 0;">보령LNG터미널</h1>
        <p style="color: #666; margin: 5px 0;">출입 신청 반려 안내</p>
      </div>
      
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
        <h2 style="color: #721c24; margin-top: 0;">❌ 출입 신청이 반려되었습니다</h2>
        <p>안녕하세요, <strong>${applicantName}</strong>님</p>
        <p>보령LNG터미널 출입 신청(접수번호: ${receiptNumber})이 반려되었습니다.</p>
      </div>
      
      <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">반려 사유</h3>
        <p style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 0;">${reason}</p>
      </div>
      
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h4 style="color: #1976d2; margin-top: 0;">재신청 안내</h4>
        <p style="margin: 0;">반려 사유를 확인하신 후 필요한 서류를 보완하여 재신청하실 수 있습니다.</p>
      </div>
      
      <div style="border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 14px;">
        <p><strong>문의처:</strong> 보령LNG터미널 보안팀</p>
        <p><strong>이메일:</strong> security@boryeong-lng.co.kr</p>
        <p><strong>전화:</strong> 041-930-3000</p>
      </div>
    </div>
  `

  const text = `
보령LNG터미널 출입 신청 반려 안내

안녕하세요, ${applicantName}님

보령LNG터미널 출입 신청(접수번호: ${receiptNumber})이 반려되었습니다.

반려 사유: ${reason}

반려 사유를 확인하신 후 필요한 서류를 보완하여 재신청하실 수 있습니다.

문의처: 보령LNG터미널 보안팀
이메일: security@boryeong-lng.co.kr
전화: 041-930-3000
  `

  return { subject, html, text }
}

// Helper function
function getApplicantName(application: any): string {
  if (application.contact_name) return application.contact_name
  if (application.type === "GROUP_VISIT") return application.representative || application.escort_name || "신청자"
  if (application.type === "VISIT_R3") return application.visitor_name || "신청자"
  if (application.type === "PORT_ACCESS") return application.contact_name || "신청자"
  return "신청자"
}
