// @ts-nocheck
"use client"

import { useState } from "react"
import { Star, Send, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useProducts } from "@/context/products-context"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ReviewFormProps {
  productId: string
  onReviewAdded?: () => void
}

export function ReviewForm({ productId, onReviewAdded }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addReview } = useProducts()
  const { user, isAuthenticated } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      return
    }

    if (rating === 0 || !comment.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      await addReview(productId, {
        rating,
        comment: comment.trim(),
      })

      // Reset form
      setRating(0)
      setComment("")

      onReviewAdded?.()
    } catch (error) {
      console.error("Failed to add review:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="p-6 text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold text-lg mb-2">Connectez-vous pour laisser un avis</h3>
          <p className="text-muted-foreground">
            Vous devez être connecté et avoir acheté ce produit pour partager votre expérience.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20 bg-linear-to-br from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-primary" />
          Partager votre avis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Votre note</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 hover:scale-110 transition-transform"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Votre commentaire</label>
            <Textarea
              placeholder="Partagez votre expérience avec ce produit..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={rating === 0 || !comment.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              "Publication en cours..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publier l'avis
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
