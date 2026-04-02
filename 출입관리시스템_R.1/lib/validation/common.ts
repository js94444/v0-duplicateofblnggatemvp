import { z } from "zod"
import { AccessArea } from "@/lib/types"

export const generateTimeOptions = () => {
  const times = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      times.push(timeString)
    }
  }
  return times
}

export const TIME_OPTIONS = generateTimeOptions()

export const baseApplicationSchema = z.object({
  contact_name: z.string().min(2, "담당자명은 2자 이상 입력해주세요").optional(),
  access_area: z.nativeEnum(AccessArea, {
    errorMap: () => ({ message: "출입지역을 선택해주세요" }),
  }),
  vehicle_number: z.string().optional(),
  vehicle_model: z.string().optional(),
  visit_start_time: z.string().optional(),
  visit_end_time: z.string().optional(),
})

export const fileUploadSchema = z.object({
  filename: z.string(),
  fileKey: z.string(),
  fileType: z.string(),
})

export const visitorSchema = z.object({
  name: z.string().min(1, "성명을 입력해주세요"),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일 형식이 올바르지 않습니다"),
  phone: z.string().min(1, "연락처를 입력해주세요"),
  organization: z.string().min(1, "소속을 입력해주세요"),
  position: z.string().optional(),
})

export const personnelSchema = z.object({
  organization: z.string().min(1, "소속을 입력해주세요"),
  position: z.string().min(1, "직책을 입력해주세요"),
  name: z.string().min(1, "성명을 입력해주세요"),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일 형식이 올바르지 않습니다"),
  address: z.string().min(1, "주소를 입력해주세요"),
})

export const goodsItemSchema = z.object({
  name: z.string().min(1, "품목명을 입력해주세요"),
  specification: z.string().min(1, "규격을 입력해주세요"),
  quantity: z.number().min(1, "수량은 1 이상이어야 합니다"),
  unit: z.string().min(1, "단위를 입력해주세요"),
  remarks: z.string().optional(),
})
