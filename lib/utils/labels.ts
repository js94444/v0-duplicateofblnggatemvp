import { AccessArea, ApplicationStatus, ApplicationType } from "@/lib/types"

export const ACCESS_AREA_LABELS: Record<AccessArea, string> = {
  [AccessArea.PROCESS]: "공정지역",
  [AccessArea.PORT]: "항만지역",
  [AccessArea.SECURITY]: "경비동",
  [AccessArea.HQ]: "본관동",
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: "접수완료",
  [ApplicationStatus.UNDER_REVIEW]: "검토중",
  [ApplicationStatus.APPROVED]: "승인완료",
  [ApplicationStatus.REJECTED]: "반려",
}

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  [ApplicationType.GROUP_VISIT]: "단체방문신청",
  [ApplicationType.PORT_ACCESS]: "항만출입신청",
  [ApplicationType.GOODS_INOUT]: "물품반입반출신청",
  [ApplicationType.VISIT_R3]: "개인방문신청",
}

export const APPLICATION_TYPE_CODES: Record<ApplicationType, string> = {
  [ApplicationType.GROUP_VISIT]: "GV",
  [ApplicationType.PORT_ACCESS]: "PA",
  [ApplicationType.GOODS_INOUT]: "GI",
  [ApplicationType.VISIT_R3]: "VR",
}
