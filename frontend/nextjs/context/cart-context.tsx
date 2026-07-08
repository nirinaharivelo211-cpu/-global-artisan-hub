// @ts-nocheck
"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { cartApi, productsApi } from "@/lib/api-client"
import { useAppToast } from "@/context/toast-context"
import { useAuth } from "@/context/auth-context"

export interface CartItem {
  id: string
  productId?: string
  _productId?: string
  name: string
  price: number
  quantity: number
  image: string
  artisan: string
  variantId?: string
  color?: string | null
  colorName?: string | null
  colorHex?: string | null
  size?: string | null
  type_mesure?: string
  weight?: number
}

export interface Cart {
  id: string
  status: 'active' | 'abandoned' | string
  items: CartItem[]
  totalPrice: number
  totalItems: number
}

interface CartData {
  id?: string
  status?: string
  items?: any[]
  total_price?: number
  total_items?: number
}

interface CartContextType {
  cart: Cart | null
  isLoading: boolean
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">) => Promise<void>
  removeItem: (id: string) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function normalizeItems(items: any[]): CartItem[] {
  const resolveColor = (rawColor: any, productInfo: any, variantId: string | null) => {
    if (!rawColor && variantId) {
      const variant = productInfo?.variations?.find((v: any) => String(v.id) === String(variantId))
      if (variant) {
        return variant.couleur_nom || variant.couleur || null
      }
    }
    if (!rawColor) return null

    const color = String(rawColor)
    const knownSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"]
    if (knownSizes.includes(color.toUpperCase())) {
      return null
    }

    // Si c'est un code hexadécimal, chercher le nom correspondant
    if (/^#(?:[0-9A-F]{3}){1,2}$/i.test(color)) {
      const variant = productInfo?.variations?.find((v: any) => 
        (v.couleur || '').toLowerCase() === color.toLowerCase() || 
        (v.couleur_nom || '').toLowerCase() === color.toLowerCase()
      )
      return variant?.couleur_nom || color
    }

    // Si c'est un code couleur (non-hex), chercher le nom correspondant
    const variant = productInfo?.variations?.find((v: any) => 
      (v.couleur || '').toLowerCase() === color.toLowerCase()
    )
    if (variant?.couleur_nom) {
      return variant.couleur_nom
    }

    // Si c'est déjà un nom de couleur, le retourner tel quel
    const variantByName = productInfo?.variations?.find((v: any) => 
      (v.couleur_nom || '').toLowerCase() === color.toLowerCase()
    )
    if (variantByName) {
      return variantByName.couleur_nom
    }

    return color
  }

  return items.map((it) => {
    // Backend may return nested product or flat item; handle both
    const product = it.product || it.produit || {}
    const imageFromProduct = product.image || (product.images && (product.images[0]?.url || product.images[0])) || ''
    const image = it.image || imageFromProduct || ''
    const price = Number(it.price ?? it.unit_price ?? product.prix ?? product.price ?? 0)
    const quantity = Number(it.quantity ?? it.qty ?? 1)
    const name = it.name || product.nom || product.name || ''
    const artisan = it.artisan || product.artisan || (product.id_utilisateur ? `${product.id_utilisateur.prenom || ''} ${product.id_utilisateur.nom || ''}`.trim() : '')
    const variantId = String(it.variantId ?? it.variation_id ?? it.produit_variation ?? '')

    const rawColor = it.color ?? it.variation_color ?? it.couleur
    const rawColorName = it.colorName ?? it.variation_color_name ?? it.couleur_nom
    const resolvedColor = resolveColor(rawColorName || rawColor, product, variantId)
    const productVariant = product?.variations?.find((v: any) => String(v.id) === variantId)

    return {
      // Use Panier ID (it.id) for cart operations, not product ID
      id: String(it.id ?? ''),
      name,
      price,
      quantity,
      image,
      artisan,
      variantId,
      color: resolvedColor,
      colorName: rawColorName || resolvedColor, // Utiliser le nom de couleur du backend d'abord
      colorHex: productVariant?.couleur || rawColor || null,
      size: it.size ?? it.variation_size ?? it.taille ?? productVariant?.taille ?? null,
      type_mesure: productVariant?.type_mesure ?? it.type_mesure ?? it.variation_type_mesure ?? null,
      weight: it.weight != null ? Number(it.weight) : (productVariant?.poids != null ? Number(productVariant.poids) : undefined),
      // Store product_id internally for image lookups
      _productId: String(it.product_id ?? product.id ?? it.productId ?? ''),
    }
  })
}

const GUEST_CART_STORAGE_KEY = "eartisan-guest-cart"

function buildGuestCartItemId(item: Omit<CartItem, "quantity">) {
  return `${item.id}::${item.variantId ?? ''}::${item.color ?? ''}::${item.size ?? ''}`
}

function createGuestCartItem(item: Omit<CartItem, "quantity">): CartItem {
  return {
    ...item,
    id: buildGuestCartItemId(item),
    productId: item.id,
    quantity: 1,
  }
}

function loadGuestCartItems(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw)
    if (!Array.isArray(items)) return []
    return items.map((item: any) => ({
      ...item,
      id: String(item.id || ''),
      productId: item.productId || item._productId || String(item.id || ''),
      _productId: item._productId || item.productId || String(item._productId || item.id || ''),
      quantity: Number(item.quantity ?? 1),
      price: Number(item.price ?? 0),
      color: item.color || null,
      colorName: item.colorName || item.color || null,
      colorHex: item.colorHex || null,
      type_mesure: item.type_mesure || null,
      weight: item.weight != null ? Number(item.weight) : undefined,
    }))
  } catch {
    return []
  }
}

