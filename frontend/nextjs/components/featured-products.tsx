// @ts-nocheck
"use client"

import { ProductCard } from "@/components/product-card"
import { useProducts } from "@/context/products-context"
import { useMemo } from "react"

export function FeaturedProducts() {
  const { products } = useProducts()

  // Take the first 8 products as featured, or all if less than 8
  const featuredProducts = useMemo(() => {
    return products.slice(0, 8)
  }, [products])

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
      <div className="text-center">
        <h2 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Création à la une</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Découvrez une séléction raffinée de pièces aritsanales, faconnées avec soin et souci du detail
          par des artisans passionés
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {featuredProducts.length > 0 ? (
          featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">
              Aucun produit disponible pour le moment. Les artisans ajouteront bientôt leurs créations !
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

