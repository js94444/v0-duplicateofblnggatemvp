import { type ApplicationType, APPLICATION_TYPE_CODES } from "@/lib/types"

export function generateReceiptNumber(type: ApplicationType): string {
  const prefix = APPLICATION_TYPE_CODES[type]
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "")

  // TODO: In production, get actual sequence number from database
  const sequence = Math.floor(Math.random() * 9999) + 1
  const sequenceStr = sequence.toString().padStart(4, "0")

  return `${prefix}-${dateStr}-${sequenceStr}`
}
