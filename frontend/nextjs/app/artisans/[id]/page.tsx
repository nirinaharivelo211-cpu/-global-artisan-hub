"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProductCard } from "@/components/product-card"
import { Card, CardContent } from "@/components/ui/card"
import { usersApi } from "@/lib/api-client"
import { productsApi } from "@/lib/api-client"
import { ArrowLeft, Phone, Mail, Star, MapPin } from "lucide-react"

interface Artisan {
  id: string | number
  prenom?: string
  nom?: string
  email?: string
  telephone?: string
  photo_de_profil?: string
  statut?: string
  description?: string
  region?: string
}

interface Product {
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
    stock: number
    image_url?: string | null
  }>
}

export default function ArtisanDetailPage() {
  const params = useParams()
  const artisanId = params.id as string

  const [artisan, setArtisan] = useState<Artisan | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate average rating from products
  const calculateAverageRating = (prods: Product[]): number => {
    if (prods.length === 0) return 0
    const sum = prods.reduce((acc, p) => acc + (p.rating || 0), 0)
    return Math.round((sum / prods.length) * 10) / 10
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Fetch artisan details
        const artisanResp = await usersApi.fetchArtisanById(artisanId)
        if (artisanResp.success && artisanResp.data) {
          setArtisan(artisanResp.data)
        } else {
          setError("Artisan non trouvé")
          return
        }

        // Fetch all products and filter by artisan
        const productsResp = await productsApi.fetchProducts()
        if (productsResp.success && productsResp.data) {
          const artisanProducts = productsResp.data.filter((p: any) =>
            String(p.id_utilisateur?.id) === artisanId
          )
          const mappedProducts: Product[] = artisanProducts.map((item: any) => ({
            id: String(item.id),
            name: item.nom,
            description: item.description,
            price: parseFloat(item.prix),
            image: item.image || (item.images && item.images.length > 0 ? (item.images[0]?.url || item.images[0]) : ""),
            images: Array.isArray(item.images) && item.images.length > 0
              ? item.images.map((im: any) => im?.url || im)
              : (item.image ? [item.image] : []),
            category: (item.id_categorie?.nom || "").trim(),
            artisan: artisanResp.data ? `${artisanResp.data.prenom || ''} ${artisanResp.data.nom || ''}`.trim() : "",
            rating: Number(item.note_moyenne ?? item.rating ?? 0),
            stock: Array.isArray(item.variations) ? item.variations.reduce((s, v) => s + Number(v.stock ?? 0), 0) : 0,
            variations: Array.isArray(item.variations) ? item.variations.map((v: any) => ({
              id: v.id?.toString() || '',
              couleur: v.couleur || v.color || null,
              couleur_nom: v.couleur_nom || null,
              taille: v.taille || v.size || null,
              type_mesure: v.type_mesure || null,
              poids: Number(v.poids || v.weight || 0),
              prix: Number(v.prix || v.price || item.prix || 0),
              stock: Number(v.stock ?? 0),
              seuil_alerte: Number(v.seuil_alerte ?? 5),
              image_url: v.image_url || null,
            })) : [],
          }))
          setProducts(mappedProducts)
        }
      } catch (err) {
        console.error("Failed to load artisan data", err)
        setError("Erreur lors du chargement des données")
      } finally {
        setLoading(false)
      }
    }

    if (artisanId) {
      loadData()
    }
  }, [artisanId])

  const averageRating = calculateAverageRating(products)

  // Star rating component
  const StarRating = ({ rating }: { rating: number }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= Math.floor(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : star - 0.5 <= rating
                ? 'fill-yellow-400/50 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium text-muted-foreground">
          {rating.toFixed(1)} ({products.length} produit{products.length > 1 ? 's' : ''})
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !artisan) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Erreur</h1>
            <p className="text-muted-foreground mb-6">{error || "Artisan non trouvé"}</p>
            <Button asChild>
              <Link href="/artisans">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux artisans
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          {/* Back button */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <Link href="/artisans">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux artisans
              </Link>
            </Button>
          </div>

          {/* Artisan Profile Section */}
          <section className="mb-12 max-w-3xl px-0">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left side - Avatar with name/status beside, rating and contacts below */}
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-6">
                  <Avatar className="h-32 w-32">
                    {artisan.photo_de_profil ? (
                      <AvatarImage
                        src={artisan.photo_de_profil}
                        alt={`${artisan.prenom || ""} ${artisan.nom || ""}`}
                      />
                    ) : (
                      <AvatarFallback className="text-4xl">
                        {artisan.prenom?.[0] || ""}
                        {artisan.nom?.[0] || ""}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="flex flex-col items-start">
                    <h1 className="font-serif text-3xl font-bold text-foreground">
                      {artisan.prenom} {artisan.nom}
                    </h1>
                    <Badge
                      variant={artisan.statut === 'actif' ? 'default' : 'secondary'}
                      className={artisan.statut === 'actif' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                    >
                      {artisan.statut === 'actif' ? 'Actif' : artisan.statut || 'Inactif'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex flex-col items-start space-y-3">
                  {artisan.email && (
                    <a
                      href={`mailto:${artisan.email}`}
                      className="flex items-center gap-2 text-sm font-semibold text-green-600 hover:text-green-800 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      {artisan.email}
                    </a>
                  )}
                  {artisan.telephone && (
                    <a
                      href={`tel:${artisan.telephone}`}
                      className="flex items-center gap-2 text-sm font-semibold text-green-600 hover:text-green-800 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      {artisan.telephone}
                    </a>
                  )}
                  {artisan.region && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span>{artisan.region}</span>
                    </div>
                  )}

                  {/* rating last */}
                  <div className="mt-2">
                    <StarRating rating={averageRating} />
                  </div>

                  {/* Bio section - directly after rating */}
                  {artisan.description && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2">À propos</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {artisan.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Bio moved to bottom */}
              {/* Bio will be placed after the rating section */}
            </div>
          </section>

          {/* Products Section */}
          <div>
            <div className="mb-8">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
                Produits de {artisan.prenom}
              </h2>
              <p className="text-muted-foreground">
                Découvrez les créations artisanales uniques de {artisan.prenom} {artisan.nom}
              </p>
            </div>

            {products.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product as any} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-lg font-medium text-foreground mb-2">Aucun produit disponible</p>
                <p className="text-muted-foreground">
                  {artisan.prenom} n&apos;a pas encore ajouté de produits.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}