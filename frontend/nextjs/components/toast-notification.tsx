// @ts-nocheck
"use client"

import React, { useEffect, useState } from "react"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastNotificationProps {
  id: string
  title: string
  description?: string
  variant?: "default" | "success" | "error" | "info" | "warning"
  duration?: number
  onClose?: () => void
}

const VARIANT_CONFIG = {
  default: {
    bg: "bg-gradient-to-r from-slate-900 to-slate-800",
    border: "border-slate-700",
    titleText: "text-white",
    descText: "text-slate-200",
    icon: null,
  },
  success: {
    bg: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    border: "border-emerald-400",
    titleText: "text-white",
    descText: "text-emerald-50",
    icon: CheckCircle2,
  },
  error: {
    bg: "bg-gradient-to-r from-red-500 to-red-600",
    border: "border-red-400",
    titleText: "text-white",
    descText: "text-red-50",
    icon: AlertCircle,
  },
  info: {
    bg: "bg-gradient-to-r from-blue-500 to-blue-600",
    border: "border-blue-400",
    titleText: "text-white",
    descText: "text-blue-50",
    icon: Info,
  },
  warning: {
    bg: "bg-gradient-to-r from-amber-700 to-amber-900",
    border: "border-amber-400",
    titleText: "text-white",
    descText: "text-amber-50",
    icon: AlertTriangle,
  },
}

export function ToastNotification({
  id,
  title,
  description,
  variant = "default",
  duration = 3000,
  onClose,
}: ToastNotificationProps) {
  const [isExiting, setIsExiting] = useState(false)
  const config = VARIANT_CONFIG[variant]
  const IconComponent = config.icon

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => {
        onClose?.()
      }, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose?.()
    }, 300)
  }

  return (
    <div
      className={cn(
        "fixed right-4 top-4 z-50 w-96 max-w-[calc(100vw-2rem)] border rounded-xl shadow-2xl overflow-hidden",
        "transition-all duration-300 ease-in-out backdrop-blur-sm",
        config.bg,
        config.border,
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      )}
    >
      <div className="relative p-4 flex gap-3">
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-white/40 animate-pulse"
            style={{
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>

        {/* Icon */}
        {IconComponent && (
          <div className="shrink-0 pt-0.5">
            <IconComponent className="h-5 w-5 text-white" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-semibold text-sm mb-0.5", config.titleText)}>
            {title}
          </h3>
          {description && (
            <p className={cn("text-sm line-clamp-2", config.descText)}>
              {description}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="shrink-0 hover:opacity-75 transition-opacity"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

