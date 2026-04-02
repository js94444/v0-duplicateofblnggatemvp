"use client"

import { forwardRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormSelectProps {
  label?: string
  placeholder?: string
  error?: string
  required?: boolean
  description?: string
  options: { value: string; label: string }[]
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export const FormSelect = forwardRef<HTMLButtonElement, FormSelectProps>(
  ({ label, placeholder, error, required, description, options, value, onValueChange, className }, ref) => {
    return (
      <div className={label || description || error ? "space-y-2" : ""}>
        {label && (
          <Label className="text-sm font-medium text-white/80">
            {required && <span className="text-red-400 mr-0.5">*</span>}
            {label}
          </Label>
        )}
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger 
            ref={ref} 
            className={cn(
              "bg-black/40 border border-white/10 rounded-xl backdrop-blur-sm text-white transition-all duration-300 focus:ring-0 focus:outline-none focus:!border-amber-500 focus:!bg-black/60 focus:shadow-[0_0_15px_rgba(245,158,11,0.1)] focus:ring-[3px] focus:ring-amber-500/20", 
              error && "border-red-400 focus:!border-red-400 focus:ring-0", 
              className
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-black/95 backdrop-blur-xl border border-white/20 text-white">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="focus:bg-amber-500/20 focus:text-amber-500">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {description && <p className="text-xs text-white/30">{description}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  },
)

FormSelect.displayName = "FormSelect"
