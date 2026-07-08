// @ts-nocheck
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { productsApi } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle, Package } from "lucide-react"
import Link from "next/link"

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
    seuil_alerte: number
  }>
}

export default function ArtisanProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await productsApi.fetchProducts()
        if (response.success && response.data) {
          const mappedProducts = response.data.map((item: any) => ({
            id: String(item.id),
            name: item.nom,
            description: item.description,
            price: parseFloat(item.prix),
            image: item.image || (item.images && item.images.length > 0 ? (item.images[0]?.url || item.images[0]) : ""),
            images: Array.isArray(item.images) && item.images.length > 0
              ? item.images.map((im: any) => im?.url || im)
              : (item.image ? [item.image] : []),
            category: (item.id_categorie?.nom || "").trim(),
            artisan: item.id_utilisateur ? `${item.id_utilisateur.prenom || ''} ${item.id_utilisateur.nom || ''}`.trim() : "",
            rating: Number(item.note_moyenne ?? item.rating ?? 0),
            stock: Array.isArray(item.variations) ? item.variations.reduce((s: number, v: any) => s + Number(v.stock ?? 0), 0) : 0,
            variations: Array.isArray(item.variations) ? item.variations.map((v: any) => ({ ...v, seuil_alerte: Number(v.seuil_alerte ?? 5) })) : [],
          }))
          setProducts(mappedProducts)
        }
      } catch (err) {
        console.error("Failed to load products", err)
        setError("Erreur lors du chargement des produits")
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  if (loading) {
    return (
      <DashboardLayout role="artisan">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Chargement des produits...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="artisan">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold text-foreground">Mes produits</h1>
          <Button asChild>
            <Link href="/dashboard/artisan/products/add">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un produit
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {products.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-card p-8 text-center">
            <p className="text-muted-foreground mb-4">Vous n&apos;avez pas encore créé de produits</p>
            <Button asChild>
              <Link href="/dashboard/artisan/products/add">Créer votre premier produit</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="border-border/50 bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                onClick={() => router.push(`/dashboard/artisan/products/add?id=${product.id}`)}
              >
                <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-secondary">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  {product.variations && product.variations.length > 0 && (() => {
                    const hasAlert = product.variations.some(v => v.stock <= (v.seuil_alerte || 5))
                    if (!hasAlert) return null
                    const isRupture = product.variations.some(v => v.stock <= 0)
                    return (
                      <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${
                        isRupture
                          ? "bg-red-600 text-white"
                          : "bg-amber-400 text-amber-900"
                      }`}>
                        <AlertCircle className="h-3 w-3" />
                        {isRupture ? "Rupture" : "Stock faible"}
                      </div>
                    )
                  })()}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-semibold text-lg text-foreground line-clamp-1">{product.name}</h2>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{product.stock}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.category}</p>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{product.description || "Aucune description"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

