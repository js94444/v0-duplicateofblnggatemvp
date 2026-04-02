import {
  type Application,
  type ApplicationStatus,
  type GroupVisitApplication,
  type PortAccessApplication,
  type VisitR3Application,
  AccessArea,
  ApplicationStatus as Status,
  ApplicationType as Type,
} from "@/lib/types"
import { generateReceiptNumber } from "@/lib/utils/receipt"

// In-memory storage
const applications: Application[] = []
let nextId = 1
let isInitialized = false // 초기화 상태 추적 변수 추가

// Initialize with some mock data
function initializeMockData() {
  if (isInitialized || applications.length > 0) {
    console.log("[v0] Mock data initialization skipped, applications count:", applications.length)
    return
  }

  console.log("[v0] Initializing mock data...")

  const mockApplications: Application[] = [
    {
      id: "1",
      receipt: "GV-20250501-0001",
      type: Type.GROUP_VISIT,
      contact_name: "김철수",
      access_area: AccessArea.PROCESS,
      status: Status.APPROVED,
      created_at: new Date("2025-05-01T09:00:00"),
      updated_at: new Date("2025-05-01T14:30:00"),
      files: [],
      organization: "한국산업기술원",
      representative: "이영희",
      contact_phone: "02-1234-5678",
      visit_start_date: new Date("2025-05-15"),
      visit_end_date: new Date("2025-05-15"),
      visit_purpose: "시설 견학 및 기술 교류",
      visit_location: "공정지역 1동",
      escort_name: "박민수",
      escort_phone: "010-1234-5678",
      escort_department: "기술부",
      visitors: [
        {
          name: "홍길동",
          birth_date: "1985-03-15",
          phone: "010-1111-2222",
          organization: "한국산업기술원",
          position: "연구원",
        },
        {
          name: "김영수",
          birth_date: "1990-07-22",
          phone: "010-3333-4444",
          organization: "한국산업기술원",
          position: "선임연구원",
        },
      ],
    } as GroupVisitApplication,
    {
      id: "2",
      receipt: "GV-20250503-0002",
      type: Type.GROUP_VISIT,
      contact_name: "박지영",
      access_area: AccessArea.MAIN_3F,
      status: Status.PENDING,
      created_at: new Date("2025-05-03T10:30:00"),
      updated_at: new Date("2025-05-03T10:30:00"),
      files: [],
      organization: "대한화학공업협회",
      representative: "최민호",
      contact_phone: "02-2345-6789",
      visit_start_date: new Date("2025-05-20"),
      visit_end_date: new Date("2025-05-20"),
      visit_purpose: "안전관리 시스템 벤치마킹",
      visit_location: "본사 회의실",
      escort_name: "정수현",
      escort_phone: "010-2345-6789",
      escort_department: "안전관리팀",
      visitors: [
        {
          name: "이상훈",
          birth_date: "1978-12-03",
          phone: "010-5555-6666",
          organization: "대한화학공업협회",
          position: "부장",
        },
      ],
    } as GroupVisitApplication,
    {
      id: "3",
      receipt: "PA-20250515-0003",
      type: Type.PORT_ACCESS,
      contact_name: "송미라",
      access_area: AccessArea.PIER_1,
      status: Status.UNDER_REVIEW,
      created_at: new Date("2025-05-15T14:15:00"),
      updated_at: new Date("2025-05-15T16:20:00"),
      files: [],
      access_start_datetime: new Date("2025-05-25T08:00:00"),
      access_end_datetime: new Date("2025-05-25T18:00:00"),
      access_purpose: "화물 검수 및 선적 작업",
      personnel: [
        {
          organization: "대한물류",
          position: "팀장",
          name: "최대한",
          birth_date: "1982-11-05",
          address: "서울시 강남구 테헤란로 123",
        },
      ],
    } as PortAccessApplication,
    {
      id: "4",
      receipt: "VR-20250520-0004",
      type: Type.VISIT_R3,
      contact_name: "정대성",
      access_area: AccessArea.MAIN_1F,
      status: Status.APPROVED,
      created_at: new Date("2025-05-20T11:45:00"),
      updated_at: new Date("2025-05-20T15:30:00"),
      files: [],
      visitor_name: "김방문",
      visitor_phone: "010-1234-5678",
      visitor_organization: "컨설팅회사",
      visitor_position: "컨설턴트",
      visit_datetime: new Date("2025-05-28T14:00:00"),
      visit_purpose: "경영 컨설팅",
      vehicle_number: "12가3456",
      vehicle_model: "아반떼",
    } as VisitR3Application,

    // June 2025 data
    {
      id: "5",
      receipt: "GV-20250602-0005",
      type: Type.GROUP_VISIT,
      contact_name: "최영진",
      access_area: AccessArea.PROCESS,
      status: Status.REJECTED,
      created_at: new Date("2025-06-02T09:20:00"),
      updated_at: new Date("2025-06-03T10:15:00"),
      rejection_reason: "방문 목적이 불분명하며, 사전 승인이 필요한 사안입니다.",
      files: [],
      organization: "미래기술연구소",
      representative: "김미래",
      contact_phone: "02-4567-8901",
      visit_start_date: new Date("2025-06-15"),
      visit_end_date: new Date("2025-06-15"),
      visit_purpose: "신기술 도입 검토",
      visit_location: "공정지역 2동",
      escort_name: "박기술",
      escort_phone: "010-5678-9012",
      escort_department: "기술개발팀",
      visitors: [
        {
          name: "이혁신",
          birth_date: "1988-02-28",
          phone: "010-2468-1357",
          organization: "미래기술연구소",
          position: "연구원",
        },
      ],
    } as GroupVisitApplication,
    {
      id: "6",
      receipt: "PA-20250610-0006",
      type: Type.PORT_ACCESS,
      contact_name: "한수정",
      access_area: AccessArea.PIER_2,
      status: Status.APPROVED,
      created_at: new Date("2025-06-10T13:30:00"),
      updated_at: new Date("2025-06-10T17:45:00"),
      files: [],
      access_start_datetime: new Date("2025-06-22T06:00:00"),
      access_end_datetime: new Date("2025-06-22T20:00:00"),
      access_purpose: "컨테이너 하역 작업",
      personnel: [
        {
          organization: "부산항만공사",
          position: "작업반장",
          name: "이하역",
          birth_date: "1978-03-22",
          address: "부산시 중구 중앙대로 100",
        },
        {
          organization: "부산항만공사",
          position: "작업원",
          name: "박컨테이너",
          birth_date: "1985-08-14",
          address: "부산시 동구 범일로 200",
        },
      ],
    } as PortAccessApplication,
    {
      id: "7",
      receipt: "VR-20250618-0007",
      type: Type.VISIT_R3,
      contact_name: "임창호",
      access_area: AccessArea.MAIN_3F,
      status: Status.PENDING,
      created_at: new Date("2025-06-18T08:45:00"),
      updated_at: new Date("2025-06-18T08:45:00"),
      files: [],
      visitor_name: "박업무",
      visitor_phone: "010-7777-8888",
      visitor_organization: "법무법인 정의",
      visitor_position: "변호사",
      visit_datetime: new Date("2025-06-25T10:00:00"),
      visit_purpose: "법무 자문",
      vehicle_number: "34나5678",
      vehicle_model: "소나타",
    } as VisitR3Application,

    // July 2025 data
    {
      id: "8",
      receipt: "GV-20250705-0008",
      type: Type.GROUP_VISIT,
      contact_name: "유지현",
      access_area: AccessArea.SECURITY,
      status: Status.UNDER_REVIEW,
      created_at: new Date("2025-07-05T16:20:00"),
      updated_at: new Date("2025-07-06T09:30:00"),
      files: [],
      organization: "국정감사단",
      representative: "국회의원 김감사",
      contact_phone: "02-788-1234",
      visit_start_date: new Date("2025-07-15"),
      visit_end_date: new Date("2025-07-15"),
      visit_purpose: "국정감사 현장 점검",
      visit_location: "전 지역",
      escort_name: "최감사",
      escort_phone: "010-8901-2345",
      escort_department: "총무팀",
      visitors: [
        {
          name: "김감사",
          birth_date: "1970-01-01",
          phone: "010-5792-4681",
          organization: "국회",
          position: "국회의원",
        },
        {
          name: "박보좌",
          birth_date: "1985-06-30",
          phone: "010-6813-5724",
          organization: "국회",
          position: "보좌관",
        },
      ],
    } as GroupVisitApplication,
    {
      id: "9",
      receipt: "PA-20250712-0009",
      type: Type.PORT_ACCESS,
      contact_name: "정미영",
      access_area: AccessArea.SUBSTATION,
      status: Status.APPROVED,
      created_at: new Date("2025-07-12T10:30:00"),
      updated_at: new Date("2025-07-12T14:20:00"),
      files: [],
      access_start_datetime: new Date("2025-07-20T08:00:00"),
      access_end_datetime: new Date("2025-07-20T18:00:00"),
      access_purpose: "전력 시설 점검",
      personnel: [
        {
          organization: "한국전력공사",
          position: "전기기사",
          name: "전기술",
          birth_date: "1980-04-15",
          address: "대전시 유성구 대덕대로 200",
        },
      ],
    } as PortAccessApplication,
    {
      id: "10",
      receipt: "VR-20250720-0010",
      type: Type.VISIT_R3,
      contact_name: "김해운",
      access_area: AccessArea.MAIN_1F,
      status: Status.APPROVED,
      created_at: new Date("2025-07-20T14:15:00"),
      updated_at: new Date("2025-07-20T16:30:00"),
      files: [],
      visitor_name: "정감사",
      visitor_phone: "010-9999-0000",
      visitor_organization: "회계법인 정확",
      visitor_position: "공인회계사",
      visit_datetime: new Date("2025-07-28T09:00:00"),
      visit_purpose: "회계 감사",
      vehicle_number: "56다7890",
      vehicle_model: "그랜저",
    } as VisitR3Application,

    // August 2025 data
    {
      id: "11",
      receipt: "GV-20250803-0011",
      type: Type.GROUP_VISIT,
      contact_name: "송선박",
      access_area: AccessArea.PROCESS,
      status: Status.APPROVED,
      created_at: new Date("2025-08-03T11:20:00"),
      updated_at: new Date("2025-08-03T15:45:00"),
      files: [],
      organization: "한국석유화학공업협회",
      representative: "김석유",
      contact_phone: "02-5678-9012",
      visit_start_date: new Date("2025-08-15"),
      visit_end_date: new Date("2025-08-15"),
      visit_purpose: "업계 동향 파악 및 정보 교류",
      visit_location: "공정지역 3동",
      escort_name: "정정보",
      escort_phone: "010-7890-1234",
      escort_department: "기획팀",
      visitors: [
        {
          name: "강동향",
          birth_date: "1983-09-18",
          phone: "010-4680-2579",
          organization: "한국석유화학공업협회",
          position: "대리",
        },
      ],
    } as GroupVisitApplication,
    {
      id: "12",
      receipt: "PA-20250810-0012",
      type: Type.PORT_ACCESS,
      contact_name: "윤화물",
      access_area: AccessArea.PIER_1,
      status: Status.PENDING,
      created_at: new Date("2025-08-10T09:30:00"),
      updated_at: new Date("2025-08-10T09:30:00"),
      files: [],
      access_start_datetime: new Date("2025-08-20T05:00:00"),
      access_end_datetime: new Date("2025-08-20T22:00:00"),
      access_purpose: "대형 화물 특수 운송",
      personnel: [
        {
          organization: "특수운송",
          position: "운송팀장",
          name: "강특수",
          birth_date: "1975-05-17",
          address: "인천시 연수구 송도대로 300",
        },
        {
          organization: "특수운송",
          position: "운전기사",
          name: "차대형",
          birth_date: "1983-09-25",
          address: "인천시 남동구 구월로 150",
        },
      ],
    } as PortAccessApplication,
    {
      id: "13",
      receipt: "VR-20250818-0013",
      type: Type.VISIT_R3,
      contact_name: "전안전",
      access_area: AccessArea.SECURITY,
      status: Status.REJECTED,
      created_at: new Date("2025-08-18T13:45:00"),
      updated_at: new Date("2025-08-19T10:20:00"),
      rejection_reason: "방문 목적이 불분명합니다. 구체적인 업무 내용을 명시하여 재신청해주세요.",
      files: [],
      visitor_name: "한개발",
      visitor_phone: "010-1111-2222",
      visitor_organization: "IT솔루션",
      visitor_position: "개발자",
      visit_datetime: new Date("2025-08-25T13:00:00"),
      visit_purpose: "시스템 점검",
      vehicle_number: "78라9012",
      vehicle_model: "투싼",
    } as VisitR3Application,
    {
      id: "14",
      receipt: "GV-20250825-0014",
      type: Type.GROUP_VISIT,
      contact_name: "홍항만",
      access_area: AccessArea.MAIN_3F,
      status: Status.APPROVED,
      created_at: new Date("2025-08-25T15:30:00"),
      updated_at: new Date("2025-08-25T17:45:00"),
      files: [],
      organization: "부산시청",
      representative: "김부산",
      contact_phone: "051-888-1234",
      visit_start_date: new Date("2025-08-30"),
      visit_end_date: new Date("2025-08-30"),
      visit_purpose: "지역 경제 발전 협력 방안 논의",
      visit_location: "본사 대회의실",
      escort_name: "조협력",
      escort_phone: "010-6789-0123",
      escort_department: "대외협력팀",
      visitors: [
        {
          name: "신지역",
          birth_date: "1982-07-12",
          phone: "010-3579-2468",
          organization: "부산시청",
          position: "과장",
        },
        {
          name: "오발전",
          birth_date: "1979-04-05",
          phone: "010-1357-9246",
          organization: "부산시청",
          position: "팀장",
        },
      ],
    } as GroupVisitApplication,

    // September 2025 data (existing data with updated IDs)
    {
      id: "15",
      receipt: "GV-20250901-0015",
      type: Type.GROUP_VISIT,
      contact_name: "김철수",
      access_area: AccessArea.PROCESS,
      status: Status.APPROVED,
      created_at: new Date("2025-09-01T09:00:00"),
      updated_at: new Date("2025-09-01T14:30:00"),
      files: [],
      organization: "한국산업기술원",
      representative: "이영희",
      contact_phone: "02-1234-5678",
      visit_start_date: new Date("2025-09-15"),
      visit_end_date: new Date("2025-09-15"),
      visit_purpose: "시설 견학 및 기술 교류",
      visit_location: "공정지역 1동",
      escort_name: "박민수",
      escort_phone: "010-1234-5678",
      escort_department: "기술부",
      visitors: [
        {
          name: "홍길동",
          birth_date: "1985-03-15",
          phone: "010-1111-2222",
          organization: "한국산업기술원",
          position: "연구원",
        },
        {
          name: "김영수",
          birth_date: "1990-07-22",
          phone: "010-3333-4444",
          organization: "한국산업기술원",
          position: "선임연구원",
        },
      ],
    } as GroupVisitApplication,
    {
      id: "16",
      receipt: "GV-20250903-0016",
      type: Type.GROUP_VISIT,
      contact_name: "박지영",
      access_area: AccessArea.MAIN_3F,
      status: Status.PENDING,
      created_at: new Date("2025-09-03T10:30:00"),
      updated_at: new Date("2025-09-03T10:30:00"),
      files: [],
      organization: "대한화학공업협회",
      representative: "최민호",
      contact_phone: "02-2345-6789",
      visit_start_date: new Date("2025-09-20"),
      visit_end_date: new Date("2025-09-20"),
      visit_purpose: "안전관리 시스템 벤치마킹",
      visit_location: "본사 회의실",
      escort_name: "정수현",
      escort_phone: "010-2345-6789",
      escort_department: "안전관리팀",
      visitors: [
        {
          name: "이상훈",
          birth_date: "1978-12-03",
          phone: "010-5555-6666",
          organization: "대한화학공업협회",
          position: "부장",
        },
      ],
    } as GroupVisitApplication,
    {
      id: "17",
      receipt: "GV-20250905-0017",
      type: Type.GROUP_VISIT,
      contact_name: "송미라",
      access_area: AccessArea.PROCESS,
      status: Status.UNDER_REVIEW,
      created_at: new Date("2025-09-05T14:15:00"),
      updated_at: new Date("2025-09-05T16:20:00"),
      files: [],
      organization: "환경부",
      representative: "김환경",
      contact_phone: "044-201-6000",
      visit_start_date: new Date("2025-09-25"),
      visit_end_date: new Date("2025-09-25"),
      visit_purpose: "환경 규제 준수 현황 점검",
      visit_location: "공정지역 전체",
      escort_name: "윤환경",
      escort_phone: "010-3456-7890",
      escort_department: "환경안전팀",
      visitors: [
        {
          name: "조환경",
          birth_date: "1980-05-20",
          phone: "010-7777-8888",
          organization: "환경부",
          position: "사무관",
        },
        {
          name: "한지구",
          birth_date: "1985-08-15",
          phone: "010-9999-0000",
          organization: "환경부",
          position: "주무관",
        },
      ],
    } as GroupVisitApplication,
    {
      id: "18",
      receipt: "GV-20250908-0018",
      type: Type.GROUP_VISIT,
      contact_name: "정대성",
      access_area: AccessArea.SECURITY,
      status: Status.APPROVED,
      created_at: new Date("2025-09-08T11:45:00"),
      updated_at: new Date("2025-09-08T15:30:00"),
      files: [],
      organization: "한국가스공사",
      representative: "김가스",
      contact_phone: "02-3456-7890",
      visit_start_date: new Date("2025-09-28"),
      visit_end_date: new Date("2025-09-28"),
      visit_purpose: "가스 안전 시설 점검",
      visit_location: "보안지역 가스 저장소",
      escort_name: "이안전",
      escort_phone: "010-4567-8901",
      escort_department: "보안팀",
      visitors: [
        {
          name: "박안전",
          birth_date: "1975-11-10",
          phone: "010-1234-5678",
          organization: "한국가스공사",
          position: "차장",
        },
      ],
    } as GroupVisitApplication,
    {
      id: "19",
      receipt: "GV-20250910-0019",
      type: Type.GROUP_VISIT,
      contact_name: "최영진",
      access_area: AccessArea.PROCESS,
      status: Status.REJECTED,
      created_at: new Date("2025-09-10T09:20:00"),
      updated_at: new Date("2025-09-11T10:15:00"),
      rejection_reason: "방문 목적이 불분명하며, 사전 승인이 필요한 사안입니다.",
      files: [],
      organization: "미래기술연구소",
      representative: "김미래",
      contact_phone: "02-4567-8901",
      visit_start_date: new Date("2025-09-30"),
      visit_end_date: new Date("2025-09-30"),
      visit_purpose: "신기술 도입 검토",
      visit_location: "공정지역 2동",
      escort_name: "박기술",
      escort_phone: "010-5678-9012",
      escort_department: "기술개발팀",
      visitors: [
        {
          name: "이혁신",
          birth_date: "1988-02-28",
          phone: "010-2468-1357",
          organization: "미래기술연구소",
          position: "연구원",
        },
      ],
    } as GroupVisitApplication,
    {
      id: "20",
      receipt: "GV-20250912-0020",
      type: Type.GROUP_VISIT,
      contact_name: "한수정",
      access_area: AccessArea.MAIN_3F,
      status: Status.APPROVED,
      created_at: new Date("2025-09-12T13:30:00"),
      updated_at: new Date("2025-09-12T17:45:00"),
      files: [],
      organization: "부산시청",
      representative: "김부산",
      contact_phone: "051-888-1234",
      visit_start_date: new Date("2025-09-22"),
      visit_end_date: new Date("2025-09-22"),
      visit_purpose: "지역 경제 발전 협력 방안 논의",
      visit_location: "본사 대회의실",
      escort_name: "조협력",
      escort_phone: "010-6789-0123",
      escort_department: "대외협력팀",
      visitors: [
        {
          name: "신지역",
          birth_date: "1982-07-12",
          phone: "010-3579-2468",
          organization: "부산시청",
          position: "과장",
        },
        {
          name: "오발전",
          birth_date: "1979-04-05",
          phone: "010-1357-9246",
          organization: "부산시청",
          position: "팀장",
        },
      ],
    } as GroupVisitApplication,

    {
      id: "21",
      receipt: "PA-20250902-0021",
      type: Type.PORT_ACCESS,
      contact_name: "정미영",
      access_area: AccessArea.PIER_1,
      status: Status.APPROVED,
      created_at: new Date("2025-09-02T10:30:00"),
      updated_at: new Date("2025-09-02T14:20:00"),
      files: [],
      access_start_datetime: new Date("2025-09-16T08:00:00"),
      access_end_datetime: new Date("2025-09-16T18:00:00"),
      access_purpose: "화물 검수 및 선적 작업",
      personnel: [
        {
          organization: "대한물류",
          position: "팀장",
          name: "최대한",
          birth_date: "1982-11-05",
          address: "서울시 강남구 테헤란로 123",
        },
      ],
    } as PortAccessApplication,
    {
      id: "22",
      receipt: "PA-20250904-0022",
      type: Type.PORT_ACCESS,
      contact_name: "김해운",
      access_area: AccessArea.PIER_2,
      status: Status.PENDING,
      created_at: new Date("2025-09-04T14:15:00"),
      updated_at: new Date("2025-09-04T14:15:00"),
      files: [],
      access_start_datetime: new Date("2025-09-18T06:00:00"),
      access_end_datetime: new Date("2025-09-18T20:00:00"),
      access_purpose: "컨테이너 하역 작업",
      personnel: [
        {
          organization: "부산항만공사",
          position: "작업반장",
          name: "이하역",
          birth_date: "1978-03-22",
          address: "부산시 중구 중앙대로 100",
        },
        {
          organization: "부산항만공사",
          position: "작업원",
          name: "박컨테이너",
          birth_date: "1985-08-14",
          address: "부산시 동구 범일로 200",
        },
      ],
    } as PortAccessApplication,
    {
      id: "23",
      receipt: "PA-20250907-0023",
      type: Type.PORT_ACCESS,
      contact_name: "송선박",
      access_area: AccessArea.SUBSTATION,
      status: Status.UNDER_REVIEW,
      created_at: new Date("2025-09-07T11:20:00"),
      updated_at: new Date("2025-09-07T15:45:00"),
      files: [],
      access_start_datetime: new Date("2025-09-21T07:00:00"),
      access_end_datetime: new Date("2025-09-21T19:00:00"),
      access_purpose: "선박 정비 및 점검",
      personnel: [
        {
          organization: "한국조선해양",
          position: "정비팀장",
          name: "조정비",
          birth_date: "1980-12-08",
          address: "울산시 동구 방어진순환도로 400",
        },
      ],
    } as PortAccessApplication,
    {
      id: "24",
      receipt: "PA-20250911-0024",
      type: Type.PORT_ACCESS,
      contact_name: "윤화물",
      access_area: AccessArea.PIER_1,
      status: Status.APPROVED,
      created_at: new Date("2025-09-11T09:30:00"),
      updated_at: new Date("2025-09-11T13:15:00"),
      files: [],
      access_start_datetime: new Date("2025-09-24T05:00:00"),
      access_end_datetime: new Date("2025-09-24T22:00:00"),
      access_purpose: "대형 화물 특수 운송",
      personnel: [
        {
          organization: "특수운송",
          position: "운송팀장",
          name: "강특수",
          birth_date: "1975-05-17",
          address: "인천시 연수구 송도대로 300",
        },
        {
          organization: "특수운송",
          position: "운전기사",
          name: "차대형",
          birth_date: "1983-09-25",
          address: "인천시 남동구 구월로 150",
        },
      ],
    } as PortAccessApplication,
    {
      id: "25",
      receipt: "PA-20250914-0025",
      type: Type.PORT_ACCESS,
      contact_name: "전안전",
      access_area: AccessArea.OTHER,
      status: Status.REJECTED,
      created_at: new Date("2025-09-14T13:45:00"),
      updated_at: new Date("2025-09-15T10:20:00"),
      rejection_reason: "항만교육이수증이 만료되었습니다. 재교육 후 재신청해주세요.",
      files: [],
      access_start_datetime: new Date("2025-09-27T08:00:00"),
      access_end_datetime: new Date("2025-09-27T17:00:00"),
      access_purpose: "안전 점검 및 교육",
      personnel: [
        {
          organization: "안전관리공단",
          position: "안전관리사",
          name: "김안전",
          birth_date: "1987-01-30",
          address: "대전시 유성구 대학로 500",
        },
      ],
    } as PortAccessApplication,
    {
      id: "26",
      receipt: "PA-20250917-0026",
      type: Type.PORT_ACCESS,
      contact_name: "홍항만",
      access_area: AccessArea.PIER_2,
      status: Status.PENDING,
      created_at: new Date("2025-09-17T15:30:00"),
      updated_at: new Date("2025-09-17T15:30:00"),
      files: [],
      access_start_datetime: new Date("2025-09-30T06:30:00"),
      access_end_datetime: new Date("2025-09-30T18:30:00"),
      access_purpose: "항만 시설 유지보수",
      personnel: [
        {
          organization: "항만시설관리",
          position: "유지보수팀장",
          name: "서유지",
          birth_date: "1979-07-11",
          address: "부산시 서구 충무대로 600",
        },
      ],
    } as PortAccessApplication,
    {
      id: "27",
      receipt: "PA-20250920-0027",
      type: Type.PORT_ACCESS,
      contact_name: "노크레인",
      access_area: AccessArea.PIER_1,
      status: Status.APPROVED,
      created_at: new Date("2025-09-20T12:15:00"),
      updated_at: new Date("2025-09-20T16:40:00"),
      files: [],
      access_start_datetime: new Date("2025-09-25T07:00:00"),
      access_end_datetime: new Date("2025-09-25T19:00:00"),
      access_purpose: "크레인 정기 점검",
      personnel: [
        {
          organization: "중장비정비",
          position: "정비사",
          name: "이크레인",
          birth_date: "1984-04-03",
          address: "부산시 사하구 낙동대로 700",
        },
      ],
    } as PortAccessApplication,

    {
      id: "28",
      receipt: "VR-20250906-0028",
      type: Type.VISIT_R3,
      contact_name: "송지훈",
      access_area: AccessArea.MAIN_3F,
      status: Status.APPROVED,
      created_at: new Date("2025-09-06T13:20:00"),
      updated_at: new Date("2025-09-06T17:30:00"),
      files: [],
      visitor_name: "윤서연",
      visitor_phone: "010-5555-6666",
      visitor_organization: "컨설팅회사",
      visitor_position: "컨설턴트",
      visit_datetime: new Date("2025-09-19T14:00:00"),
      visit_purpose: "경영 컨설팅",
      vehicle_number: "12가3456",
      vehicle_model: "아반떼",
    } as VisitR3Application,
    {
      id: "29",
      receipt: "VR-20250909-0029",
      type: Type.VISIT_R3,
      contact_name: "김방문",
      access_area: AccessArea.MAIN_1F,
      status: Status.PENDING,
      created_at: new Date("2025-09-09T10:45:00"),
      updated_at: new Date("2025-09-09T10:45:00"),
      files: [],
      visitor_name: "박업무",
      visitor_phone: "010-7777-8888",
      visitor_organization: "법무법인 정의",
      visitor_position: "변호사",
      visit_datetime: new Date("2025-09-23T10:00:00"),
      visit_purpose: "법무 자문",
      vehicle_number: "34나5678",
      vehicle_model: "소나타",
    } as VisitR3Application,
    {
      id: "30",
      receipt: "VR-20250913-0030",
      type: Type.VISIT_R3,
      contact_name: "이회계",
      access_area: AccessArea.MAIN_3F,
      status: Status.UNDER_REVIEW,
      created_at: new Date("2025-09-13T14:30:00"),
      updated_at: new Date("2025-09-14T11:20:00"),
      files: [],
      visitor_name: "정감사",
      visitor_phone: "010-9999-0000",
      visitor_organization: "회계법인 정확",
      visitor_position: "공인회계사",
      visit_datetime: new Date("2025-09-28T09:00:00"),
      visit_purpose: "회계 감사",
      vehicle_number: "56다7890",
      vehicle_model: "그랜저",
    } as VisitR3Application,
    {
      id: "31",
      receipt: "VR-20250916-0031",
      type: Type.VISIT_R3,
      contact_name: "최기술",
      access_area: AccessArea.SECURITY,
      status: Status.REJECTED,
      created_at: new Date("2025-09-16T11:15:00"),
      updated_at: new Date("2025-09-17T09:45:00"),
      rejection_reason: "방문 목적이 불분명합니다. 구체적인 업무 내용을 명시하여 재신청해주세요.",
      files: [],
      visitor_name: "한개발",
      visitor_phone: "010-1111-2222",
      visitor_organization: "IT솔루션",
      visitor_position: "개발자",
      visit_datetime: new Date("2025-09-29T13:00:00"),
      visit_purpose: "시스템 점검",
      vehicle_number: "78라9012",
      vehicle_model: "투싼",
    } as VisitR3Application,
    {
      id: "32",
      receipt: "VR-20250919-0032",
      type: Type.VISIT_R3,
      contact_name: "장교육",
      access_area: AccessArea.MAIN_1F,
      status: Status.APPROVED,
      created_at: new Date("2025-09-19T16:50:00"),
      updated_at: new Date("2025-09-19T18:25:00"),
      files: [],
      visitor_name: "오강의",
      visitor_phone: "010-3333-4444",
      visitor_organization: "교육기관",
      visitor_position: "강사",
      visit_datetime: new Date("2025-09-26T15:00:00"),
      visit_purpose: "직원 교육",
      vehicle_number: "90마1234",
      vehicle_model: "카니발",
    } as VisitR3Application,
  ]

  applications.push(...mockApplications)
  nextId = Math.max(...applications.map((app) => Number.parseInt(app.id))) + 1
  isInitialized = true // 초기화 완료 표시

  console.log("[v0] Mock data initialized, total applications:", applications.length, "nextId:", nextId)
}

