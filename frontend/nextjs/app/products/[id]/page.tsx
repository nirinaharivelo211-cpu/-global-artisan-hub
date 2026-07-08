"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
// 'notFound' not used in client component
import { Star, Minus, Plus, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { getMesureLabel } from "@/lib/mesure-utils"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { useCart } from "@/context/cart-context"
import { useProducts } from "@/context/products-context"
import { ReviewForm } from "@/components/review-form"

export default function ProductDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { getProductById, getProductReviews } = useProducts()
  const ctxProduct = getProductById(id)
  const [product, setProduct] = useState(ctxProduct)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await (await import("@/lib/api-client")).productsApi.getProduct(id)
        if (mounted && res.success && res.data) {
          const item = res.data as any
          const mapped = {
            id: (item as any).id.toString(),
            name: (item as any).nom,
            description: (item as any).description,
            price: parseFloat((item as any).prix),
            image: (item as any).image || ((item as any).images && (item as any).images.length > 0 ? ((item as any).images[0]?.url || (item as any).images[0]) : ""),
    images: Array.isArray((item as any).images) && (item as any).images.length > 0
      ? (item as any).images.map((im: any) => im?.url || im)
      : ((item as any).image ? [(item as any).image] : []),
    imageIds: Array.isArray((item as any).images) && (item as any).images.length > 0
      ? (item as any).images.map((im: any) => im?.id ?? null)
      : [],
            category: (item as any).id_categorie?.nom || "",
            artisan: (item as any).id_utilisateur ? `${(item as any).id_utilisateur.prenom || ''} ${(item as any).id_utilisateur.nom || ''}`.trim() : "",
            artisanId: (item as any).id_utilisateur?.id ? String((item as any).id_utilisateur.id) : (item as any).id_utilisateur?.pk ? String((item as any).id_utilisateur.pk) : undefined,
            artisanAvatar: (item as any).id_utilisateur?.photo_de_profil || "",
            artisanQRCode: (item as any).id_utilisateur?.code_qr || "",
            artisanBio: (item as any).id_utilisateur?.description || "",
            rating: 0,
            reviewCount: 0,
            stock: Array.isArray((item as any).variations) ? (item as any).variations.reduce((s, v) => s + Number(v.stock ?? 0), 0) : 0,
            weight: (item as any).poids || 0,
            reviews: [],
            createdAt: (item as any).date_ajout,
            updatedAt: (item as any).date_ajout,
            variations: Array.isArray((item as any).variations) ? (item as any).variations.map((v: any) => ({
              id: v.id?.toString() || '',
              couleur: v.couleur || v.color || null,
              couleur_nom: v.couleur_nom || null,
              taille: v.taille || v.size || null,
              type_mesure: v.type_mesure || null,
              poids: Number(v.poids || v.weight || 0),
              prix: Number(v.prix || v.price || (item as any).prix || 0),
              remise: v.remise ? Number(v.remise) : undefined,
              stock: Number(v.stock ?? 0),
              seuil_alerte: Number(v.seuil_alerte ?? 5),
              image_id: v.image_id || null,
              image_url: v.image_url || null,
            })) : [],
          }

          const promoVar = mapped.variations.find((v: any) => v.remise && Number(v.stock) > 0)

          const availableSizesForItem: string[] = Array.from(new Set(
            mapped.variations
              .filter((v: any) => Number(v.stock) > 0 && v.taille)
              .map((v: any) => String(v.taille))
          ))

          const defaultSize = promoVar?.taille
            ? (availableSizesForItem.includes(promoVar.taille) ? promoVar.taille : null)
            : (availableSizesForItem.length > 0 ? String(availableSizesForItem[0]) : null)

          const availableColorsForSize: string[] = defaultSize
            ? Array.from(new Set(
                mapped.variations
                  .filter((v: any) => Number(v.stock) > 0 && String(v.taille) === defaultSize)
                  .map((v: any) => String(v.couleur_nom || v.couleur || ""))
                  .filter(Boolean)
              ))
            : []

          const promoColor = promoVar?.couleur_nom || promoVar?.couleur
          const defaultColor = promoVar && !promoVar.taille && promoColor
            ? (promoColor && availableColorsForSize.includes(promoColor)
                ? promoColor
                : (availableColorsForSize.length > 0 ? String(availableColorsForSize[0]) : null))
            : promoVar?.taille && promoColor && availableColorsForSize.includes(promoColor)
              ? promoColor
              : (availableColorsForSize.length > 0 ? String(availableColorsForSize[0]) : null)

          setProduct(mapped as any)
          setSelectedSize(defaultSize)
          setSelectedColor(defaultColor)
        }
      } catch (err) {
        // ignore
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [refreshReviews, setRefreshReviews] = useState(0)
  const { addItem } = useCart()
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [openColorPopover, setOpenColorPopover] = useState(false)
  const [openSizePopover, setOpenSizePopover] = useState(false)

  const reviews = getProductReviews(id)

  // Calculate rating and review count from reviews
  const reviewCount = reviews.length
  const averageRating = reviewCount > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount 
    : 0

  const handleReviewAdded = () => {
    setRefreshReviews(prev => prev + 1) // Force re-render to show new review
  }

  const stockVariations = product ? (product.variations || []).filter((v: any) => Number(v.stock) > 0) : []

  const allSizes = stockVariations.length > 0
    ? Array.from(new Set(stockVariations.map((v: any) => String(v.taille || "")).filter(Boolean))).sort()
    : []

  const allColors = stockVariations.length > 0
    ? Array.from(new Set(stockVariations.map((v: any) => String(v.couleur_nom || v.couleur || "")).filter(Boolean)))
    : []

  const availableSizes = useMemo(() => product
    ? Array.from(new Set(
        (product.variations || [])
          .filter((v: any) => Number(v.stock) > 0)
          .map((v: any) => String(v.taille || "").trim())
          .filter(Boolean)
      )).sort() as string[]
    : [], [product?.variations])

  const availableColors = useMemo(() => product
    ? Array.from(
        new Set(
          (product.variations || [])
            .filter((v: any) => Number(v.stock) > 0 && (!selectedSize || String(v.taille || "").trim() === selectedSize))
            .map((v: any) => String(v.couleur_nom || v.couleur || "").trim())
            .filter(Boolean)
        )
      ).sort() as string[]
    : [], [product?.variations, selectedSize])

  const colorHexMap: Record<string, string> = product
    ? (product.variations || []).reduce((acc: Record<string, string>, v: any) => {
        const name = String(v.couleur_nom || v.couleur || "").trim()
        const hex = String(v.couleur || "").trim()
        if (name && hex && !acc[name]) {
          acc[name] = hex
        }
        return acc
      }, {})
    : {}


  const selectedVariant = product
    ? (product.variations || []).find((v: any) => {
        const vColor = String(v.couleur_nom || v.couleur || "").trim()
        const vSize = String(v.taille || "").trim()
        const colorMatch = selectedColor ? vColor === selectedColor : true
        const sizeMatch = selectedSize ? vSize === selectedSize : true
        return colorMatch && sizeMatch && Number(v.stock) > 0
      }) as any || null
    : null

  // Calculate current values based on selected variant
  const currentPrice = selectedVariant
    ? (selectedVariant.remise ? Number(selectedVariant.prix) * (1 - Number(selectedVariant.remise) / 100) : selectedVariant.prix)
    : (product?.price || 0)
  const originalPrice = selectedVariant?.remise ? selectedVariant.prix : null
  const remiseValue = selectedVariant?.remise || null
  const currentStock = selectedVariant ? selectedVariant.stock : (product?.stock || 0)
  const currentWeight = selectedVariant ? selectedVariant.poids : (product?.weight || 0)

  const normalizedPrice = typeof currentPrice === 'number' && !isNaN(currentPrice) ? currentPrice : 0
  const isOutOfStock = currentStock <= 0
  const isValidSelection = selectedVariant !== null || (!selectedColor && !selectedSize)

  useEffect(() => {
    if (!product) return
    const targetSize = selectedSize && availableSizes.includes(selectedSize) ? selectedSize : availableSizes[0] ?? null
    const targetColor = selectedColor && availableColors.includes(selectedColor)
      ? selectedColor
      : availableColors[0] ?? null
    if (targetSize !== selectedSize || targetColor !== selectedColor) {
      setSelectedSize(targetSize)
      setSelectedColor(targetColor)
    }
  }, [product, availableSizes, availableColors, selectedColor, selectedSize])

  const handleAddToCart = () => {
    if (isOutOfStock || !isValidSelection || !product) return

    const realPrice = normalizedPrice
    const realStock = currentStock

    if (quantity > realStock) {
      return
    }

    const rawColor = selectedVariant?.couleur_nom || selectedVariant?.couleur || selectedColor
    const colorIsSize = rawColor && ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"].includes(String(rawColor).toUpperCase())
    const finalColor = colorIsSize ? null : rawColor

    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: realPrice,
        image: product.image,
        artisan: product.artisan,
        variantId: selectedVariant?.id,
        color: finalColor,
        size: selectedVariant?.taille || selectedSize,
        type_mesure: selectedVariant?.type_mesure,
        weight: currentWeight,
      })
    }
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  // Switch main image based on selected color/variant
  useEffect(() => {
    if (!product?.images?.length) return

    let targetIdx = -1

    // 1. Match by image_id (most reliable)
    if (selectedVariant?.image_id && product.imageIds?.length) {
      targetIdx = product.imageIds.indexOf(selectedVariant.image_id)
    }

    // 2. Match by image_url
    if (targetIdx < 0 && selectedVariant?.image_url) {
      const targetUrl = selectedVariant.image_url
      targetIdx = product.images.findIndex(
        (img: string) => img === targetUrl || img.endsWith(targetUrl),
      )
    }

    // 3. Fallback: couleur → image par index (produits existants sans image_id)
    if (targetIdx < 0 && selectedColor && availableColors.length > 0) {
      const colorIdx = availableColors.indexOf(selectedColor)
      if (colorIdx >= 0 && colorIdx < product.images.length) {
        targetIdx = colorIdx
      }
    }

    if (targetIdx >= 0) setSelectedImage(targetIdx)
  }, [selectedVariant, selectedColor])

  const nextImage = () => {
    if (product?.images) setSelectedImage((prev) => (prev + 1) % product.images.length)
  }

  const prevImage = () => {
    if (product?.images) setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length)
  }

  // Loading state - must be AFTER all hooks
  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Chargement du produit...</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center gap-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Accueil
                </Link>
              </li>
              <li className="text-muted-foreground">/</li>
              <li>
                <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors">
                  Produits
                </Link>
              </li>
              <li className="text-muted-foreground">/</li>
              <li className="text-foreground font-medium truncate max-w-50">{product.name}</li>
            </ol>
          </nav>

          <div className="grid gap-12 lg:grid-cols-2">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
                {remiseValue && (
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-red-600 text-white text-sm font-bold px-3 py-1">
                      -{Math.round(remiseValue)}%
                    </Badge>
                  </div>
                )}
                <Image
                  src={product.images[selectedImage] || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md transition-colors hover:bg-background"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md transition-colors hover:bg-background"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Gallery */}
              <div className="grid grid-cols-6 gap-2">
                {product.images.slice(0, 6).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg ${
                      selectedImage === index ? "ring-2 ring-primary ring-offset-2" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <div>
                <Badge variant="secondary" className="mb-4 capitalize px-3 py-1 text-xs font-medium rounded-full bg-amber-100/80 text-amber-800 border-0">
                  {product.category.replace("-", " ")}
                </Badge>
                <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl leading-tight">{product.name}</h1>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(averageRating) ? "fill-amber-500 text-amber-500" : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-foreground">{averageRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({reviewCount} avis)</span>
                </div>

                <div className="mt-6 flex items-baseline gap-3">
                  {originalPrice ? (
                    <>
                      <span className="text-lg text-muted-foreground line-through">Ar {originalPrice.toFixed(2)}</span>
                      <span className="text-3xl font-bold text-red-600">Ar {normalizedPrice.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-foreground">Ar {normalizedPrice.toFixed(2)}</span>
                  )}
                  {currentWeight > 0 && (
                    <span className="text-sm text-muted-foreground/60">— {currentWeight} kg</span>
                  )}
                </div>

                {product.description && (
                  <p className="mt-4 text-muted-foreground leading-relaxed">{product.description}</p>
                )}

                {/* Stock + Poids */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {isOutOfStock ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Rupture de stock
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                      currentStock > 10 ? 'bg-green-50 text-green-700 border-green-200/50' :
                      currentStock > 5 ? 'bg-yellow-50 text-yellow-700 border-yellow-200/50' :
                      'bg-orange-50 text-orange-700 border-orange-200/50'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        currentStock > 10 ? 'bg-green-500' :
                        currentStock > 5 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`} />
                      {currentStock} en stock
                    </span>
                  )}
                </div>

                {/* Variant selection */}
                {(availableColors.length > 0 || availableSizes.length > 0) && (
                  <div className="mt-6 space-y-5 p-4 sm:p-5 rounded-xl border border-amber-200/40 bg-gradient-to-br from-amber-50/40 to-background shadow-sm">
                    {/* Color selector */}
                    {availableColors.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">
                          Couleur <span className="text-xs font-normal text-muted-foreground">— {selectedColor || "Sélectionnez"}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          {availableColors.map((color: string, idx: number) => (
                            <button
                              key={`${color}-${idx}`}
                              type="button"
                              onClick={() => {
                                setSelectedColor(color)
                                setOpenColorPopover(false)
                              }}
                              className={`relative w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110 hover:shadow-md ${
                                selectedColor === color
                                  ? 'border-amber-700 ring-2 ring-amber-200 shadow-lg'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              style={{ backgroundColor: colorHexMap[color] || color || '#ddd' }}
                              title={color}
                            >
                              {selectedColor === color && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Check className="h-5 w-5 text-white drop-shadow-lg" />
                                </div>
                              )}
                            </button>
                          ))}
                          {availableColors.length > 6 && (
                            <Dialog open={openColorPopover} onOpenChange={(open) => {
                              setOpenSizePopover(false)
                              setOpenColorPopover(open)
                            }}>
                              <DialogTrigger asChild>
                                <span
                                  className="text-xs text-muted-foreground cursor-pointer ml-1 hover:text-foreground transition-colors"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                  title={`Voir ${availableColors.length - 6} autres couleurs`}
                                >
                                  +{availableColors.length - 6}
                                </span>
                              </DialogTrigger>
                              <DialogContent className="max-w-sm p-4">
                                <DialogHeader>
                                  <DialogTitle>Autres couleurs</DialogTitle>
                                  <DialogDescription>Sélectionnez une couleur supplémentaire.</DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto mt-3">
                                  {availableColors.slice(6).map((color: string, idx: number) => (
                                    <button
                                      key={`${color}-more-${idx}`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedColor(color)
                                        setOpenColorPopover(false)
                                      }}
                                      className="relative h-8 w-8 rounded-full border border-gray-200 transition hover:scale-105"
                                      style={{ backgroundColor: colorHexMap[color] || color || '#ddd' }}
                                      title={color}
                                    >
                                      {selectedColor === color && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Check className="h-4 w-4 text-white drop-shadow-lg" />
                                        </div>
                                      )}
                                    </button>
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
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">
                          {getMesureLabel(selectedVariant?.type_mesure)} <span className="text-xs font-normal text-muted-foreground">— {selectedSize || "Sélectionnez"}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {availableSizes.map((size: string) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                setSelectedSize(size)
                                setOpenSizePopover(false)
                              }}
                              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                                selectedSize === size
                                  ? 'border-amber-700 bg-amber-700 text-white shadow-md'
                                  : 'border-gray-200 bg-background text-foreground hover:border-gray-300 hover:shadow-sm'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                          {availableSizes.length > 6 && (
                            <Dialog open={openSizePopover} onOpenChange={(open) => {
                              setOpenColorPopover(false)
                              setOpenSizePopover(open)
                            }}>
                              <DialogTrigger asChild>
                                <span
                                  className="text-xs text-muted-foreground cursor-pointer ml-1 hover:text-foreground transition-colors"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                  title={`Voir ${availableSizes.length - 6} autres tailles`}
                                >
                                  +{availableSizes.length - 6}
                                </span>
                              </DialogTrigger>
                              <DialogContent className="max-w-sm p-4">
                                <DialogHeader>
                                  <DialogTitle>Autres tailles</DialogTitle>
                                  <DialogDescription>Sélectionnez une taille supplémentaire.</DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto mt-3">
                                  {availableSizes.slice(6).map((size: string) => (
                                    <button
                                      key={`${size}-more`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedSize(size)
                                        setOpenSizePopover(false)
                                      }}
                                      className="rounded-lg border border-gray-200 bg-background px-3 py-1.5 text-xs text-foreground hover:border-gray-300 hover:shadow-sm"
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

                    {/* Selection info */}
                    {selectedVariant && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/60 px-3 py-2 rounded-lg border border-amber-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {selectedColor && <span>Couleur: {selectedColor}</span>}
                        {selectedColor && selectedSize && <span className="text-amber-300">|</span>}
                        {selectedSize && <span>{getMesureLabel(selectedVariant?.type_mesure)}: {selectedSize}</span>}
                      </div>
                    )}

                    {!isValidSelection && (selectedColor || selectedSize) && (
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                        Cette combinaison n&apos;est pas disponible
                      </div>
                    )}
                  </div>
                )}

                {/* Quantity and Add to Cart */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">Quantité</span>
                    <div className="flex items-center rounded-lg border border-gray-200 bg-background shadow-sm">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-none rounded-l-lg border-r border-gray-200 text-muted-foreground hover:text-foreground hover:bg-amber-50"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-12 text-center text-sm font-semibold text-foreground select-none">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-none rounded-r-lg border-l border-gray-200 text-muted-foreground hover:text-foreground hover:bg-amber-50"
                        onClick={() => {
                          const maxStock = currentStock
                          setQuantity(Math.min(maxStock, quantity + 1))
                        }}
                        disabled={quantity >= currentStock}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="flex-1 gap-2 sm:max-w-xs"
                    onClick={handleAddToCart}
                    disabled={addedToCart || isOutOfStock || !isValidSelection || quantity > currentStock}
                  >
                    {addedToCart ? (
                      <>
                        <Check className="h-4 w-4" />
                        Ajouté au panier
                      </>
                    ) : isOutOfStock ? (
                      "Rupture de stock"
                    ) : !isValidSelection ? (
                      "Sélectionnez une variante"
                    ) : (
                      "Ajouter au panier"
                    )}
                  </Button>
                </div>
              </div>

              <Separator className="my-8" />

              {/* Artisan Section */}
              <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-amber-50/70 to-background shadow-md transition-all duration-300 hover:shadow-lg">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-800" />
                <CardContent className="py-3 px-5 sm:py-4 sm:px-6">
                  <div className="flex items-center gap-5">
                    <Link
                      href={`/artisans/${product.artisanId}`}
                      className="relative block shrink-0"
                    >
                      <div className="relative h-20 w-20 overflow-hidden rounded-xl ring-2 ring-amber-200/50 shadow-md transition-transform duration-300 group-hover:scale-105">
                        <Image
                          src={product.artisanAvatar || "/placeholder-user.jpg"}
                          alt={product.artisan}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/artisans/${product.artisanId}`}
                        className="font-serif text-xl font-bold text-foreground transition-colors hover:text-amber-700"
                      >
                        {product.artisan}
                      </Link>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">Artisan local</p>

                      {product.artisanBio && (
                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {product.artisanBio}
                        </p>
                      )}
                    </div>

                    {product.artisanQRCode && (
                      <Link
                        href={`/artisans/${product.artisanId}`}
                        className="shrink-0"
                      >
                        <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-background border border-amber-200/40 shadow-sm transition-transform duration-300 group-hover:scale-105">
                          <Image
                            src={product.artisanQRCode}
                            alt={`QR code ${product.artisan}`}
                            fill
                            className="object-contain p-2"
                          />
                        </div>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reviews Section */}
          <section className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-2xl font-bold text-foreground">Avis clients</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{averageRating.toFixed(1)}</span>
                <span>({reviewCount} avis)</span>
              </div>
            </div>

            {/* Reviews Grid - 3 per row, form first */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Review Form - First card */}
              <div className="lg:col-span-1">
                <ReviewForm productId={id} onReviewAdded={handleReviewAdded} />
              </div>

              {/* Existing Reviews */}
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <Card key={review.id} className="border-border/50 bg-card hover:shadow-lg transition-all duration-200 hover:border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-linear-to-br from-primary/10 to-primary/5 ring-2 ring-primary/10">
                          <Image
                            src={review.avatar || "/placeholder-user.jpg"}
                            alt={review.author}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-foreground text-base">{review.author}</p>
                            <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
                              {new Date(review.date).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                      </div>

                      {review.comment && (
                        <div className="bg-secondary/30 rounded-lg p-4 border-l-4 border-primary/20">
                          <p className="text-sm text-foreground leading-relaxed italic">
                            &ldquo;{review.comment}&rdquo;
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                /* Empty state cards */
                <>
                  <Card className="border-dashed border-2 opacity-50">
                    <CardContent className="p-6 text-center">
                      <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Aucun avis pour le moment</p>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed border-2 opacity-50">
                    <CardContent className="p-6 text-center">
                      <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Soyez le premier à donner votre avis !</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
