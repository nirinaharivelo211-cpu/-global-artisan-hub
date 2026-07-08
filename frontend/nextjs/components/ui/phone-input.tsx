// @ts-nocheck
"use client"

import { forwardRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PhoneInputProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'onChange'> {
  onChange?: (value: string) => void
}

function formatLocalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)}`
}

function extractDigits(fullValue: string): string {
  const stripped = fullValue.replace(/\D/g, "")
  return stripped.replace(/^261/, "")
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const localDigits = extractDigits(value || "")

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const digits = raw.replace(/\D/g, "").slice(0, 9)
      const formatted = formatLocalDigits(digits)
      onChange?.(`+261 ${formatted}`)
    }, [onChange])

    return (
      <div className={cn("flex rounded-md border border-input shadow-sm focus-within:ring-1 focus-within:ring-ring", className)}>
        <span className="inline-flex items-center rounded-l-md bg-muted px-3 text-sm font-medium text-muted-foreground select-none">
          +261
        </span>
        <input
          {...props}
          ref={ref}
          type="tel"
          value={localDigits}
          onChange={handleChange}
          className="flex-1 rounded-r-md border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="34 66 363 21"
        />
      </div>
    )
  }
)

PhoneInput.displayName = "PhoneInput"
