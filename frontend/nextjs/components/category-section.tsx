// @ts-nocheck
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { categoriesApi } from "@/lib/api-client"

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export function CategorySection() {
  const [cats, setCats] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      const res = await categoriesApi.fetchCategories()
      if (mounted && res.success && res.data) {
        // Map backend fields to frontend shape
        const mapped = res.data.map((c: any) => ({
          id: c.id,
          name: c.nom || c.name,
          description: c.description,
          image: c.image || "/placeholder.svg",
          slug: slugify(c.nom || c.name || String(c.id)),
        }))
        setCats(mapped)
      }
      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className="bg-secondary/30 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Acheter par catégorie</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Trouvez la pièce artisanale idéale pour embeillir votre interieur ou offrir un cadeau chargé de sens
            à quelqu' un de spécial.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {!loading && cats.length > 0 ? (
            cats.map((category) => (
              <Link key={category.id} href={`/products?category=${encodeURIComponent(category.name)}`}>
                <Card className="group overflow-hidden rounded-lg transition-transform transform hover:scale-[1.01] hover:shadow-2xl p-0">
                  <div className="relative aspect-4/3 h-full w-full overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-75"
                    />

                    {/* Gradient overlay at bottom for text */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-serif text-lg font-bold leading-tight drop-shadow-md">{category.name}</h3>
                      <p className="mt-1 text-sm text-white/95 line-clamp-2 drop-shadow-sm">{category.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">{loading ? 'Chargement...' : 'Aucune catégorie disponible'}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