function saveGuestCartItems(items: CartItem[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items))
}

function buildCartFromItems(items: CartItem[]): Cart {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return {
    id: '',
    status: 'active',
    items,
    totalPrice,
    totalItems,
  }
}

// Fetch product details for items missing images and fill them in
async function fillMissingImages(items: CartItem[]): Promise<CartItem[]> {
  const missing = items.filter((it) => !it.image && (it as any)._productId).map((it) => (it as any)._productId)
  const uniqueIds = Array.from(new Set(missing))
  if (uniqueIds.length === 0) return items

  const responses = await Promise.all(uniqueIds.map((id) => productsApi.getProduct(id)))
  const productMap: Record<string, any> = {}
  responses.forEach((res, idx) => {
    if (res.success && res.data) {
      productMap[String(uniqueIds[idx])] = res.data
    }
  })

  return items.map((it) => {
    if (it.image) return it
    const prod = productMap[(it as any)._productId]
    if (!prod) return it
    const image = prod.image || (Array.isArray(prod.images) && (prod.images[0]?.url || prod.images[0])) || ''

    // Améliorer la résolution de couleur si nécessaire
    let finalColor = it.color
    let finalColorName = it.colorName || it.color
    let finalColorHex = it.colorHex

    // Si la couleur n'est pas encore résolue correctement, essayer de la résoudre
    if (finalColor && (!finalColorName || finalColorName === finalColor)) {
      const variant = prod?.variations?.find((v: any) =>
        (v.couleur || '').toLowerCase() === finalColor.toLowerCase() ||
        (v.couleur_nom || '').toLowerCase() === finalColor.toLowerCase()
      )
      if (variant?.couleur_nom) {
        finalColorName = variant.couleur_nom
      }
    }

    // Résoudre colorHex si non défini
    if (!finalColorHex && finalColor) {
      const variant = prod?.variations?.find((v: any) =>
        (v.couleur || '').toLowerCase() === finalColor.toLowerCase() ||
        (v.couleur_nom || '').toLowerCase() === finalColor.toLowerCase()
      )
      if (variant?.couleur) {
        finalColorHex = variant.couleur
      }
    }

    return {
      ...it,
      image,
      color: finalColorName,
      colorName: finalColorName,
      colorHex: finalColorHex,
    }
  })
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { addToast } = useAppToast()
  const router = useRouter()

  // Load cart on mount
  const { user } = useAuth()

  useEffect(() => {
    loadCart()
  }, [user])

  const loadCart = async () => {
    setIsLoading(true)
    try {
      if (!user) {
        const guestItems = loadGuestCartItems()
        const itemsWithImages = await fillMissingImages(guestItems)
        setCart(buildCartFromItems(itemsWithImages))
      } else {
        const response = await cartApi.fetchCart()
        if (response.success && response.data) {
          const cartData: CartData = response.data
          console.debug("[CartProvider] loadCart raw cartData:", cartData)
          const normalizedItems = normalizeItems(cartData.items || [])
          console.debug("[CartProvider] normalizedItems:", normalizedItems)
          const itemsWithImages = await fillMissingImages(normalizedItems)
          console.debug("[CartProvider] itemsWithImages:", itemsWithImages)
          setCart({
            id: cartData.id || '',
            status: (cartData.status || 'active') as Cart['status'],
            items: itemsWithImages,
            totalPrice: cartData.total_price || 0,
            totalItems: cartData.total_items || 0,
          })
        } else {
          setCart({
            id: '',
            status: 'active',
            items: [],
            totalPrice: 0,
            totalItems: 0,
          })
        }
      }
    } catch (error) {
      console.error("Error loading cart:", error)
      setCart({
        id: '',
        status: 'active',
        items: [],
        totalPrice: 0,
        totalItems: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = async (newItem: Omit<CartItem, "quantity">) => {
    if (!user) {
      const savedItems = loadGuestCartItems()
      const existingIndex = savedItems.findIndex((item) => item.id === buildGuestCartItemId(newItem))

      if (existingIndex >= 0) {
        savedItems[existingIndex].quantity += 1
      } else {
        savedItems.push(createGuestCartItem(newItem))
      }

      saveGuestCartItems(savedItems)
      setCart(buildCartFromItems(savedItems))
      addToast({
        title: "Article ajouté",
        description: `${newItem.name} a été ajouté au panier`,
        variant: "success",
        duration: 2000,
      })
      return
    }

    try {
      const response = await cartApi.addItem({
        productId: newItem.id,
        quantity: 1,
        variantId: (newItem as any).variantId,
      })
      if (response.success && response.data) {
        const cartData: CartData = response.data
        console.debug("[CartProvider] addItem response:", cartData)
        const normalizedItems = normalizeItems(cartData.items || [])
        console.debug("[CartProvider] addItem normalizedItems:", normalizedItems)
        const itemsWithImages = await fillMissingImages(normalizedItems)
        console.debug("[CartProvider] addItem itemsWithImages:", itemsWithImages)
        setCart({
          id: cartData.id || '',
          status: cartData.status || 'active',
          items: itemsWithImages,
          totalPrice: cartData.total_price || 0,
          totalItems: cartData.total_items || 0,
        })
        addToast({
          title: "Article ajouté",
          description: `${newItem.name} a été ajouté au panier`,
          variant: "success",
          duration: 2000,
        })
      } else {
        // If backend returned 401, redirect to login so the user can authenticate
        if ((response as any).status === 401) {
          const redirectTo = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : '/'
          router.push(`/login?redirect=${redirectTo}`)
          return
        }

        addToast({
          title: "Erreur",
          description: response.error || "Impossible d'ajouter l'article",
          variant: "error",
          duration: 3000,
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Impossible d'ajouter l'article",
        variant: "error",
        duration: 3000,
      })
    }
  }

  const removeItem = async (id: string) => {
    if (!user) {
      const savedItems = loadGuestCartItems().filter((item) => item.id !== id)
      saveGuestCartItems(savedItems)
      setCart(buildCartFromItems(savedItems))
      addToast({
        title: "Article supprimé",
        description: "L'article a été retiré du panier",
        variant: "success",
        duration: 2000,
      })
      return
    }

    try {
      const response = await cartApi.removeItem(id)
      if (response.success && response.data) {
        const cartData: CartData = response.data
        console.debug("[CartProvider] removeItem response:", cartData)
        const normalizedItems = normalizeItems(cartData.items || [])
        console.debug("[CartProvider] removeItem normalizedItems:", normalizedItems)
        const itemsWithImages = await fillMissingImages(normalizedItems)
        console.debug("[CartProvider] removeItem itemsWithImages:", itemsWithImages)
        setCart({
          id: cartData.id || '',
          status: (cartData.status || 'active') as Cart['status'],
          items: itemsWithImages,
          totalPrice: cartData.total_price || 0,
          totalItems: cartData.total_items || 0,
        })
        addToast({
          title: "Article supprimé",
          description: "L'article a été retiré du panier",
          variant: "success",
          duration: 2000,
        })
      } else {
        addToast({
          title: "Erreur",
          description: response.error || "Impossible de supprimer l'article",
          variant: "error",
          duration: 3000,
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Impossible de supprimer l'article",
        variant: "error",
        duration: 3000,
      })
    }
  }

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) {
      await removeItem(id)
      return
    }

    if (!user) {
      const savedItems = loadGuestCartItems()
        .map((item) =>
          item.id === id ? { ...item, quantity } : item
        )
        .filter((item) => item.quantity > 0)
      saveGuestCartItems(savedItems)
      setCart(buildCartFromItems(savedItems))
      return
    }

    try {
      const response = await cartApi.updateItem(id, { quantity })
      if (response.success && response.data) {
        const cartData: CartData = response.data
        console.debug("[CartProvider] updateItem response:", cartData)
        const normalizedItems = normalizeItems(cartData.items || [])
        console.debug("[CartProvider] updateItem normalizedItems:", normalizedItems)
        const itemsWithImages = await fillMissingImages(normalizedItems)
        console.debug("[CartProvider] updateItem itemsWithImages:", itemsWithImages)
        setCart({
          id: cartData.id || '',
          status: (cartData.status || 'active') as Cart['status'],
          items: itemsWithImages,
          totalPrice: cartData.total_price || 0,
          totalItems: cartData.total_items || 0,
        })
      } else {
        addToast({
          title: "Erreur",
          description: response.error || "Impossible de mettre à jour la quantité",
          variant: "error",
          duration: 3000,
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Impossible de mettre à jour la quantité",
        variant: "error",
        duration: 3000,
      })
    }
  }

  const clearCart = async () => {
    if (!user) {
      saveGuestCartItems([])
      setCart({
        id: '',
        status: 'abandoned',
        items: [],
        totalPrice: 0,
        totalItems: 0,
      })
      addToast({
        title: "Panier vidé",
        description: "Tous les articles ont été supprimés",
        variant: "success",
        duration: 2000,
      })
      return
    }

    try {
      const response = await cartApi.clearCart()
      if (response.success) {
        setCart({
          id: '',
          status: 'abandoned',
          items: [],
          totalPrice: 0,
          totalItems: 0,
        })
        addToast({
          title: "Panier vidé",
          description: "Tous les articles ont été supprimés",
          variant: "success",
          duration: 2000,
        })
      } else {
        addToast({
          title: "Erreur",
          description: response.error || "Impossible de vider le panier",
          variant: "error",
          duration: 3000,
        })
      }
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Impossible de vider le panier",
        variant: "error",
        duration: 3000,
      })
    }
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart?.items || [],  // For backward compatibility
        isLoading,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems: cart?.totalItems || 0,
        totalPrice: cart?.totalPrice || 0,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

