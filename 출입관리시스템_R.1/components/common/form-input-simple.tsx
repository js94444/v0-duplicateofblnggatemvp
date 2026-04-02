"use client"

import type React from "react"
import { forwardRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormInputSimpleProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  required?: boolean
  description?: string
}

export const FormInputSimple = forwardRef<HTMLInputElement, FormInputSimpleProps>(
  ({ label, error, required, description, className, ...props }, ref) => {
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
        <Label htmlFor={props.id} className="text-sm font-medium text-white/80">
          {required && <span className="text-red-400 mr-0.5">*</span>}
          {label}
        </Label>
        <Input
          ref={ref}
          className={cn(
            "bg-black/40 border border-white/10 h-14 rounded-xl backdrop-blur-sm text-white transition-all duration-300 focus-visible:ring-0 focus-visible:outline-none focus-visible:!border-amber-500 focus-visible:!bg-black/60 focus-visible:shadow-[0_0_15px_rgba(245,158,11,0.1)] focus-visible:ring-[3px] focus-visible:ring-amber-500/20",
            error && "border-red-400 focus-visible:!border-red-400 focus-visible:ring-0",
            className
          )}
          {...props}
          onChange={handleDateChange}
          min={props.type === "date" ? "1900-01-01" : undefined}
          max={props.type === "date" ? "2099-12-31" : undefined}
        />
        {description && <p className="text-xs text-white/30">{description}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  },
)

FormInputSimple.displayName = "FormInputSimple"
