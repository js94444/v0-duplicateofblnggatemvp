'use client';

import type React from "react"
import { forwardRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  required?: boolean
  description?: string
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, required, description, className, value, placeholder, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const hasValue = value !== undefined && value !== ""
    const isFloating = isFocused || hasValue

    // 플레이스홀더가 있고 "예:"로 시작하면 괄호로 감싸기
    const formattedPlaceholder = placeholder && placeholder.startsWith("예:") 
      ? `(${placeholder})` 
      : placeholder

    // 날짜 입력 시 연도를 4자리로 제한
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (props.type === "date") {
        let value = e.target.value
        
        // YYYY-MM-DD 형식이 아니거나 연도가 4자리가 아니면 수정
        if (value) {
          const parts = value.split('-')
          
          // 연도가 4자리를 초과하면 자르기
          if (parts[0] && parts[0].length > 4) {
            parts[0] = parts[0].slice(0, 4)
            value = parts.join('-')
            e.target.value = value
          }
        }
      }
      
      // 원래 onChange 핸들러 호출
      props.onChange?.(e)
    }

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            ref={ref}
            value={value}
            placeholder={formattedPlaceholder}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            onChange={handleDateChange}
            min={props.type === "date" ? "1900-01-01" : undefined}
            max={props.type === "date" ? "2099-12-31" : undefined}
            className={cn(
              "bg-black/40 border border-white/10 h-14 pt-5 pb-3 px-3 flex items-center rounded-xl backdrop-blur-sm text-white transition-all duration-300 focus-visible:ring-0 focus-visible:outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert",
              error && "border-red-400 focus-visible:border-red-400 focus-visible:ring-0",
              isFocused && "!border-amber-500 !bg-black/60 shadow-[0_0_15px_rgba(245,158,11,0.1)] ring-[3px] ring-amber-500/20",
              // date input의 경우 포커스되지 않았을 때 placeholder만 숨기기
              props.type === "date" && !isFocused && !hasValue && "[&::-webkit-datetime-edit]:opacity-0",
              className
            )}
            {...props}
          />
          <label
            className={cn(
              "absolute left-3 transition-all duration-200 pointer-events-none bg-transparent px-1",
              isFloating
                ? "-top-2.5 text-xs text-amber-500 font-bold"
                : "top-1/2 -translate-y-1/2 text-base text-white/40"
            )}
          >
            {required && <span className="text-destructive mr-0.5">*</span>}
            {label}
          </label>
        </div>
        {description && <p className="text-xs text-white/30">{description}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  },
)

FormInput.displayName = "FormInput"
