// @ts-nocheck
import { Skeleton } from "@/components/ui/skeleton"

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-4 space-x-4">
      <Skeleton className="h-4 w-20 flex-shrink-0" />
      <Skeleton className="h-4 w-32 flex-shrink-0" />
      <Skeleton className="h-4 w-24 flex-shrink-0" />
      <Skeleton className="h-4 w-20 flex-shrink-0" />
      <Skeleton className="h-6 w-24 flex-shrink-0" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProfileSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-end gap-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}

