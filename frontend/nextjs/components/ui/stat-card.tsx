"use client"

import React from "react"
import { AnimatedCounter } from "@/components/animated-counter"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatCardSecondaryValue {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number
  subtitle?: string
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  trend?: "up" | "down"
  trendValue?: string
  badge?: string
  alert?: boolean
  secondaryValue?: StatCardSecondaryValue
  valueEnd?: React.ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
  labelClassName?: string
  valueClassName?: string
  subtitleClassName?: string
  children?: React.ReactNode
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  prefix,
  suffix,
  decimals,
  duration,
  trend,
  trendValue,
  badge,
  alert = false,
  secondaryValue,
  valueEnd,
  onClick,
  active = false,
  className = "",
  labelClassName = "",
  valueClassName = "",
  subtitleClassName = "",
  children,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg",
        "bg-gradient-to-br from-amber-100 to-amber-900/5",
        onClick ? "cursor-pointer" : "",
        alert ? "ring-2 ring-red-300" : "",
        active ? "ring-2 ring-purple-600/40 shadow-md" : "",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick() } : undefined}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />

      {/* Abstract circles */}
      <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-amber-200/20" />
      <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-amber-800/8" />
      <div className="absolute top-1/3 -right-3 h-12 w-12 rounded-full bg-amber-300/15" />

      <div className="p-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <span className={cn("text-sm font-semibold text-stone-700", labelClassName)}>
              {label}
            </span>
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
              "bg-gradient-to-br from-amber-700 to-amber-900",
              "shadow-lg shadow-amber-900/40 ring-1 ring-amber-600/30",
              "transition-all duration-200 group-hover:scale-110"
            )}>
              <Icon className="h-4 w-4 text-white/90 drop-shadow-lg" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("text-lg font-bold tracking-tight text-amber-950", valueClassName)}>
              {secondaryValue ? (
                <>
                  <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} duration={duration} />
                  <span className="text-sm font-medium text-muted-foreground"> / </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    <AnimatedCounter value={secondaryValue.value} prefix={secondaryValue.prefix} suffix={secondaryValue.suffix} decimals={secondaryValue.decimals} duration={duration} />
                  </span>
                </>
              ) : (
                <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} duration={duration} />
              )}
              {valueEnd}
            </span>
            {badge && (
              <Badge variant={alert ? "destructive" : "secondary"} className="text-[11px] shrink-0">
                {badge}
              </Badge>
            )}
          </div>

          <div className="min-h-[32px] flex items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {subtitle && (
                <p className={cn("text-xs text-stone-500", subtitleClassName)}>
                  {subtitle}
                </p>
              )}
              {children}
            </div>
            {trend && trendValue && (
              <div className="flex items-center gap-1 shrink-0">
                {trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-amber-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-stone-400" />
                )}
                <span className={trend === "up" ? "text-amber-700 text-[11px] font-medium" : "text-stone-500 text-[11px] font-medium"}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
