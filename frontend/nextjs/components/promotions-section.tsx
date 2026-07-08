"use client"

import { ProductCard } from "@/components/product-card"
import { productsApi } from "@/lib/api-client"
import { useEffect, useState } from "react"

function normalizeProduct(item: any) {
  const images = Array.isArray(item.images) && item.images.length > 0
    ? item.images.map((im: any) => im?.url || im)
    : (item.image ? [item.image] : [])
  const artisan = item.artisan_nom
    || (item.id_utilisateur && typeof item.id_utilisateur === "object"
      ? `${item.id_utilisateur.prenom || ""} ${item.id_utilisateur.nom || ""}`.trim()
      : "")
  return {
    id: item.id.toString(),
    name: item.nom,
    price: parseFloat(item.prix || 0),
    image: images[0] || "",
    images,
    artisan,
    rating: 0,
    category: item.nom_categorie || item.id_categorie?.nom || "",
    stock: Array.isArray(item.variations)
      ? item.variations.reduce((s: number, v: any) => s + Number(v.stock ?? 0), 0)
      : 0,
    variations: Array.isArray(item.variations)
      ? item.variations.map((v: any) => ({
          id: v.id?.toString() || "",
          couleur: v.couleur || null,
          couleur_nom: v.couleur_nom || null,
          taille: v.taille || null,
          type_mesure: v.type_mesure || null,
          poids: Number(v.poids || 0),
          prix: Number(v.prix || 0),
          remise: v.remise ? Number(v.remise) : undefined,
          prix_promo: v.remise ? Number(v.prix) * (1 - Number(v.remise) / 100) : undefined,
          stock: Number(v.stock ?? 0),
          image_url: v.image_url || null,
        }))
      : [],
    is_promo: true,
  }
}

export function PromotionsSection() {
  const [promoProducts, setPromoProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const res = await productsApi.fetchProducts({ en_promo: "true" })
        if (res.success && res.data) {
          const items = Array.isArray(res.data) ? res.data : (res.data as any).results || []
          setPromoProducts(items.slice(0, 8).map(normalizeProduct))
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) return null
  if (promoProducts.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
      <div className="text-center">
        <h2 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">En promotion</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Des pièces uniques à prix réduits, profitez-en avant la fin des promotions
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {promoProducts.map((item: any) => (
          <ProductCard key={item.id} product={item} preselectPromo={true} />
        ))}
      </div>
    </section>
  )
}