// Initialize mock data
initializeMockData()

export class MemoryDB {
  static async createApplication(
    data: Omit<Application, "id" | "receipt" | "created_at" | "updated_at" | "status">,
  ): Promise<Application> {
    const receipt = generateReceiptNumber(data.type)
    const now = new Date()

    const application: Application = {
      ...data,
      id: nextId.toString(),
      receipt,
      status: Status.PENDING,
      created_at: now,
      updated_at: now,
    } as Application

    applications.push(application)
    nextId++

    console.log("[v0] Application created, total count:", applications.length, "new ID:", application.id)

    return application
  }

  static async getApplicationByReceipt(receipt: string): Promise<Application | null> {
    return applications.find((app) => app.receipt === receipt) || null
  }

  static async getApplicationById(id: string): Promise<Application | null> {
    return applications.find((app) => app.id === id) || null
  }

  static async getAllApplications(): Promise<Application[]> {
    console.log("[v0] Getting all applications, count:", applications.length)
    return [...applications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    rejectionReason?: string,
  ): Promise<Application | null> {
    const index = applications.findIndex((app) => app.id === id)
    if (index === -1) return null

    applications[index] = {
      ...applications[index],
      status,
      rejection_reason: rejectionReason,
      updated_at: new Date(),
    }

    return applications[index]
  }

  static async getApplicationStats() {
    const now = new Date()
    const currentYear = now.getFullYear()

    // Basic stats
    const totalApplications = applications.length
    const statusStats = {
      PENDING: applications.filter((app) => app.status === Status.PENDING).length,
      UNDER_REVIEW: applications.filter((app) => app.status === Status.UNDER_REVIEW).length,
      APPROVED: applications.filter((app) => app.status === Status.APPROVED).length,
      REJECTED: applications.filter((app) => app.status === Status.REJECTED).length,
    }

    // Type stats
    const typeStats = {
      GROUP_VISIT: applications.filter((app) => app.type === Type.GROUP_VISIT).length,
      PORT_ACCESS: applications.filter((app) => app.type === Type.PORT_ACCESS).length,
      GOODS_INOUT: applications.filter((app) => app.type === Type.GOODS_INOUT).length,
      VISIT_R3: applications.filter((app) => app.type === Type.VISIT_R3).length,
    }

    // Monthly stats for the last 6 months
    const monthlyStats = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthName = `${date.getFullYear()}년 ${date.getMonth() + 1}월`

      const monthApplications = applications.filter((app) => {
        const appDate = new Date(app.created_at)
        return appDate.getFullYear() === date.getFullYear() && appDate.getMonth() === date.getMonth()
      })

      const byType = {
        GROUP_VISIT: monthApplications.filter((app) => app.type === Type.GROUP_VISIT).length,
        PORT_ACCESS: monthApplications.filter((app) => app.type === Type.PORT_ACCESS).length,
        GOODS_INOUT: monthApplications.filter((app) => app.type === Type.GOODS_INOUT).length,
        VISIT_R3: monthApplications.filter((app) => app.type === Type.VISIT_R3).length,
      }

      const byStatus = {
        PENDING: monthApplications.filter((app) => app.status === Status.PENDING).length,
        UNDER_REVIEW: monthApplications.filter((app) => app.status === Status.UNDER_REVIEW).length,
        APPROVED: monthApplications.filter((app) => app.status === Status.APPROVED).length,
        REJECTED: monthApplications.filter((app) => app.status === Status.REJECTED).length,
      }

      monthlyStats.push({
        month: monthName,
        count: monthApplications.length,
        byType,
        byStatus,
      })
    }

    // Organization stats
    const organizationMap = new Map<string, number>()

    applications.forEach((app) => {
      let organization = ""

      if (app.type === Type.GROUP_VISIT) {
        const groupApp = app as GroupVisitApplication
        organization = groupApp.organization
      } else if (app.type === Type.PORT_ACCESS) {
        const portApp = app as PortAccessApplication
        organization = portApp.personnel[0]?.organization || "미상"
      } else if (app.type === Type.VISIT_R3) {
        const visitApp = app as VisitR3Application
        organization = visitApp.visitor_organization
      } else {
        organization = "기타"
      }

      organizationMap.set(organization, (organizationMap.get(organization) || 0) + 1)
    })

    const organizationStats = Array.from(organizationMap.entries())
      .map(([organization, count]) => ({ organization, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalApplications,
      monthlyStats,
      typeStats,
      statusStats,
      organizationStats,
    }
  }
}
