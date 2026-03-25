export enum AccessArea {
  MAIN_1F = "MAIN_1F",
  MAIN_3F = "MAIN_3F",
  PROCESS = "PROCESS",
  SECURITY = "SECURITY",
  // Port-specific areas
  PIER_1 = "PIER_1",
  PIER_2 = "PIER_2",
  SUBSTATION = "SUBSTATION",
  OTHER = "OTHER",
}

export enum ApplicationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  UNDER_REVIEW = "UNDER_REVIEW",
}

export enum ApplicationType {
  GROUP_VISIT = "GROUP_VISIT",
  PORT_ACCESS = "PORT_ACCESS",
  GOODS_INOUT = "GOODS_INOUT",
  VISIT_R3 = "VISIT_R3",
}

export interface BaseApplication {
  id: string
  receipt: string
  type: ApplicationType
  contact_name?: string
  access_area: string
  status: ApplicationStatus
  created_at: Date
  updated_at: Date
  rejection_reason?: string
  files: FileUpload[]
  vehicle_number?: string
  vehicle_model?: string
  visit_start_time?: string
  visit_end_time?: string
}

export interface FileUpload {
  id: string
  filename: string
  fileKey: string
  fileType: string
  uploadedAt: Date
}

// Group Visit Application (14.1)
export interface GroupVisitApplication extends BaseApplication {
  type: ApplicationType.GROUP_VISIT
  organization: string
  representative: string
  contact_phone: string
  visit_start_date: Date
  visit_end_date: Date
  visit_purpose: string
  visit_location: string
  escort_name: string
  escort_phone: string
  escort_department: string
  visitors: VisitorInfo[]
}

export interface VisitorInfo {
  name: string
  birth_date: string
  phone: string
  organization: string
  position: string
}

// Port Access Application (14.5)
export interface PortAccessApplication extends BaseApplication {
  type: ApplicationType.PORT_ACCESS
  access_start_datetime: Date
  access_end_datetime: Date
  access_purpose: string
  personnel: PersonnelInfo[]
}

export interface PersonnelInfo {
  organization: string
  position: string
  name: string
  birth_date: string
  address: string
}

// Goods In/Out Application (14.7)
export interface GoodsInOutApplication extends BaseApplication {
  type: ApplicationType.GOODS_INOUT
  inout_type: "IN" | "OUT"
  usage_purpose: string
  items: GoodsItem[]
}

export interface GoodsItem {
  name: string
  specification: string
  quantity: number
  unit: string
  remarks?: string
}

// Individual Visit Application (14.8)
export interface VisitR3Application extends BaseApplication {
  type: ApplicationType.VISIT_R3
  visitor_name: string
  visitor_phone: string
  visitor_organization: string
  visitor_position: string
  visit_datetime: Date
  visit_purpose: string
  vehicle_number?: string
  vehicle_model?: string
  contact_email?: string
  companions?: CompanionInfo[]
}

export interface CompanionInfo {
  name: string
  phone: string
  birth_date?: string
  organization?: string
  position?: string
}

export type Application = GroupVisitApplication | PortAccessApplication | GoodsInOutApplication | VisitR3Application

export const APPLICATION_STATUS_LABELS = {
  [ApplicationStatus.PENDING]: "접수 대기",
  [ApplicationStatus.APPROVED]: "승인",
  [ApplicationStatus.REJECTED]: "반려",
  [ApplicationStatus.CANCELLED]: "신청취소",
} as const

export const APPLICATION_TYPE_LABELS = {
  [ApplicationType.GROUP_VISIT]: "단체방문신청",
  [ApplicationType.PORT_ACCESS]: "항만출입신청",
  [ApplicationType.GOODS_INOUT]: "물품반입반출신청",
  [ApplicationType.VISIT_R3]: "개인방문신청",
} as const



export const APPLICATION_TYPE_CODES = {
  [ApplicationType.GROUP_VISIT]: "GV",
  [ApplicationType.PORT_ACCESS]: "PA",
  [ApplicationType.GOODS_INOUT]: "GI",
  [ApplicationType.VISIT_R3]: "VR",
} as const
