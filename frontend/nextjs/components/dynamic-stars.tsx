// @ts-nocheck
import React from "react"
import { Star } from "lucide-react"

interface DynamicStarsProps {
  rating: number
  size?: number
  className?: string
  interactive?: boolean
  onRatingChange?: (rating: number) => void
}

export const DynamicStars = React.memo(function DynamicStars({
  rating,
  size = 16,
  className = "",
  interactive = false,
  onRatingChange,
}: DynamicStarsProps) {
  return (
    <div className={`inline-flex gap-0.5 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fillPercentage = Math.max(0, Math.min(1, rating - i))
        const isFilled = fillPercentage >= 0.75
        const isHalf = fillPercentage >= 0.25 && fillPercentage < 0.75

        return (
          <div
            key={i}
            className={`relative transition-transform ${interactive ? "cursor-pointer hover:scale-110" : ""}`}
            onClick={() => interactive && onRatingChange?.(i + 1)}
            style={{
              width: size,
              height: size,
            }}
          >
            {/* Étoile vide */}
            <Star
              size={size}
              className="absolute inset-0 text-muted-foreground/30"
              fill="currentColor"
            />

            {/* Étoile remplie (à moitié ou complètement) */}
            {(isFilled || isHalf) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  width: isFilled ? "100%" : "50%",
                }}
              >
                <Star
                  size={size}
                  className="text-yellow-400 animate-in fade-in duration-300"
                  fill="currentColor"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})

