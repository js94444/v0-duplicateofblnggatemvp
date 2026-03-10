"use client"

import { SelectItem } from "@/components/ui/select"
import { SelectContent } from "@/components/ui/select"
import { SelectValue } from "@/components/ui/select"
import { SelectTrigger } from "@/components/ui/select"
import { Select } from "@/components/ui/select"
import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FormInput } from "@/components/common/form-input"
import { FormInputSimple } from "@/components/common/form-input-simple"
import { FormSelect } from "@/components/common/form-select"
import { FileUpload } from "@/components/common/file-upload"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { ApplicationCache } from "@/lib/utils/cache"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ContactSelector } from "@/components/contact-selector"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"
import { useLang } from "@/lib/language-context"

interface ElectronicDevice {
  item_name: string
  model_name: string
  serial_number: string
  reason: string
}

interface FormData {
  visitor_name: string
  visitor_phone: string
  visitor_birth_date: string
  visitor_organization: string
  visitor_position: string
  contact_name: string
  contact_mobile: string
  visit_start_date: string
  visit_end_date: string
  access_area: string
  vehicle_number: string
  vehicle_model: string
  spark_arrestor: string
  visit_purpose: string
  detailed_purpose: string
  has_no_vehicle: boolean
  visitor_address?: string
  visitor_email?: string
}

interface FormErrors {
  [key: string]: string
}

interface DeviceErrors {
  [key: number]: {
    item_name?: string
    model_name?: string
    serial_number?: string
    reason?: string
  }
}

interface UploadedFileData {
  filename: string
  fileKey: string
  fileType: string
  size?: number
  url?: string
}

interface Companion {
  name: string
  phone: string
  birth_date: string
  organization: string
  position: string
  electronic_devices: ElectronicDevice[]
  port_cert_files: UploadedFileData[]
  privacy_consent: boolean
  security_pledge: boolean
  safety_pledge: boolean
}

interface CompanionErrors {
  [key: number]: {
    name?: string
    phone?: string
    birth_date?: string
    organization?: string
    position?: string
    privacy_consent?: string
    security_pledge?: string
    safety_pledge?: string
  }
}

