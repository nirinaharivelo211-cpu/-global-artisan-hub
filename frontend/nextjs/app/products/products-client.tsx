// @ts-nocheck
"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SlidersHorizontal } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/context/auth-context"
import { ProductCard } from "@/components/product-card"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  images: string[]
  category: string
  artisan: string
  rating: number
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
  }>
}

interface ProductsClientProps {
  initialProducts: Product[]
  categories: string[]
}

export default function ProductsClient({ initialProducts, categories }: ProductsClientProps) {
  const searchParams = useSearchParams()
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Immediately redirect restricted roles away
  useEffect(() => {
    if (user && ["admin", "manager", "livreur", "artisan"].includes(user.role)) {
      router.push(`/dashboard/${user.role}`)
    }
  }, [user, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user && ["admin", "manager", "livreur", "artisan"].includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Calculate max price from all variation prices
  const calcMaxPrice = (products: Product[]) => {
    let max = 0
    for (const p of products) {
      if (p.variations?.length) {
        for (const v of p.variations) if (v.prix > max) max = v.prix
      } else if (p.price > max) max = p.price
    }
    return max || 1000
  }
  const maxPrice = useMemo(() => calcMaxPrice(initialProducts), [initialProducts])

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [priceRange, setPriceRange] = useState<[number, number]>([0, calcMaxPrice(initialProducts)])
  const [promoOnly, setPromoOnly] = useState(false)

  // Initialize filters on mount and when maxPrice changes
  useEffect(() => {
    // Initialize categories from URL params
    const categoryParam = searchParams.get("category")
    if (categoryParam) {
      setSelectedCategories(new Set([decodeURIComponent(categoryParam)]))
    } else {
      setSelectedCategories(new Set())
    }

    // Initialize price range with calculated maxPrice (no filter by default)
    setPriceRange([0, maxPrice])
  }, [maxPrice, searchParams])

  // Filter products based on selected filters
  const filteredProducts = useMemo(() => {
    return initialProducts.filter(product => {
      const categoryMatch = selectedCategories.size === 0 || selectedCategories.has(product.category)
      const pricesInRange = product.variations?.length
        ? product.variations.some(v => v.prix >= priceRange[0] && v.prix <= priceRange[1])
        : (product.price >= priceRange[0] && product.price <= priceRange[1])
      const priceMatch = pricesInRange
      const promoMatch = !promoOnly || (product.variations?.some((v: any) => v.remise))
      return categoryMatch && priceMatch && promoMatch
    })
  }, [initialProducts, selectedCategories, priceRange, promoOnly])

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = new Set(selectedCategories)
    if (checked) {
      newCategories.add(category)
    } else {
      newCategories.delete(category)
    }
    setSelectedCategories(newCategories)
  }

  const handlePriceChange = (newRange: number[]) => {
    setPriceRange([newRange[0], newRange[1]])
  }

  const clearFilters = () => {
    setSelectedCategories(new Set())
    setPriceRange([0, maxPrice])
    setPromoOnly(false)
  }

  const hasActiveFilters = selectedCategories.size > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice || promoOnly

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Acheter tous les produits</h1>
            <p className="mt-2 text-muted-foreground">Découvrez des pièces artisanales faites par des artisans talentueux du monde entier</p>
          </div>

          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-serif text-lg font-semibold text-foreground">Filtres</h2>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Réinitialiser
                    </Button>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Categories Filter */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Catégories</h3>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={selectedCategories.has(category)}
                            onCheckedChange={(checked) =>
                              handleCategoryChange(category, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`category-${category}`}
                            className="text-sm font-normal text-foreground cursor-pointer"
                          >
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                    {/* Price Range Filter */}
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">Plage de prix</h3>
                      <Slider
                        value={priceRange}
                        onValueChange={handlePriceChange}
                        min={0}
                        max={maxPrice}
                        step={10}
                        className="w-full"
                      />
                      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                        <span>{(priceRange[0] ?? 0).toFixed(0)} Ar</span>
                        <span>{(priceRange[1] ?? 0).toFixed(0)} Ar</span>
                      </div>
                    </div>

                    {/* Promo Filter */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="promo-filter"
                        checked={promoOnly}
                        onCheckedChange={(checked) => setPromoOnly(checked as boolean)}
                      />
                      <Label htmlFor="promo-filter" className="text-sm font-normal text-foreground cursor-pointer">
                        En promotion
                      </Label>
                    </div>
                </div>
              </div>
            </aside>

            {/* Mobile Filter Sheet */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="icon" className="mb-4">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader className="mb-6">
                  <SheetTitle>Filtres</SheetTitle>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Mobile Categories Filter */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Catégories</h3>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mobile-category-${category}`}
                            checked={selectedCategories.has(category)}
                            onCheckedChange={(checked) =>
                              handleCategoryChange(category, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`mobile-category-${category}`}
                            className="text-sm font-normal text-foreground cursor-pointer"
                          >
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                    {/* Mobile Price Range Filter */}
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">Plage de prix</h3>
                      <Slider
                        value={priceRange}
                        onValueChange={handlePriceChange}
                        min={0}
                        max={maxPrice}
                        step={10}
                        className="w-full"
                      />
                      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                        <span>{(priceRange[0] ?? 0).toFixed(0)} Ar</span>
                        <span>{(priceRange[1] ?? 0).toFixed(0)} Ar</span>
                      </div>
                    </div>

                    {/* Mobile Promo Filter */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mobile-promo-filter"
                        checked={promoOnly}
                        onCheckedChange={(checked) => setPromoOnly(checked as boolean)}
                      />
                      <Label htmlFor="mobile-promo-filter" className="text-sm font-normal text-foreground cursor-pointer">
                        En promotion
                      </Label>
                    </div>
                  </div>
              </SheetContent>
            </Sheet>

            <div className="flex-1">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Affichage de {filteredProducts.length} {filteredProducts.length === 1 ? 'produit' : 'produits'}
                </p>
              </div>

              {filteredProducts.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product: Product) => (
                    <ProductCard key={product.id} product={product as any} preselectPromo={promoOnly} promoOnly={promoOnly} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-lg font-medium text-foreground">Aucun produit trouvé</p>
                  <p className="mt-2 text-muted-foreground">Essayez d&apos;ajuster votre recherche ou vos critères de filtrage</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

