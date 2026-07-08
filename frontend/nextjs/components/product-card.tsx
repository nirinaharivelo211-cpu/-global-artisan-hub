// @ts-nocheck
"use client"

import React, { useState, useMemo } from "react"

import Image from "next/image"
import Link from "next/link"
import { Star, ShoppingBag, Check } from "lucide-react"
import { getMesureLabel } from "@/lib/mesure-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { useCart } from "@/context/cart-context"

interface ProductCardProps {
  product: {
    id: string
    name: string
    price: number
    image: string
    images?: string[]
    artisan: string
    rating: number
    category: string
    stock: number
    variations?: Array<{
      id: string
      couleur: string | null
      couleur_nom: string | null
      taille: string | null
      type_mesure?: string | null
      poids: number
      prix: number
      remise?: number
      stock: number
      image_url?: string | null
    }>
  }
  showQuickAdd?: boolean
  promoOnly?: boolean
  preselectPromo?: boolean
}

export const ProductCard = React.memo(function ProductCard({ product, showQuickAdd = true, promoOnly = false, preselectPromo = false }: ProductCardProps) {
  const { addItem } = useCart()
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [openColorPopover, setOpenColorPopover] = useState(false)
  const [openSizePopover, setOpenSizePopover] = useState(false)

  // Get available colors and sizes from variations (only in-stock variants, dynamic and synchronized)
  const availableSizes = useMemo(() => {
    const base = product.variations || []
    const filtered = promoOnly ? base.filter((v: any) => v.remise) : base
    const sizes = Array.from(new Set(
      filtered
        .filter((v: any) => Number(v.stock) > 0)
        .map((v: any) => String(v.taille || "").trim())
        .filter(Boolean)
    ))
    return sizes.sort()
  }, [product.variations, promoOnly])

  const availableColors = useMemo(() => {
    const map = new Map<string, { name: string; hex: string }>()
    const base = product.variations || []
    const filtered = promoOnly ? base.filter((v: any) => v.remise) : base
    ;(filtered)
      .filter((v: any) => Number(v.stock) > 0 && (!selectedSize || String(v.taille || "").trim() === selectedSize))
      .forEach((v: any) => {
        const name = String(v.couleur_nom || v.couleur || "").trim()
        const hex = String(v.couleur || "").trim()
        if (!name) return
        if (!map.has(name)) {
          map.set(name, { name, hex })
        }
      })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [product.variations, selectedSize, promoOnly])

  // Find the selected variant based on current selections
  const selectedVariant = useMemo(() => {
    if (!product.variations?.length) return null

    // If no selection yet, return null
    if (!selectedColor && !selectedSize) return null

    const normalizedColor = selectedColor?.trim() || null
    const normalizedSize = selectedSize?.trim() || null

    const exactVariant = product.variations.find(v => {
      const vColor = String(v.couleur_nom || v.couleur || "").trim()
      const vSize = String(v.taille || "").trim()
      const colorMatch = normalizedColor ? vColor === normalizedColor : true
      const sizeMatch = normalizedSize ? vSize === normalizedSize : true
      return colorMatch && sizeMatch && Number(v.stock) > 0
    })

    return exactVariant || null
  }, [product.variations, selectedColor, selectedSize])

  // Calculate current price, stock, and weight
  const promoVariant = useMemo(() => {
    return (product.variations || []).find((v: any) => v.remise && Number(v.stock) > 0)
  }, [product.variations])

  const currentPrice = selectedVariant ? (selectedVariant.remise ? Number(selectedVariant.prix) * (1 - Number(selectedVariant.remise) / 100) : selectedVariant.prix) : product.price
  const originalPrice = selectedVariant?.remise ? selectedVariant.prix : null
  const remiseValue = selectedVariant?.remise || null
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock
  const currentWeight = selectedVariant ? selectedVariant.poids : (product as any).weight || 0

  const normalizedPrice = typeof currentPrice === 'number' && !isNaN(currentPrice) ? currentPrice : 0
  const normalizedRating = typeof product.rating === 'number' && !isNaN(product.rating) ? product.rating : 0

  // Image à afficher : priorité à l'image liée à la variante, puis fallback couleur→index
  const currentImage = useMemo(() => {
    if (selectedVariant?.image_url) return selectedVariant.image_url
    if (selectedColor && product.images?.length) {
      const colorIdx = availableColors.findIndex(c => c.name === selectedColor)
      if (colorIdx >= 0 && colorIdx < product.images.length) {
        return product.images[colorIdx]
      }
    }
    return product.image || "/placeholder.svg"
  }, [selectedVariant, selectedColor, availableColors, product.images, product.image])

  // Auto-select first available options on mount
  React.useEffect(() => {
    // When preselectPromo is true, prefer the promo variant
    if (preselectPromo && promoVariant) {
      if (promoVariant.taille && availableSizes.length > 0) {
        setSelectedSize(promoVariant.taille)
      }
      const promoColorName = promoVariant.couleur_nom || promoVariant.couleur
      if (promoColorName && availableColors.length > 0) {
        setSelectedColor(promoColorName)
      }
      return
    }
    if (availableSizes.length > 0 && !selectedSize) {
      setSelectedSize(availableSizes[0])
    }
    if (availableColors.length > 0 && !selectedColor) {
      setSelectedColor(availableColors[0].name)
    }

    // If selected size changes and selected color is not available for it, reset color
    if (selectedSize && selectedColor && availableColors.length > 0 && !availableColors.some(c => c.name === selectedColor)) {
      setSelectedColor(availableColors[0].name)
    }
  }, [availableColors, availableSizes, selectedColor, selectedSize, preselectPromo, promoVariant])

  // Handle color selection
  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName)
  }

  // Handle size selection
  const handleSizeSelect = (size: string) => {
    setSelectedSize(size)
  }

  // Handle add to cart
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Ensure we have a valid variant or fallback to base product
    const variantToAdd = selectedVariant || {
      id: product.id,
      couleur_nom: selectedColor,
      taille: selectedSize,
      prix: product.price,
      remise: undefined,
      stock: product.stock
    }

    const cartPrice = selectedVariant?.remise
      ? Number(selectedVariant.prix) * (1 - Number(selectedVariant.remise) / 100)
      : normalizedPrice
    addItem({
      id: product.id,
      name: product.name,
      price: cartPrice,
      image: product.image,
      artisan: product.artisan,
      variantId: selectedVariant?.id,
      color: selectedVariant?.couleur_nom || selectedVariant?.couleur || selectedColor,
      colorName: selectedVariant?.couleur_nom || selectedColor,
      colorHex: selectedVariant?.couleur,
      size: selectedVariant?.taille || selectedSize,
      type_mesure: selectedVariant?.type_mesure,
      weight: currentWeight,
    })
  }

  // Check if current selection is valid
  const isValidSelection = selectedVariant !== null || (!selectedColor && !selectedSize)
  const isOutOfStock = currentStock <= 0

  return (
    <Card className="group overflow-hidden border-border/50 bg-card transition-all hover:shadow-lg hover:border-border flex flex-col h-full p-0">
      <Link href={`/products/${product.id}`} className="flex flex-col h-full">
        <div className="relative shrink-0 aspect-square overflow-hidden bg-secondary">
          <Image
            src={currentImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Stock badge in top right */}
          <div className="absolute top-2 right-2">
            {currentStock > 0 ? (
              <Badge className={`${
                currentStock > 10 ? 'bg-green-500 text-white' :
                currentStock > 5 ? 'bg-yellow-500 text-white' :
                'bg-orange-500 text-white'
              }`}>
                {currentStock}
              </Badge>
            ) : (
              <Badge variant="destructive">Rupture</Badge>
            )}
          </div>
          {/* Promo badge in top left */}
          {remiseValue && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-red-600 text-white text-xs font-bold px-2 py-0.5">
                -{Math.round(remiseValue)}%
              </Badge>
            </div>
          )}
          {showQuickAdd && (
            <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center bg-background/90 p-3 transition-transform duration-300 group-hover:translate-y-0">
              <Button size="sm" className="w-full gap-2" onClick={handleAddToCart} disabled={isOutOfStock || !isValidSelection}>
                <ShoppingBag className="h-4 w-4" />
                Ajouter au panier
              </Button>
            </div>
          )}
        </div>
        <CardContent className="p-4 grow flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">par {product.artisan}</p>
            </div>
            
            {/* Variant selectors */}
            {(availableColors.length > 0 || availableSizes.length > 0) && (
              <div className="flex flex-col gap-2 mt-2 p-2 bg-muted/20 rounded">
                {/* Color selector */}
                {availableColors.length > 0 && (
                  <div className="relative flex flex-col gap-1">
                    <span className="text-xs font-medium text-foreground">Couleur</span>
                    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide">
                      {availableColors.slice(0, 5).map(color => (
                        <button
                          key={color.name}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setOpenColorPopover(false)
                            handleColorSelect(color.name)
                          }}
                          className={`relative w-6 h-6 rounded-full border transition-all duration-200 hover:scale-105 ${
                            selectedColor === color.name
                              ? 'border-primary ring-1 ring-primary/40'
                              : 'border-gray-400 hover:border-gray-500'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {selectedColor === color.name && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check className="h-3 w-3 text-white drop-shadow-lg" />
                            </div>
                          )}
                        </button>
                      ))}
                      {availableColors.length > 5 && (
                        <Dialog open={openColorPopover} onOpenChange={(open) => {
                          setOpenSizePopover(false)
                          setOpenColorPopover(open)
                        }}>
                          <DialogTrigger asChild>
                            <span
                              className="text-xs text-muted-foreground cursor-pointer ml-1"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              title={`Voir ${availableColors.length - 5} autres couleurs`}
                            >
                              +{availableColors.length - 5}
                            </span>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm p-4">
                            <DialogHeader>
                              <DialogTitle>Autres couleurs</DialogTitle>
                              <DialogDescription>Sélectionnez une couleur supplémentaire.</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto mt-3">
                              {availableColors.slice(5).map((color) => (
                                <button
                                  key={color.name}
                                  type="button"
                                  onClick={() => {
                                    handleColorSelect(color.name)
                                    setOpenColorPopover(false)
                                  }}
                                  className="w-10 h-10 rounded-full border transition hover:scale-105"
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                )}

                {/* Size selector */}
                {availableSizes.length > 0 && (
                  <div className="relative flex flex-col gap-1">
                    <span className="text-xs font-medium text-foreground">{getMesureLabel(product.variations?.[0]?.type_mesure)}</span>
                    <div className="flex flex-nowrap items-center gap-1 overflow-x-auto scrollbar-hide">
                      {availableSizes.slice(0, 4).map(size => (
                        <button
                          key={size}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setOpenSizePopover(false)
                            handleSizeSelect(size)
                          }}
                          className={`px-2 py-0.5 text-xs rounded border transition-all duration-200 hover:scale-105 ${
                            selectedSize === size
                              ? 'border-amber-700 bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-sm'
                              : 'border-gray-300 bg-background text-foreground hover:border-gray-400'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                      {availableSizes.length > 4 && (
                        <Dialog open={openSizePopover} onOpenChange={(open) => {
                          setOpenColorPopover(false)
                          setOpenSizePopover(open)
                        }}>
                          <DialogTrigger asChild>
                            <span
                              className="text-xs text-muted-foreground cursor-pointer ml-1"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              title={`Voir ${availableSizes.length - 4} autres tailles`}
                            >
                              +{availableSizes.length - 4}
                            </span>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm p-4">
                            <DialogHeader>
                              <DialogTitle>Autres tailles</DialogTitle>
                              <DialogDescription>Sélectionnez une taille supplémentaire.</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto mt-3">
                              {availableSizes.slice(4).map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => {
                                    handleSizeSelect(size)
                                    setOpenSizePopover(false)
                                  }}
                                  className="rounded border border-gray-300 bg-background px-2 py-1 text-xs text-foreground hover:bg-gray-50"
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Feedback display */}
                {(selectedColor || selectedSize) && (
                  <div className="text-xs text-muted-foreground bg-background/50 p-1.5 rounded mt-2">
                    <span className="whitespace-nowrap">
                      {selectedSize && <span>{selectedSize}</span>}
                      {selectedSize && selectedColor && <span className="mx-1">•</span>}
                      {selectedColor && <span>{selectedColor}</span>}
                      {currentWeight > 0 && <span className="mx-1">•</span>}
                      {currentWeight > 0 && <span>{currentWeight} kg</span>}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {originalPrice ? (
                <>
                  <span className="text-sm text-muted-foreground line-through">Ar {originalPrice.toFixed(2)}</span>
                  <span className="font-semibold text-red-600">Ar {normalizedPrice.toFixed(2)}</span>
                </>
              ) : (
                <span className="font-semibold text-foreground">Ar {normalizedPrice.toFixed(2)}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-2.5 w-2.5 ${
                    i < Math.floor(normalizedRating) ? "fill-accent text-accent" : "fill-muted text-muted"
                  }`}
                />
              ))}
              <span className="ml-0.5 text-xs text-muted-foreground">({normalizedRating.toFixed(1)})</span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
})

