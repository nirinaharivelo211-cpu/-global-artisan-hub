// @ts-nocheck
import { Skeleton } from "@/components/ui/skeleton"

export function QRCodeSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="w-full max-w-[320px] aspect-square rounded-3xl" />
      <div className="flex gap-3 w-full max-w-[320px]">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </div>
  )
}

export function QRCodeInfoSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

