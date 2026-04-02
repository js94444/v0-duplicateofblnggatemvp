import type { EmailTemplate } from "./templates"

export async function sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
  console.log("[v0] Email sending is disabled")
  return true
}

export function getApplicantEmail(application: any): string | null {
  return null
}

export function getApplicantName(application: any): string {
  // Extract name from different application types
  if (application.contact_name) {
    return application.contact_name
  }

  if (application.type === "GROUP_VISIT") {
    return application.representative || application.escort_name || "신청자"
  }

  if (application.type === "VISIT_R3") {
    return application.visitor_name || "신청자"
  }

  if (application.type === "PORT_ACCESS") {
    return application.contact_name || "신청자"
  }

  return "신청자"
}

export async function sendApplicationSubmissionEmail(application: any): Promise<boolean> {
  console.log("[v0] Application submission email disabled")
  return true
}

function getApplicationSubmissionTemplate(application: any): EmailTemplate {
  // Placeholder for template generation logic
  return {
    subject: "Application Submission Confirmation",
    html: `<p>Your application with ID ${application.id} has been submitted successfully.</p>`,
    text: `Your application with ID ${application.id} has been submitted successfully.`,
  }
}