export default function VisitFormPage() {
  const { t } = useLang()
  const [scrolled, setScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)

  // Phone number formatting helper
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  // Remove hyphens from phone number for DB storage
  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9]/g, '')

  const [formData, setFormData] = useState<FormData>({
    visitor_name: "",
    visitor_phone: "",
    visitor_birth_date: "",
    visitor_organization: "",
    visitor_position: "",
    visitor_address: "",
    visitor_email: "",
    contact_name: "",
    contact_mobile: "",
    visit_start_date: "",
    visit_end_date: "",
    access_area: "",
    vehicle_number: "",
    vehicle_model: "",
    spark_arrestor: "",
    visit_purpose: "",
    detailed_purpose: "",
    has_no_vehicle: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [electronicDevices, setElectronicDevices] = useState<ElectronicDevice[]>([])
  const [deviceErrors, setDeviceErrors] = useState<DeviceErrors>({})
  const [companions, setCompanions] = useState<Companion[]>([])
  const [companionErrors, setCompanionErrors] = useState<CompanionErrors>({})
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([])
  const [portCertFiles, setPortCertFiles] = useState<UploadedFileData[]>([])
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const PremiumLogo = () => (
    <Link href="/" className="flex items-center group cursor-pointer">
      <Image
        src="/images/boryeong-lng-ci.png"
        alt="보령LNG터미널"
        width={200}
        height={40}
        className="h-8 md:h-10 w-auto group-hover:opacity-90 transition-opacity"
        priority
      />
    </Link>
  )

  // 수정 모드 체크 및 데이터 로드
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const editId = params.get("edit")

    if (editId) {
      setIsEditMode(true)
      setApplicationId(editId)

      // 기존 신청 데이터 로드
      const loadApplication = async () => {
        try {
          const response = await fetch(`/api/apply/visit/${editId}`)
          if (response.ok) {
            const data = await response.json()

            // 폼 데이터 채우기
            setFormData({
              visitor_name: data.visitor_name || "",
              visitor_phone: data.visitor_phone || "",
              visitor_birth_date: data.visitor_birth_date || "",
              visitor_organization: data.visitor_organization || "",
              visitor_position: data.visitor_position || "",
              visitor_address: data.visitor_address || "",
              visitor_email: data.visitor_email || "",
              contact_name: data.contact_name || "",
              visit_start_date: data.visit_start_date ? data.visit_start_date.split('T')[0] : "",
              visit_end_date: data.visit_end_date ? data.visit_end_date.split('T')[0] : "",
              access_area: data.access_area || "",
              vehicle_number: data.vehicle_number || "",
              vehicle_model: data.vehicle_model || "",
              spark_arrestor: data.spark_arrestor || "",
              visit_purpose: data.visit_purpose || "",
              has_no_vehicle: !data.vehicle_number,
            })

            // 동반자 데이터가 있으면 로드
            if (data.companions && data.companions.length > 0) {
              setCompanions(data.companions)
            }

            // 전자기기 데이터가 있으면 로드
            if (data.electronic_devices && data.electronic_devices.length > 0) {
              setElectronicDevices(data.electronic_devices)
            }
          } else {
            toast({
              title: t("데이터 로드 실패", "Failed to load data"),
              description: t("신청 정보를 불러올 수 없습니다.", "Unable to load application information."),
              variant: "destructive",
            })
            router.push("/apply/visit")
          }
        } catch (error) {
          toast({
            title: t("오류 발생", "Error"),
            description: t("데이터 로드 중 오류가 발생했습니다.", "An error occurred while loading data."),
            variant: "destructive",
          })
        }
      }

      loadApplication()
    }
  }, [])

  const accessAreaOptions = [
    { value: "정문", label: t("정문", "Main Gate") },
    { value: "본관동(1층)", label: t("본관동(1층)", "Main Building (1F)") },
    { value: "본관동(3층)", label: t("본관동(3층)", "Main Building (3F)") },
    { value: "공정지역", label: t("공정지역", "Process Area") },
    { value: "제1부두", label: t("제1부두", "Berth No.1") },
    { value: "제2부두", label: t("제2부두", "Berth No.2") },
    { value: "정비동", label: t("정비동", "Maintenance Building") },
  ]

  const vehicleTypeOptions = [
    { value: "휘발유", label: t("휘발유", "Gasoline") },
    { value: "경유", label: t("경유", "Diesel") },
    { value: "LPG", label: "LPG" },
    { value: "전기", label: t("전기", "Electric") },
  ]

  const visitPurposeOptions = [
    { value: "업무 협의 및 회의 등", label: t("업무 협의 및 회의 등", "Business meeting / Discussion") },
    { value: "공사/작업, 유지보수, A/S 등", label: t("공사/작업, 유지보수, A/S 등", "Construction / Maintenance / A/S") },
    { value: "물품반입/반출, 납품 등", label: t("물품반입/반출, 납품 등", "Delivery / Import / Export") },
    { value: "점검 및 감사, 훈련 등", label: t("점검 및 감사, 훈련 등", "Inspection / Audit / Training") },
    { value: "부두 작업 및 부두 출입 등", label: t("부두 작업 및 부두 출입 등", "Berth Work / Berth Access") },
    { value: "견학", label: t("견학", "Site Tour") },
    { value: "기타 업무", label: t("기타 업무", "Other") },
  ]

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.visitor_name.trim()) newErrors.visitor_name = t("이름을 입력해주세요", "Please enter your name")
    if (!formData.visitor_phone.trim()) newErrors.visitor_phone = t("휴대전화번호를 입력해주세요", "Please enter your mobile number")
    if (!formData.visitor_birth_date) newErrors.visitor_birth_date = t("생년월일을 입력해주세요", "Please enter your date of birth")
    if (!formData.visitor_organization.trim()) newErrors.visitor_organization = t("소속을 입력해주세요", "Please enter your organization")
    if (!formData.visitor_position.trim()) newErrors.visitor_position = t("직책을 입력해주세요", "Please enter your position")
    if (!formData.visitor_address.trim()) newErrors.visitor_address = t("회사 주소를 입력해주세요", "Please enter your company address")
    if (!formData.contact_name.trim()) newErrors.contact_name = t("담당자를 입력해주세요", "Please select a contact person")
    if (!formData.visit_start_date) newErrors.visit_start_date = t("방문시작일을 선택해주세요", "Please select a visit start date")
    if (!formData.visit_end_date) newErrors.visit_end_date = t("방문종료일을 선택해주세요", "Please select a visit end date")
    if (!formData.access_area) newErrors.access_area = t("출입지역을 선택해주세요", "Please select an access area")

    // 차량없음 체크되지 않은 경우에만 차량 정보 필수
    if (!formData.has_no_vehicle) {
      if (!formData.vehicle_number.trim()) newErrors.vehicle_number = t("차량번호를 입력해주세요", "Please enter your vehicle number")
      if (!formData.vehicle_model.trim()) newErrors.vehicle_model = t("차량의 유종을 입력해주세요", "Please select vehicle fuel type")
    }

    if (!formData.visit_purpose.trim()) newErrors.visit_purpose = t("방문 목적을 입력해주세요", "Please select a visit purpose")

    // 방문기간 14일 이내 체크
    if (formData.visit_start_date && formData.visit_end_date) {
      const startDate = new Date(formData.visit_start_date)
      const endDate = new Date(formData.visit_end_date)
      const diffTime = endDate.getTime() - startDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays > 14) {
        newErrors.visit_end_date = t("방문신청 최대 가능기간은 14일입니다. 14일 이내로 다시 신청일자를 수정해주세요.", "The maximum visit period is 14 days. Please adjust your dates.")
      }
      if (diffDays < 0) {
        newErrors.visit_end_date = t("방문종료일은 방문시작일보다 이후여야 합니다.", "End date must be after start date.")
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const isFormValid = validateForm()
    const areDevicesValid = validateDevices()

    // 동행인 동의 항목 검증
    if (companions.length > 0) {
      const newCompanionErrors: CompanionErrors = {}
      let hasCompanionError = false

      companions.forEach((companion, index) => {
        const errors: CompanionErrors[number] = {}
        if (!companion.privacy_consent) {
          errors.privacy_consent = t("개인정보 수집·이용 동의가 필요합니다", "Privacy consent is required")
          hasCompanionError = true
        }
        if (!companion.security_pledge) {
          errors.security_pledge = t("보안 서약이 필요합니다", "Security pledge is required")
          hasCompanionError = true
        }
        if (!companion.safety_pledge) {
          errors.safety_pledge = t("안전준수 서약이 필요합니다", "Safety pledge is required")
          hasCompanionError = true
        }
        if (Object.keys(errors).length > 0) {
          newCompanionErrors[index] = errors
        }
      })

      setCompanionErrors(newCompanionErrors)

      if (hasCompanionError) {
        toast({
          title: t("입력 오류", "Input Error"),
          description: t("동행인의 모든 동의 항목을 체크해주세요", "Please check all consent items for companions"),
          variant: "destructive",
        })
        return
      }
    }

    if (!isFormValid || !areDevicesValid) {
      toast({
        title: t("입력 오류", "Input Error"),
        description: t("필수 항목을 모두 입력해주세요", "Please fill in all required fields"),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const submitData = {
        ...formData,
        visitor_phone: cleanPhoneNumber(formData.visitor_phone),
        contact_mobile: formData.contact_mobile ? cleanPhoneNumber(formData.contact_mobile) : '',
        visit_date: formData.visit_start_date,
        visit_datetime: `${formData.visit_start_date}T09:00:00`,
        visit_start_time: "09:00",
        visit_end_time: "18:00",
        electronic_devices: electronicDevices,
        companions: companions.map(c => ({
          ...c,
          phone: cleanPhoneNumber(c.phone),
          electronic_devices: c.electronic_devices || [],
          port_cert_files: c.port_cert_files || [],
        })),
        uploaded_files: uploadedFiles,
        portCertFiles: portCertFiles,
      }

      console.log("[v0] Submitting visit application:", {
        isEditMode,
        applicationId,
        hasDevices: electronicDevices.length,
        hasCompanions: companions.length,
        hasFiles: uploadedFiles.length,
        companionDevices: companions.map((c, i) => ({
          index: i,
          name: c.name,
          deviceCount: c.electronic_devices?.length || 0
        }))
      })

      let response
      if (isEditMode && applicationId) {
        // 수정 모드: PUT 요청
        response = await fetch(`/api/apply/visit/${applicationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        })
      } else {
        // 신규 신청: POST 요청
        response = await fetch("/api/apply/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.message || "신청 처리 중 오류가 발생했습니다")
      }

      const result = await response.json()
      const receipt = result.data?.receipt || result.receipt

      ApplicationCache.saveApplication(receipt, "VISIT_R3", {
        ...formData,
        visit_datetime: submitData.visit_datetime,
      })

      if (isEditMode) {
        toast({
          title: t("변경이 완료되었습니다", "Changes Saved"),
          description: t("신청 내용이 수정되어 재심사 대기중입니다.", "Your application has been updated and is pending review."),
        })
      } else {
        toast({
          title: t("신청이 완료되었습니다", "Application Submitted"),
          description: t("접수번호", "Receipt No") + `: ${receipt}`,
        })
      }

      router.push(`/status/${receipt}`)
    } catch (error) {
      toast({
        title: t("오류가 발생했습니다", "An error occurred"),
        description: error instanceof Error ? error.message : t("다시 시도해주세요", "Please try again"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const addElectronicDevice = () => {
    setElectronicDevices((prev) => [
      ...prev,
      { item_name: "", model_name: "", serial_number: "", reason: "" },
    ])
  }

  const addCompanion = () => {
    setCompanions((prev) => [
      ...prev,
      {
        name: "",
        phone: "",
        birth_date: "",
        organization: "",
        position: "",
        electronic_devices: [],
        port_cert_files: [],
        privacy_consent: false,
        security_pledge: false,
        safety_pledge: false,
      },
    ])
  }

  const updateCompanionPortCert = (index: number, files: UploadedFileData[]) => {
    setCompanions((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], port_cert_files: files }
      return updated
    })
  }

  const updateCompanion = (index: number, field: keyof Companion, value: string) => {
    setCompanions((prev) => {
      const updated = [...prev]
      if (field === "electronic_devices") return prev
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    if (companionErrors[index]?.[field as keyof CompanionErrors[number]]) {
      setCompanionErrors((prev) => {
        const updated = { ...prev }
        if (updated[index]) {
          delete updated[index][field as keyof CompanionErrors[number]]
        }
        return updated
      })
    }
  }

  const updateCompanionConsent = (index: number, field: "privacy_consent" | "security_pledge" | "safety_pledge", value: boolean) => {
    setCompanions((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    if (companionErrors[index]?.[field]) {
      setCompanionErrors((prev) => {
        const updated = { ...prev }
        if (updated[index]) {
          delete updated[index][field]
        }
        return updated
      })
    }
  }

  const removeCompanion = (index: number) => {
    setCompanions((prev) => prev.filter((_, i) => i !== index))
    setCompanionErrors((prev) => {
      const updated = { ...prev }
      delete updated[index]
      return updated
    })
  }

  const addCompanionDevice = (companionIndex: number) => {
    setCompanions((prev) => {
      const updated = [...prev]
      updated[companionIndex].electronic_devices.push({
        item_name: "",
        model_name: "",
        serial_number: "",
        reason: "",
      })
      return updated
    })
  }

  const updateCompanionDevice = (
    companionIndex: number,
    deviceIndex: number,
    field: keyof ElectronicDevice,
    value: string
  ) => {
    setCompanions((prev) => {
      const updated = [...prev]
      updated[companionIndex].electronic_devices[deviceIndex] = {
        ...updated[companionIndex].electronic_devices[deviceIndex],
        [field]: value,
      }
      return updated
    })
  }

  const removeCompanionDevice = (companionIndex: number, deviceIndex: number) => {
    setCompanions((prev) => {
      const updated = [...prev]
      updated[companionIndex].electronic_devices = updated[companionIndex].electronic_devices.filter(
        (_, i) => i !== deviceIndex
      )
      return updated
    })
  }

  const removeElectronicDevice = (index: number) => {
    setElectronicDevices((prev) => prev.filter((_, i) => i !== index))
    setDeviceErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[index]
      return newErrors
    })
  }

  const updateDevice = (index: number, field: keyof ElectronicDevice, value: string) => {
    setElectronicDevices((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    if (deviceErrors[index]?.[field]) {
      setDeviceErrors((prev) => ({
        ...prev,
        [index]: { ...prev[index], [field]: undefined },
      }))
    }
  }

  const validateDevices = (): boolean => {
    const newDeviceErrors: DeviceErrors = {}
    let hasError = false

    electronicDevices.forEach((device, index) => {
      const errors: DeviceErrors[number] = {}
      if (!device.item_name.trim()) errors.item_name = t("품명을 입력해주세요", "Please enter item name")
      if (!device.model_name.trim()) errors.model_name = t("모델명을 입력해주세요", "Please enter model name")
      if (!device.serial_number.trim()) errors.serial_number = t("시리얼넘버를 입력해주세요", "Please enter serial number")
      if (!device.reason.trim()) errors.reason = t("사유를 입력해주세요", "Please enter reason")

      if (Object.keys(errors).length > 0) {
        newDeviceErrors[index] = errors
        hasError = true
      }
    })

    setDeviceErrors(newDeviceErrors)
    return !hasError
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">

      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/lng-terminal-bg.jpg')",
            filter: 'brightness(0.3) blur(5px)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      <PublicHeader />

      <main className="relative z-10 flex-1 overflow-y-auto px-6 md:px-12 pt-32 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/apply/visit" className="flex items-center gap-2 text-white/50 hover:text-amber-500 transition-colors mb-6 group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold tracking-widest uppercase">Go Back</span>
          </Link>

          <h2 className="text-4xl md:text-5xl font-black mb-2 text-white">{t("방문 신청서 작성", "Visit Application Form")}</h2>
          <p className="text-white/40 text-sm mb-12">{t("방문 정보를 입력해주세요", "Please fill in your visit information")}</p>

          {/* 개선된 필수 안내 섹션 (불필요한 라벨 제거 및 레이아웃 최적화) */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="relative overflow-hidden bg-blue-500/10 backdrop-blur-md border border-blue-400/30 rounded-[32px] p-8 md:p-10 group hover:border-blue-400/50 transition-all duration-500">
              {/* 배경 장식 효과 */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full group-hover:bg-blue-500/20 transition-all" />

              <div className="relative z-10 flex flex-col items-center text-center space-y-5">
                <div className="space-y-4">
                  <p className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight">
                    {t("항만 출입자의 경우 '항만안전교육 필수 이수'", "Port visitors must complete the 'Port Safety Training'")}
                  </p>

                  <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 text-lg md:text-xl">
                    <span className="font-bold text-blue-300">
                      {t("항만안전교육 포털", "Port Safety Training Portal")}
                    </span>
                    <span className="hidden md:inline text-white/30">|</span>
                    <a
                      href="https://kptiedu.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-blue-400 underline underline-offset-8 decoration-2 decoration-blue-500/50 transition-all font-black"
                    >
                      https://kptiedu.kr
                    </a>
                  </div>
                </div>

                <div className="pt-2 w-full max-w-2xl border-t border-white/5 mt-2">
                  <p className="text-sm md:text-base text-white/60 font-medium pt-4">
                    {t("※ 업무별 교육과정 등 자세한 사항은 '항만안전연수원' 문의 바랍니다.", "※ For details on training by job type, contact the 'Port Safety Training Center'.")}
                    <span className="block md:inline md:ml-2 text-blue-400 font-bold">
                      (T. 1661-9356)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-8">
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] hover:border-white/20 transition-all">
              <CardHeader className="p-8 pb-6">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-12 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-black text-white mb-1">{t("기본 정보", "Basic Information")}</CardTitle>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">BASIC INFORMATION</p>
                  </div>
                </div>
                <CardDescription className="text-white/40 mt-4">{t("방문자의 기본 정보를 입력해주세요", "Please enter visitor's basic information")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormInput
                    label={t("이름", "Name")}
                    required
                    value={formData.visitor_name}
                    onChange={(e) => updateField("visitor_name", e.target.value)}
                    error={errors.visitor_name}
                  />
                  <FormInput
                    label={t("휴대전화번호", "Mobile Number")}
                    required
                    type="tel"
                    value={formData.visitor_phone}
                    onChange={(e) => updateField("visitor_phone", formatPhoneNumber(e.target.value))}
                    error={errors.visitor_phone}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormInput
                    label={t("생년월일", "Date of Birth")}
                    required
                    type="date"
                    value={formData.visitor_birth_date}
                    onChange={(e) => updateField("visitor_birth_date", e.target.value)}
                    error={errors.visitor_birth_date}
                  />
                  <FormInput
                    label={t("소속 (회사명 또는 기관명)", "Organization (Company or Institution)")}
                    required
                    value={formData.visitor_organization}
                    onChange={(e) => updateField("visitor_organization", e.target.value)}
                    error={errors.visitor_organization}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormInput
                    label={t("직책", "Position")}
                    required
                    value={formData.visitor_position}
                    onChange={(e) => updateField("visitor_position", e.target.value)}
                    error={errors.visitor_position}
                  />
                  <FormInput
                    label={t("이메일 (선택사항)", "Email (Optional)")}
                    type="email"
                    value={formData.visitor_email}
                    onChange={(e) => updateField("visitor_email", e.target.value)}
                    error={errors.visitor_email}
                  />
                </div>
                <FormInput
                  label={t("회사주소 (회사 또는 기관의 주소)", "Company Address")}
                  required
                  value={formData.visitor_address}
                  onChange={(e) => updateField("visitor_address", e.target.value)}
                  error={errors.visitor_address}
                />

                {/* 항만이수증 첨부 (신청자 본인) */}
                <div className="pt-2">
                  <div className="mb-3">
                    <p className="text-sm font-bold text-white">
                      {t("항만이수증 첨부", "Port Safety Certificate")}
                      <span className="ml-2 text-xs font-normal text-white/40">{t("(항만 출입자 해당 시 필수)", "(Required for port access)")}</span>
                    </p>
                    <p className="text-xs text-white/40 mt-1">{t("항만안전교육 이수 후 발급된 이수증을 업로드해주세요.", "Please upload the certificate issued after completing port safety training.")}</p>
                  </div>
                  <FileUpload
                    label={t("이수증 업로드", "Upload Certificate")}
                    description={t("이미지(PNG, JPG) 업로드 권장 (PDF도 가능)", "Image (PNG, JPG) recommended. PDF also accepted.")}
                    maxFiles={3}
                    onFilesUploaded={(files) => {
                      const fileData = files.map((file) => ({
                        filename: file.filename,
                        fileKey: file.url,
                        fileType: file.mimeType,
                        size: file.size,
                        url: file.url,
                      }))
                      setPortCertFiles(fileData)
                    }}
                  />
                </div>

                {/* 차량 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <FormInput
                    label={t("차량번호", "Vehicle Number")}
                    required={!formData.has_no_vehicle}
                    value={formData.vehicle_number}
                    onChange={(e) => updateField("vehicle_number", e.target.value)}
                    error={errors.vehicle_number}
                    disabled={formData.has_no_vehicle}
                  />
                  <FormSelect
                    placeholder={t("차량유종선택", "Select Fuel Type")}
                    required={!formData.has_no_vehicle}
                    options={vehicleTypeOptions}
                    value={formData.vehicle_model}
                    onValueChange={(value) => updateField("vehicle_model", value)}
                    error={errors.vehicle_model}
                    className={formData.has_no_vehicle ? "opacity-50 pointer-events-none h-14 w-full" : "h-14 w-full"}
                  />
                  <FormSelect
                    placeholder={t("불꽃방지망", "Spark Arrestor")}
                    required={!formData.has_no_vehicle}
                    options={[
                      { value: "Y", label: t("Y", "Y") },
                      { value: "N", label: t("N", "N") },
                    ]}
                    value={formData.spark_arrestor}
                    onValueChange={(value) => updateField("spark_arrestor", value)}
                    error={errors.spark_arrestor}
                    className={formData.has_no_vehicle ? "opacity-50 pointer-events-none h-14 w-full" : "h-14 w-full"}
                  />
                  <div className="flex items-center space-x-3 px-4 bg-black/40 rounded-xl border border-white/10 h-14 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:bg-black/50">
                    <Checkbox
                      id="has_no_vehicle"
                      checked={formData.has_no_vehicle}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => ({
                          ...prev,
                          has_no_vehicle: checked as boolean,
                          vehicle_number: checked ? "" : prev.vehicle_number,
                          vehicle_model: checked ? "" : prev.vehicle_model,
                          spark_arrestor: checked ? "" : prev.spark_arrestor,
                        }))
                        if (checked) {
                          setErrors((prev) => {
                            const newErrors = { ...prev }
                            delete newErrors.vehicle_number
                            delete newErrors.vehicle_model
                            delete newErrors.spark_arrestor
                            return newErrors
                          })
                        }
                      }}
                      className="w-5 h-5 border-2 border-white/20 bg-black/40 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <label
                      htmlFor="has_no_vehicle"
                      className="text-sm font-medium leading-none cursor-pointer text-white/80"
                    >
                      {t("차량없음", "No Vehicle")}
                    </label>
                  </div>
                </div>

                {/* 전자기기 추가 버튼 */}
                <div className="flex justify-center pt-4">
                  <Button
                    type="button"
                    onClick={addElectronicDevice}
                    className="group flex items-center gap-3 bg-black/40 border border-white/10 hover:border-amber-500/50 hover:bg-black/60 text-white backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] px-6 py-5 rounded-xl"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg group-hover:bg-amber-500 group-hover:text-black transition-all">
                      <Plus size={18} strokeWidth={3} />
                    </div>
                    <span className="text-base font-bold group-hover:text-amber-500 transition-colors">{t("전자기기 추가", "Add Electronic Device")}</span>
                  </Button>
                </div>

                {/* 전자기기 입력 필드 */}
                {electronicDevices.map((device, index) => (
                  <div key={index} className="space-y-4 p-6 border border-amber-500/20 rounded-2xl bg-black/30 backdrop-blur-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-amber-500 rounded-full" />
                        <h4 className="font-bold text-sm text-white">{t("전자기기", "Device")} {index + 1}</h4>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => removeElectronicDevice(index)}
                        className="bg-transparent border-none text-white/60 hover:text-red-500 hover:bg-red-500/10 transition-all p-2"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <FormInput
                        label={t("품명 (노트북, 태블릿 등)", "Item Name (Laptop, Tablet, etc.)")}
                        required
                        value={device.item_name}
                        onChange={(e) => updateDevice(index, "item_name", e.target.value)}
                        error={deviceErrors[index]?.item_name}

                      />
                      <FormInput
                        label={t("모델명 (예:MacBook Pro)", "Model Name (e.g. MacBook Pro)")}
                        required
                        value={device.model_name}
                        onChange={(e) => updateDevice(index, "model_name", e.target.value)}
                        error={deviceErrors[index]?.model_name}

                      />
                      <FormInput
                        label={t("시리얼넘버", "Serial Number")}
                        required
                        value={device.serial_number}
                        onChange={(e) => updateDevice(index, "serial_number", e.target.value)}
                        error={deviceErrors[index]?.serial_number}

                      />
                    </div>
                    <FormInput
                      label={t("사유 (반입 사유 입력)", "Reason for bringing in")}
                      required
                      value={device.reason}
                      onChange={(e) => updateDevice(index, "reason", e.target.value)}
                      error={deviceErrors[index]?.reason}

                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Visit Information */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] hover:border-white/20 transition-all">
              <CardHeader className="p-8 pb-6">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-12 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-black text-white mb-1">{t("방문 정보", "Visit Information")}</CardTitle>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">VISIT INFORMATION</p>
                  </div>
                </div>
                <CardDescription className="text-white/40 mt-4">{t("방문 일정 및 목적을 입력해주세요", "Please enter your visit schedule and purpose")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">
                    <span className="text-red-400 mr-0.5">*</span>
                    {t("담당자", "Contact Person")}
                  </label>
                  <ContactSelector
                    value={formData.contact_name}
                    onChange={(value) => {
                      setFormData((prev) => ({ ...prev, contact_name: value }))
                      if (errors.contact_name) {
                        setErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.contact_name
                          return newErrors
                        })
                      }
                    }}
                    onMobileChange={(mobile) => {
                      setFormData((prev) => ({ ...prev, contact_mobile: mobile }))
                    }}
                    error={errors.contact_name}
                  />
                  {errors.contact_name && <p className="text-sm text-red-400">{errors.contact_name}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormSelect
                    label={t("방문 목적", "Visit Purpose")}
                    placeholder={t("방문 목적을 선택하세요", "Select visit purpose")}
                    required
                    options={visitPurposeOptions}
                    value={formData.visit_purpose}
                    onValueChange={(value) => updateField("visit_purpose", value)}
                    error={errors.visit_purpose}
                    className="h-14 w-full"
                  />
                  <FormSelect
                    label={t("출입지역", "Access Area")}
                    placeholder={t("출입지역을 선택하세요", "Select access area")}
                    required
                    options={accessAreaOptions}
                    value={formData.access_area}
                    onValueChange={(value) => updateField("access_area", value)}
                    error={errors.access_area}
                    className="h-14 w-full"
                  />
                </div>

                {/* 상세 방문 사유 */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-white/80">
                    {t("상세 방문 사유", "Detailed Visit Reason")} <span className="text-amber-400"> {t("부두 작업 및 현장 공사/작업의 내용", "Details for berth / construction work")} </span>
                  </label>
                  <textarea
                    value={formData.detailed_purpose}
                    onChange={(e) => updateField("detailed_purpose", e.target.value)}
                    placeholder={t("예: 탱크 정비 작업", "e.g. Tank maintenance work")}
                    rows={2}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  />
                  {errors.detailed_purpose && (
                    <p className="text-sm text-red-400">{errors.detailed_purpose}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormInputSimple
                      label={t("방문시작일", "Visit Start Date")}
                      required
                      type="date"
                      value={formData.visit_start_date}
                      onChange={(e) => updateField("visit_start_date", e.target.value)}
                      error={errors.visit_start_date}

                    />
                    <FormInputSimple
                      label={t("방문종료일", "Visit End Date")}
                      required
                      type="date"
                      value={formData.visit_end_date}
                      onChange={(e) => updateField("visit_end_date", e.target.value)}
                      error={errors.visit_end_date}

                    />
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                    <p className="text-base text-white font-bold">
                      {t("방문신청 최대 가능기간은", "Maximum visit period is")} <span className="text-amber-500">14{t("일", " days")}</span> {t("입니다.", "")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 동행인 추가등록 Card */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] hover:border-white/20 transition-all">
              <CardHeader className="p-8 pb-6">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-12 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-black text-white mb-1">{t("동행인 추가등록", "Add Companions")}</CardTitle>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">COMPANION REGISTRATION</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-500/10 rounded-xl border border-blue-400/30">
                  <p className="text-sm font-medium text-blue-400">
                    {t("동행인은 별도 차량을 이용할 수 없습니다. (차량이용자는 따로 방문신청하시기 바랍니다.)", "Companions cannot use a separate vehicle. (Vehicle users must submit a separate visit application.)")}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="flex justify-center">
                  <Button
                    type="button"
                    onClick={addCompanion}
                    className="group flex items-center gap-3 bg-black/40 border border-white/10 hover:border-amber-500/50 hover:bg-black/60 text-white backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] px-6 py-5 rounded-xl"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg group-hover:bg-amber-500 group-hover:text-black transition-all">
                      <Plus size={18} strokeWidth={3} />
                    </div>
                    <span className="text-base font-bold group-hover:text-amber-500 transition-colors">{t("동행인을 추가하시려면 클릭하세요", "Click to add a companion")}</span>
                  </Button>
                </div>

                {companions.map((companion, companionIndex) => (
                  <Card key={companionIndex} className="bg-black/30 backdrop-blur-sm border border-amber-500/20 rounded-2xl">
                    <CardHeader className="pb-4 p-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-6 bg-amber-500 rounded-full" />
                          <CardTitle className="text-lg font-bold text-white">{t("동행인", "Companion")} {companionIndex + 1}</CardTitle>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => removeCompanion(companionIndex)}
                          className="bg-transparent border-none text-white/60 hover:text-red-500 hover:bg-red-500/10 transition-all p-2"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormInput
                          label={t("이름", "Name")}
                          required
                          value={companion.name}
                          onChange={(e) => updateCompanion(companionIndex, "name", e.target.value)}
                          error={companionErrors[companionIndex]?.name}

                        />
                        <FormInput
                          label={t("휴대전화번호", "Mobile Number")}
                          required
                          type="tel"
                          value={companion.phone}
                          onChange={(e) => updateCompanion(companionIndex, "phone", formatPhoneNumber(e.target.value))}
                          error={companionErrors[companionIndex]?.phone}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FormInput
                          label={t("생년월일", "Date of Birth")}
                          required
                          type="date"
                          value={companion.birth_date}
                          onChange={(e) => updateCompanion(companionIndex, "birth_date", e.target.value)}
                          error={companionErrors[companionIndex]?.birth_date}

                        />
                        <FormInput
                          label={t("소속", "Organization")}
                          required
                          value={companion.organization}
                          onChange={(e) => updateCompanion(companionIndex, "organization", e.target.value)}
                          error={companionErrors[companionIndex]?.organization}

                        />
                        <FormInput
                          label={t("직책", "Position")}
                          required
                          value={companion.position}
                          onChange={(e) => updateCompanion(companionIndex, "position", e.target.value)}
                          error={companionErrors[companionIndex]?.position}

                        />
                      </div>

                      {/* 동행인 전자기기 추가 버튼 */}
                      <div className="flex justify-center pt-4">
                        <Button
                          type="button"
                          onClick={() => addCompanionDevice(companionIndex)}
                          className="group flex items-center gap-3 bg-black/40 border border-white/10 hover:border-amber-500/50 hover:bg-black/60 text-white backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] px-6 py-5 rounded-xl"
                        >
                          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg group-hover:bg-amber-500 group-hover:text-black transition-all">
                            <Plus size={18} strokeWidth={3} />
                          </div>
                          <span className="text-base font-bold group-hover:text-amber-500 transition-colors">{t("전자기기 추가", "Add Electronic Device")}</span>
                        </Button>
                      </div>

                      {/* 동행인 전자기기 입력 필드 */}
                      {companion.electronic_devices.map((device, deviceIndex) => (
                        <div key={deviceIndex} className="space-y-4 p-6 border border-amber-500/20 rounded-2xl bg-black/30 backdrop-blur-sm">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-6 bg-amber-500 rounded-full" />
                              <h4 className="font-bold text-sm text-white">{t("전자기기", "Device")} {deviceIndex + 1}</h4>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => removeCompanionDevice(companionIndex, deviceIndex)}
                              className="bg-transparent border-none text-white/60 hover:text-red-500 hover:bg-red-500/10 transition-all p-2"
                            >
                              <Trash2 size={18} />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FormInput
                              label={t("품명 (노트북, 태블릿 등)", "Item Name (Laptop, Tablet, etc.)")}
                              required
                              value={device.item_name}
                              onChange={(e) =>
                                updateCompanionDevice(companionIndex, deviceIndex, "item_name", e.target.value)
                              }

                            />
                            <FormInput
                              label={t("모델명 (예:MacBook Pro)", "Model Name (e.g. MacBook Pro)")}
                              required
                              value={device.model_name}
                              onChange={(e) =>
                                updateCompanionDevice(companionIndex, deviceIndex, "model_name", e.target.value)
                              }

                            />
                            <FormInput
                              label={t("시리얼넘버", "Serial Number")}
                              required
                              value={device.serial_number}
                              onChange={(e) =>
                                updateCompanionDevice(companionIndex, deviceIndex, "serial_number", e.target.value)
                              }

                            />
                          </div>
                          <FormInput
                            label={t("사유 (반입 사유 입력)", "Reason for bringing in")}
                            required
                            value={device.reason}
                            onChange={(e) =>
                              updateCompanionDevice(companionIndex, deviceIndex, "reason", e.target.value)
                            }

                          />
                        </div>
                      ))}

                      {/* 동행인 항만이수증 첨부 */}
                      <div className="pt-4">
                        <div className="mb-3">
                          <p className="text-sm font-bold text-white">
                            {t("항만이수증 첨부", "Port Safety Certificate")}
                            <span className="ml-2 text-xs font-normal text-white/40">{t("(항만 출입자 해당 시 필수)", "(Required for port access)")}</span>
                          </p>
                          <p className="text-xs text-white/40 mt-1">{t("이 동행인의 항만안전교육 이수증을 업로드해주세요.", "Please upload the port safety certificate for this companion.")}</p>
                        </div>
                        <FileUpload
                          label={t("이수증 업로드", "Upload Certificate")}
                          description={t("이미지(PNG, JPG) 업로드 권장 (PDF도 가능)", "Image (PNG, JPG) recommended. PDF also accepted.")}
                          maxFiles={3}
                          onFilesUploaded={(files) => {
                            const fileData = files.map((file) => ({
                              filename: file.filename,
                              fileKey: file.url,
                              fileType: file.mimeType,
                              size: file.size,
                              url: file.url,
                            }))
                            updateCompanionPortCert(companionIndex, fileData)
                          }}
                        />
                      </div>

                      {/* 동의 체크박스 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`privacy-${companionIndex}`}
                            checked={companion.privacy_consent}
                            onChange={(e) => updateCompanionConsent(companionIndex, "privacy_consent", e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-black/40 checked:bg-amber-500 checked:border-amber-500"
                          />
                          <label htmlFor={`privacy-${companionIndex}`} className="text-sm font-bold cursor-pointer text-white">
                            <span className="text-red-400 mr-1">*</span>
                            {t("개인정보 수집·이용 동의", "Privacy Consent")}
                          </label>
                        </div>
                        {companionErrors[companionIndex]?.privacy_consent && (
                          <p className="text-sm text-red-400 col-span-3">{companionErrors[companionIndex].privacy_consent}</p>
                        )}

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`security-${companionIndex}`}
                            checked={companion.security_pledge}
                            onChange={(e) => updateCompanionConsent(companionIndex, "security_pledge", e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-black/40 checked:bg-amber-500 checked:border-amber-500"
                          />
                          <label htmlFor={`security-${companionIndex}`} className="text-sm font-bold cursor-pointer text-white">
                            <span className="text-red-400 mr-1">*</span>
                            {t("보안 서약", "Security Pledge")}
                          </label>
                        </div>
                        {companionErrors[companionIndex]?.security_pledge && (
                          <p className="text-sm text-red-400 col-span-3">{companionErrors[companionIndex].security_pledge}</p>
                        )}

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`safety-${companionIndex}`}
                            checked={companion.safety_pledge}
                            onChange={(e) => updateCompanionConsent(companionIndex, "safety_pledge", e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-black/40 checked:bg-amber-500 checked:border-amber-500"
                          />
                          <label htmlFor={`safety-${companionIndex}`} className="text-sm font-bold cursor-pointer text-white">
                            <span className="text-red-400 mr-1">*</span>
                            {t("안전준수 서약", "Safety Pledge")}
                          </label>
                        </div>
                        {companionErrors[companionIndex]?.safety_pledge && (
                          <p className="text-sm text-red-400 col-span-3">{companionErrors[companionIndex].safety_pledge}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* 파일 첨부 Card */}


            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                onClick={() => router.back()}
                className="bg-black/40 border border-white/10 hover:border-white/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all duration-300 px-10 py-6 rounded-xl text-xl font-bold"
              >
                {t("취소", "Cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="group bg-amber-500 hover:bg-amber-600 hover:scale-105 text-black backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 px-10 py-6 rounded-xl text-xl font-bold"
              >
                {isSubmitting ? t("처리중...", "Processing...") : t("신청하기", "Submit")}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <PublicFooter />



    </div>
  )
}
