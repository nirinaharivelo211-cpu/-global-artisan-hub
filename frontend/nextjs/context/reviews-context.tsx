// @ts-nocheck
"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { reviewsApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"

export interface Review {
  id: string
  rating: number // 1-5
  comment: string
  productName: string
  clientName: string
  clientAvatar: string | null
  productId: string
  createdAt: Date
}

export interface ReviewsContextType {
  reviews: Review[]
  loading: boolean
  error: string | null
  fetchReviews: () => Promise<void>
  addReview: (review: Omit<Review, "id" | "createdAt">) => Promise<void>
  averageRating: number
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined)

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  // Load reviews for all users (authenticated and non-authenticated)
  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await reviewsApi.fetchReviews()
      if (response.success && response.data) {
        // Transform API data to match our interface
        const transformedReviews = response.data.map((review: any) => ({
          id: String(review.id),
          rating: Number(review.note),
          comment: review.commentaire || '',
          productName: review.produit_nom || 'Produit inconnu',
          clientName: review.nom_complet || `${review.id_utilisateur?.prenom || ''} ${review.id_utilisateur?.nom || ''}`.trim(),
          clientAvatar: review.id_utilisateur?.photo_de_profil || null,
          productId: String(typeof review.id_produit === 'object' ? review.id_produit?.id : review.id_produit),
          createdAt: new Date(review.date_avis),
        }))
        setReviews(transformedReviews)
      } else {
        setReviews([])
        setError(response.error || "Erreur lors du chargement des avis")
      }
    } catch (err) {
      setError("Erreur lors du chargement des avis")
      toast({
        title: "Erreur",
        description: "Impossible de charger les avis",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addReview = async (newReview: Omit<Review, "id" | "createdAt">) => {
    const response = await reviewsApi.addReview({
      rating: newReview.rating,
      comment: newReview.comment,
      productName: newReview.productName,
      clientName: newReview.clientName,
    })
    if (response.success) {
      await fetchReviews() // Reload reviews
      toast({
        title: "Succès",
        description: "Nouvel avis ajouté",
      })
    } else {
      toast({
        title: "Erreur",
        description: response.error || "Impossible d'ajouter l'avis",
        variant: "destructive",
      })
    }
  }

  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return (
    <ReviewsContext.Provider value={{ reviews, loading, error, fetchReviews, addReview, averageRating }}>
      {children}
    </ReviewsContext.Provider>
  )
}

export function useReviews() {
  const context = useContext(ReviewsContext)
  if (context === undefined) {
    throw new Error("useReviews doit être utilisé dans ReviewsProvider")
  }
  return context
}

