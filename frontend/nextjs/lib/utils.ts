// @ts-nocheck
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName || !lastName) return "U"
  return `${firstName[0]}${lastName[0]}`.toUpperCase()
}

export function formatMadagascarPhone(value: string): string {
  // Remove all non-digit characters except +
  const cleaned = value.replace(/[^\d+]/g, '')

  // If starts with +, ensure it's +261
  if (cleaned.startsWith('+')) {
    if (cleaned.startsWith('+261')) {
      const digits = cleaned.slice(4).replace(/\D/g, '')
      return formatDigits('+261', digits)
    } else {
      // Replace any other + prefix with +261
      const digits = cleaned.slice(1).replace(/\D/g, '')
      return formatDigits('+261', digits)
    }
  } else {
    // No +, add +261 prefix
    const digits = cleaned.replace(/\D/g, '')
    return formatDigits('+261', digits)
  }
}

function formatDigits(prefix: string, digits: string): string {
  if (digits.length === 0) return prefix + ' '

  // Madagascar phone format: +261 XX XX XXX XX
  let formatted = digits.slice(0, 9)

  // Add spaces progressively: XX XX XXX XX
  if (formatted.length >= 2) {
    formatted = formatted.slice(0, 2) + ' ' + formatted.slice(2)
  }
  if (formatted.length >= 5) {
    formatted = formatted.slice(0, 5) + ' ' + formatted.slice(5)
  }
  if (formatted.length >= 9) {
    formatted = formatted.slice(0, 9) + ' ' + formatted.slice(9)
  }

  return prefix + ' ' + formatted.trim()
}

