"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { productsApi } from "@/lib/api-client"

export default function EditProductPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchProduct = async () => {
      setLoading(true)
      const result = await productsApi.getProduct(id)
      if (result.success && result.data) {
        setProduct(result.data)
        setError(null)
      } else {
        setError(result.error || "Impossible de charger le produit")
      }
      setLoading(false)
    }

    fetchProduct()
  }, [id])

  if (loading) {
    return (
      <DashboardLayout role="artisan">
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Chargement du produit...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!product || error) {
    return (
      <DashboardLayout role="artisan">
        <div className="space-y-4 p-12 text-center">
          <p className="text-destructive">{error || "Produit introuvable"}</p>
          <Button onClick={() => router.push("/dashboard/artisan/products")}>Retour aux produits</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="artisan">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold">Modifier le produit</h1>
          <Button variant="ghost" onClick={() => router.push("/dashboard/artisan/products")}>Retour</Button>
        </div>

        <div className="rounded-lg border border-border/50 bg-card p-6">
          <h2 className="text-lg font-semibold">{product.nom || product.name || "Produit"}</h2>
          <p className="text-sm text-muted-foreground">ID: {id}</p>
          <p className="mt-4 text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cette page permet de modifier les informations du produit.</p>

          <div className="mt-4 space-x-2">
            <Button asChild size="sm">
              <Link href={`/dashboard/artisan/products/${id}/edit`}>Édition en cours</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/artisan/products">Retour aux produits</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
          <p className="text-sm text-muted-foreground">(Bientôt: éditeur complet de variantes, prix, stock, images, etc.)</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
