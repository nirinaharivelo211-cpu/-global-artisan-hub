"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface CardRowColumn<T = any> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  desktop: string
  mobileHide?: boolean
  align?: "left" | "right"
}

interface OrderCardListProps<T> {
  columns: CardRowColumn<T>[]
  data: T[]
  rowKey: keyof T | ((item: T) => string | number)
  onRowClick?: (item: T) => void
  maxHeight?: string
  emptyMessage?: React.ReactNode
  className?: string
  headerClassName?: string
}

const getKey = <T,>(item: T, key: keyof T | ((item: T) => string | number), index: number): string | number => {
  if (typeof key === "function") return key(item)
  return item[key] as string | number
}

export function OrderCardList<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  onRowClick,
  maxHeight = "500px",
  emptyMessage = "Aucune donnée",
  className,
  headerClassName,
}: OrderCardListProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 text-muted-foreground", className)}>
        {typeof emptyMessage === "string" ? <p className="text-center text-sm">{emptyMessage}</p> : emptyMessage}
      </div>
    )
  }

  const gridCols = columns.map((c) => c.desktop).join(" ")

  return (
    <>
      <div
        className={cn("hidden md:grid items-center px-5 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider border-b border-amber-200/40 gap-x-5 bg-gradient-to-r from-amber-100/80 to-amber-200/40", headerClassName)}
        style={{ gridTemplateColumns: gridCols }}
      >
        {columns.map((col) => (
          <span key={col.key} className={cn("truncate", col.align === "right" && "text-right")}>
            {col.header}
          </span>
        ))}
      </div>

      <div className={cn("overflow-auto", className)} style={{ maxHeight }}>
        {data.map((item, index) => {
          const key = getKey(item, rowKey, index)
          const first = columns[0]
          const last = columns[columns.length - 1]
          const isLast = index === data.length - 1

          return (
            <div
              key={key}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "px-5 py-3.5",
                "border-b border-gray-100",
                isLast && "border-b-0",
                "transition-all duration-150",
                onRowClick
                  ? "hover:bg-gray-50/80 hover:border-l-2 hover:border-l-amber-400 cursor-pointer active:bg-gray-100"
                  : "",
              )}
            >
              <div className="md:hidden space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-gray-900 truncate min-w-0">
                    {first?.render(item)}
                  </span>
                  <span className="text-right shrink-0">
                    {last?.render(item)}
                  </span>
                </div>
                <div className="space-y-1">
                  {columns
                    .slice(1, -1)
                    .filter((c) => !c.mobileHide)
                    .map((col) => (
                      <div key={`mb-${col.key}`} className="flex items-baseline gap-1.5 text-xs leading-5">
                        <span className="text-gray-400 shrink-0 w-16">{col.header}</span>
                        <span className="text-gray-700 min-w-0">{col.render(item)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div
                className="hidden md:grid items-center gap-x-5"
                style={{ gridTemplateColumns: gridCols }}
              >
                {columns.map((col, ci) => (
                  <span
                    key={col.key}
                    className={cn(
                      "truncate text-sm",
                      ci === 0 ? "font-semibold text-gray-900" : "text-gray-600",
                      col.align === "right" && "text-right",
                    )}
                  >
                    {col.render(item)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
