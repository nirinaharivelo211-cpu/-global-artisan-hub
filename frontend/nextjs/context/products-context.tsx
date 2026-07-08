// @ts-nocheck
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { productsApi, reviewsApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"

export interface Review {
  id: string
  author: string
  rating: number
  comment: string
  date: string
  avatar?: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  images: string[]
  imageIds: (number | null)[]
  category: string
  artisan: string
  artisanId?: string
  artisanAvatar?: string
  artisanQRCode?: string
  artisanBio: string
  rating: number
  reviewCount: number
  stock: number
  weight: number
  status: string
  reviews: Review[]
  variations?: Array<{id: string; couleur: string; couleur_nom: string; taille: string; type_mesure?: string; prix: number; remise?: number; prix_promo?: number; stock: number; seuil_alerte: number; image_id: number | null; image_url: string | null;}>
  createdAt: string
  updatedAt: string
  is_promo?: boolean
}

interface ProductsContextType {
  products: Product[]
  isLoading: boolean
  addProduct: (product: Record<string, any> | FormData) => Promise<Product | null>
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  getProductsByArtisan: (artisanId: string) => Product[]
  getProductById: (id: string) => Product | undefined
  addReview: (productId: string, review: any) => Promise<void>
  getProductReviews: (productId: string) => Review[]
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  // Load product list when appropriate
  useEffect(() => {
    // roles that should never see the catalog (except artisans who need their own products)
    const restricted = user && ["admin", "manager", "livreur"].includes(user.role)
    if (restricted) {
      // clear any previously loaded products and stop loading
      setProducts([])
      setIsLoading(false)
      return
    }

    loadProducts()
    // Keep previous products on logout rather than clearing completely
  }, [user])

  const loadProducts = async () => {
    console.log('[loadProducts] Starting...')
    setIsLoading(true)
    try {
      console.log('[loadProducts] Calling API...')
      const response = await productsApi.fetchProducts()
      console.log('[loadProducts] Response:', response)
      console.log('[loadProducts] Response.success:', response.success)
      console.log('[loadProducts] Response.data type:', typeof response.data)
      console.log('[loadProducts] Response.data length:', Array.isArray(response.data) ? response.data.length : 'N/A')
      if (response.success && response.data) {
        let dataToMap = response.data as any
        // Handle if data is wrapped in a results field (some DRF endpoints)
        if (!Array.isArray(dataToMap) && (dataToMap as any).results) {
          console.log('[loadProducts] Data wrapped in results, unwrapping...')
          dataToMap = (dataToMap as any).results
        }
        console.log('[loadProducts] Data to map:', dataToMap)
        // Load reviews
        const reviewsResponse = await reviewsApi.fetchReviews()
        console.log('[loadProducts] Reviews API response:', reviewsResponse)

        const reviews = reviewsResponse.success && reviewsResponse.data ? reviewsResponse.data : []

        // Map backend data to frontend format
        const mappedProducts = dataToMap.map((item: any) => {
          // Filter reviews for this product
          const productReviews = reviews.filter((review: any) => {
            const reviewProductId = typeof review.id_produit === 'object' ? review.id_produit?.id : review.id_produit
            return String(reviewProductId) === String(item.id)
          })

          // Map reviews to frontend format
          const mappedReviews = productReviews.map((review: any) => ({
            id: String(review.id),
            author: review.nom_complet || `${review.id_utilisateur?.prenom || ''} ${review.id_utilisateur?.nom || ''}`.trim(),
            rating: Number(review.note),
            comment: review.commentaire || '',
            date: review.date_avis,
            avatar: review.id_utilisateur?.photo_de_profil || '',
          }))

          // Calculate average rating
          const averageRating = mappedReviews.length > 0
            ? Math.round((mappedReviews.reduce((sum, review) => sum + review.rating, 0) / mappedReviews.length) * 10) / 10
            : 0

          return {
            id: item.id.toString(),
            name: item.nom,
            description: item.description,
            price: parseFloat(item.prix),
            image: item.image || (item.images && item.images.length > 0 ? (item.images[0]?.url || item.images[0]) : ""),
            images: Array.isArray(item.images) && item.images.length > 0
              ? item.images.map((im: any) => im?.url || im)
              : (item.image ? [item.image] : []),
            category: item.id_categorie?.nom || "",
            artisan: item.id_utilisateur && typeof item.id_utilisateur === 'object' ? `${item.id_utilisateur.prenom || ''} ${item.id_utilisateur.nom || ''}`.trim() : (typeof item.id_utilisateur === 'string' || typeof item.id_utilisateur === 'number' ? '' : ''),
            artisanId: item.id_utilisateur && (typeof item.id_utilisateur === 'number' || typeof item.id_utilisateur === 'string') ? String(item.id_utilisateur) : (item.id_utilisateur?.id ? String(item.id_utilisateur.id) : item.id_utilisateur?.pk ? String(item.id_utilisateur.pk) : undefined),
            artisanAvatar: item.id_utilisateur && typeof item.id_utilisateur === 'object' ? (item.id_utilisateur.photo_de_profil || item.id_utilisateur.avatar || "") : "",
            artisanQRCode: item.id_utilisateur?.code_qr || "",
            artisanBio: item.id_utilisateur?.description || "",
            variations: Array.isArray(item.variations) ? item.variations.map((v:any) => ({
              id: v.id?.toString() || '',
              couleur: v.couleur || v.color || null,
              couleur_nom: v.couleur_nom || null,
              taille: v.taille || v.size || null,
              type_mesure: v.type_mesure || null,
              poids: Number(v.poids || v.weight || 0),
              prix: Number(v.prix || v.price || item.prix || 0),
              remise: v.remise ? Number(v.remise) : undefined,
              prix_promo: v.remise ? Number(v.prix) * (1 - Number(v.remise) / 100) : undefined,
              stock: Number(v.stock ?? 0),
              seuil_alerte: Number(v.seuil_alerte ?? 5),
              image_url: v.image_url || null,
            })) : [],
            is_promo: !!(item.is_promo),
            rating: averageRating,
            reviewCount: mappedReviews.length,
            stock: Array.isArray(item.variations) ? item.variations.reduce((s: number, v: any) => s + Number(v.stock ?? 0), 0) : 0,
            weight: item.poids || 0,
            status: item.statut || "publie",
            reviews: mappedReviews,
            createdAt: item.date_ajout,
            updatedAt: item.date_ajout,
          }
        })
        console.log('[loadProducts] Mapped products count:', mappedProducts.length)
        console.log('[loadProducts] Mapped products:', mappedProducts)
        setProducts(mappedProducts)
      } else {
        console.log('[loadProducts] API error or no data:', response.error)
        setProducts([])
      }
    } catch (error) {
      console.error('[loadProducts] Caught error:', error)
      setProducts([])
    } finally {
      console.log('[loadProducts] Done, setting isLoading to false')
      setIsLoading(false)
    }
  }

  const addProduct = async (productData: Record<string, any> | FormData): Promise<Product | null> => {
    const response = await productsApi.createProduct(productData as any)
    if (response.success && response.data) {
      await loadProducts() // Reload products to get updated list
      toast({
        title: "Produit ajouté",
        description: `${response.data.nom || response.data.name} a été ajouté avec succès`,
      })
      return response.data as Product
    } else {
      toast({
        title: "Erreur",
        description: response.error || "Impossible d'ajouter le produit",
        variant: "destructive",
      })
      return null
    }
  }

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const response = await productsApi.updateProduct(id, updates)
    if (response.success) {
      await loadProducts()
      toast({
        title: "Produit mis à jour",
        description: "Le produit a été modifié avec succès",
      })
    } else {
      toast({
        title: "Erreur",
        description: response.error || "Impossible de mettre à jour le produit",
        variant: "destructive",
      })
    }
  }

  const deleteProduct = async (id: string) => {
    const response = await productsApi.deleteProduct(id)
    if (response.success) {
      await loadProducts()
      toast({
        title: "Produit supprimé",
        description: "Le produit a été supprimé avec succès",
      })
    } else {
      toast({
        title: "Erreur",
        description: response.error || "Impossible de supprimer le produit",
        variant: "destructive",
      })
    }
  }

  const getProductsByArtisan = (artisanId: string) => {
    return products.filter((product) => String(product.artisanId || '') === String(artisanId) || product.artisan === artisanId)
  }

  const getProductById = (id: string) => {
    return products.find((product) => product.id === id)
  }

  const addReview = async (productId: string, reviewData: any) => {
    const response = await reviewsApi.addReview({
      id_produit: productId,
      note: reviewData.rating,
      commentaire: reviewData.comment,
    })
    if (response.success) {
      await loadProducts() // Reload to get updated reviews
      toast({
        title: "Avis ajouté",
        description: "Votre avis a été ajouté avec succès",
      })
    } else {
      toast({
        title: "Erreur",
        description: response.error || "Impossible d'ajouter l'avis",
        variant: "destructive",
      })
    }
  }

  const getProductReviews = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    return product?.reviews || []
  }

  return (
    <ProductsContext.Provider
      value={{
        products,
        isLoading,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductsByArtisan,
        getProductById,
        addReview,
        getProductReviews,
      }}
    >
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const context = useContext(ProductsContext)
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductsProvider")
  }
  return context
}

