'use client'

import type React from "react"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Calendar } from "lucide-react"

interface BirthDateInputProps {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  error?: string
  description?: string
}

export function BirthDateInput({ label, required, value, onChange, error, description }: BirthDateInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const hiddenDateRef = useRef<HTMLInputElement>(null)
  const hasValue = value !== undefined && value !== ""
  const isFloating = isFocused || hasValue

  // 숫자만 추출해서 YYYY-MM-DD 자동 포맷
  const formatBirthDate = (input: string) => {
    const numbers = input.replace(/[^0-9]/g, '')
    if (numbers.length <= 4) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`
  }

  // 유효한 날짜인지 체크
  const isValidDate = (dateStr: string) => {
    if (dateStr.length !== 10) return false
    const d = new Date(dateStr)
    return !isNaN(d.getTime())
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBirthDate(e.target.value)
    onChange(formatted)
  }

  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChange(e.target.value)
    }
  }

  const openCalendar = () => {
    hiddenDateRef.current?.showPicker?.()
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* 메인 텍스트 입력 */}
        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={value}
          onChange={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "w-full bg-black/40 border border-white/10 h-14 pt-5 pb-3 px-3 pr-12 rounded-xl backdrop-blur-sm text-white transition-all duration-300 focus:outline-none",
            error && "border-red-400",
            isFocused && "!border-amber-500 !bg-black/60 shadow-[0_0_15px_rgba(245,158,11,0.1)] ring-[3px] ring-amber-500/20",
          )}
        />

        {/* Float label */}
        <label
          className={cn(
            "absolute left-3 transition-all duration-200 pointer-events-none bg-transparent px-1",
            isFloating
              ? "-top-2.5 text-xs text-amber-500 font-bold"
              : "top-1/2 -translate-y-1/2 text-base text-white/40"
          )}
        >
          {required && <span className="text-red-500 mr-0.5">*</span>}
          {label}
        </label>

        {/* 포맷 힌트 — label이 떠있을 때만 표시, 값이 없을 때만 */}
        {isFloating && !hasValue && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/20 pointer-events-none">
            YYYY-MM-DD
          </span>
        )}

        {/* 달력 아이콘 버튼 */}
        <button
          type="button"
          onClick={openCalendar}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/40 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
        >
          <Calendar size={18} />
        </button>

        {/* 숨겨진 date input — 달력 팝업용 */}
        <input
          ref={hiddenDateRef}
          type="date"
          value={value && isValidDate(value) ? value : ""}
          onChange={handleCalendarChange}
          min="1900-01-01"
          max="2099-12-31"
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
        />
      </div>

      {/* 입력 상태별 안내 */}
      {!description && !error && hasValue && value.length < 10 && (
        <p className="text-xs text-white/30">예: 1990-01-15</p>
      )}
      {!description && !error && hasValue && value.length === 10 && isValidDate(value) && (
        <p className="text-xs text-emerald-400/60">✓ 입력 완료</p>
      )}
      {!description && !error && hasValue && value.length === 10 && !isValidDate(value) && (
        <p className="text-xs text-red-400">올바른 날짜를 입력해주세요</p>
      )}
      {description && <p className="text-xs text-white/30">{description}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
