import { prisma } from './prisma'
import { Application, ApplicationStatus, ApplicationType } from '@/lib/types'
import { generateReceiptNumber } from '@/lib/utils/receipt'

export class PrismaDB {
  // 개인방문 신청서 생성
  static async createVisitR3Application(data: {
    visitor_name: string
    visitor_phone: string
    visitor_organization: string
    visitor_position: string
    visit_datetime: Date
    visit_purpose: string
    contact_name?: string
    contact_email?: string
    access_area: string
    vehicle_number?: string
    vehicle_model?: string
    visit_start_time?: string
    visit_end_time?: string
  }): Promise<Application> {
    const receipt = generateReceiptNumber('VR')

    const visitR3 = await prisma.visitR3.create({
      data: {
        receipt,
        type: ApplicationType.VISIT_R3,
        status: ApplicationStatus.PENDING,
        visitor_name: data.visitor_name,
        visitor_phone: data.visitor_phone,
        visitor_organization: data.visitor_organization,
        visitor_position: data.visitor_position,
        visit_datetime: data.visit_datetime,
        visit_purpose: data.visit_purpose,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        access_area: data.access_area,
        vehicle_number: data.vehicle_number,
        vehicle_model: data.vehicle_model,
        visit_start_time: data.visit_start_time,
        visit_end_time: data.visit_end_time,
      },
    })

    console.log('[v0] Created visit_r3 in Azure SQL:', visitR3)

    // Application 타입으로 변환
    return {
      id: visitR3.id,
      receipt: visitR3.receipt,
      type: visitR3.type as ApplicationType,
      status: visitR3.status as ApplicationStatus,
      contact_name: visitR3.contact_name || undefined,
      access_area: visitR3.access_area,
      rejection_reason: visitR3.rejection_reason || undefined,
      vehicle_number: visitR3.vehicle_number || undefined,
      vehicle_model: visitR3.vehicle_model || undefined,
      visit_start_time: visitR3.visit_start_time || undefined,
      visit_end_time: visitR3.visit_end_time || undefined,
      created_at: visitR3.created_at,
      updated_at: visitR3.updated_at,
      files: [],
      visitor_name: visitR3.visitor_name,
      visitor_phone: visitR3.visitor_phone,
      visitor_organization: visitR3.visitor_organization,
      visitor_position: visitR3.visitor_position,
      visit_datetime: visitR3.visit_datetime,
      visit_purpose: visitR3.visit_purpose,
      contact_email: visitR3.contact_email || undefined,
    }
  }

  // 접수번호로 신청서 조회
  static async getApplicationByReceipt(receipt: string): Promise<Application | null> {
    const visitR3 = await prisma.visitR3.findUnique({
      where: { receipt },
    })

    if (!visitR3) return null

    return {
      id: visitR3.id,
      receipt: visitR3.receipt,
      type: visitR3.type as ApplicationType,
      status: visitR3.status as ApplicationStatus,
      contact_name: visitR3.contact_name || undefined,
      access_area: visitR3.access_area,
      rejection_reason: visitR3.rejection_reason || undefined,
      vehicle_number: visitR3.vehicle_number || undefined,
      vehicle_model: visitR3.vehicle_model || undefined,
      visit_start_time: visitR3.visit_start_time || undefined,
      visit_end_time: visitR3.visit_end_time || undefined,
      created_at: visitR3.created_at,
      updated_at: visitR3.updated_at,
      files: [],
      visitor_name: visitR3.visitor_name,
      visitor_phone: visitR3.visitor_phone,
      visitor_organization: visitR3.visitor_organization,
      visitor_position: visitR3.visitor_position,
      visit_datetime: visitR3.visit_datetime,
      visit_purpose: visitR3.visit_purpose,
      contact_email: visitR3.contact_email || undefined,
    }
  }

  // 모든 신청서 조회
  static async getAllApplications(): Promise<Application[]> {
    const visitR3List = await prisma.visitR3.findMany({
      orderBy: { created_at: 'desc' },
    })

    return visitR3List.map((visitR3) => ({
      id: visitR3.id,
      receipt: visitR3.receipt,
      type: visitR3.type as ApplicationType,
      status: visitR3.status as ApplicationStatus,
      contact_name: visitR3.contact_name || undefined,
      access_area: visitR3.access_area,
      rejection_reason: visitR3.rejection_reason || undefined,
      vehicle_number: visitR3.vehicle_number || undefined,
      vehicle_model: visitR3.vehicle_model || undefined,
      visit_start_time: visitR3.visit_start_time || undefined,
      visit_end_time: visitR3.visit_end_time || undefined,
      created_at: visitR3.created_at,
      updated_at: visitR3.updated_at,
      files: [],
      visitor_name: visitR3.visitor_name,
      visitor_phone: visitR3.visitor_phone,
      visitor_organization: visitR3.visitor_organization,
      visitor_position: visitR3.visitor_position,
      visit_datetime: visitR3.visit_datetime,
      visit_purpose: visitR3.visit_purpose,
      contact_email: visitR3.contact_email || undefined,
    }))
  }

  // 신청서 상태 업데이트
  static async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    rejectionReason?: string
  ): Promise<Application> {
    const visitR3 = await prisma.visitR3.update({
      where: { id },
      data: {
        status,
        rejection_reason: rejectionReason,
      },
    })

    return {
      id: visitR3.id,
      receipt: visitR3.receipt,
      type: visitR3.type as ApplicationType,
      status: visitR3.status as ApplicationStatus,
      contact_name: visitR3.contact_name || undefined,
      access_area: visitR3.access_area,
      rejection_reason: visitR3.rejection_reason || undefined,
      vehicle_number: visitR3.vehicle_number || undefined,
      vehicle_model: visitR3.vehicle_model || undefined,
      visit_start_time: visitR3.visit_start_time || undefined,
      visit_end_time: visitR3.visit_end_time || undefined,
      created_at: visitR3.created_at,
      updated_at: visitR3.updated_at,
      files: [],
      visitor_name: visitR3.visitor_name,
      visitor_phone: visitR3.visitor_phone,
      visitor_organization: visitR3.visitor_organization,
      visitor_position: visitR3.visitor_position,
      visit_datetime: visitR3.visit_datetime,
      visit_purpose: visitR3.visit_purpose,
      contact_email: visitR3.contact_email || undefined,
    }
  }

  // 통계 조회
  static async getApplicationStats() {
    const [total, pending, approved, rejected, underReview] = await Promise.all([
      prisma.visitR3.count(),
      prisma.visitR3.count({ where: { status: ApplicationStatus.PENDING } }),
      prisma.visitR3.count({ where: { status: ApplicationStatus.APPROVED } }),
      prisma.visitR3.count({ where: { status: ApplicationStatus.REJECTED } }),
      prisma.visitR3.count({ where: { status: ApplicationStatus.UNDER_REVIEW } }),
    ])

    return {
      total,
      pending,
      approved,
      rejected,
      under_review: underReview,
    }
  }
}
