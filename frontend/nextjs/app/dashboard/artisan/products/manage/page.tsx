"use client"

import React, { useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"
import { useProducts } from "@/context/products-context"
import { productsApi } from "@/lib/api-client"
import { useAppToast } from "@/context/toast-context"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function ManageStocksPage() {
  const { user } = useAuth()
  const { getProductsByArtisan } = useProducts()
  const { addToast } = useAppToast()
  const artisanId = user?.id

  const products = useMemo(() => {
    if (!artisanId) return []
    return getProductsByArtisan(String(artisanId))
  }, [artisanId, getProductsByArtisan])

  const [changes, setChanges] = useState<Record<string, { variationId: string; stock: number; seuil_alerte?: number }[]>>({})
  const [saving, setSaving] = useState(false)

  const handleStockChange = (productId: string, variationId: string, value: string) => {
    const v = Number(value || 0)
    setChanges((prev) => {
      const existing = prev[productId] ? [...prev[productId]] : []
      const idx = existing.findIndex((r) => r.variationId === variationId)
      if (idx >= 0) existing[idx] = { variationId, stock: v }
      else existing.push({ variationId, stock: v })
      return { ...prev, [productId]: existing }
    })
  }

  const handleSaveAll = async () => {
    if (!Object.keys(changes).length) {
      addToast({ title: "Aucun changement", description: "Aucune modification de stock détectée." })
      return
    }
    setSaving(true)
    try {
      for (const [productId, variantChanges] of Object.entries(changes)) {
        // Build variations payload expected by backend - try patch with variations stock updates
        const updates = { variations: variantChanges.map(v => ({ id: v.variationId, stock: v.stock })) }
        await productsApi.patchProduct(String(productId), updates)
      }
      addToast({ title: "Stocks mis à jour", description: "Les stocks ont été sauvegardés avec succès." })
      setChanges({})
    } catch (err) {
      console.error(err)
      addToast({ title: "Erreur", description: "Impossible de sauvegarder les stocks.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout role="artisan">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Gestion des stocks</h1>
            <p className="text-sm text-muted-foreground">Modifiez rapidement les niveaux de stock de vos variantes.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard/artisan/products"><ArrowLeft className="mr-2 h-4 w-4" />Retour aux produits</Link>
            </Button>
            <Button onClick={handleSaveAll} disabled={saving} size="sm">
              <Save className="mr-2 h-4 w-4" />{saving ? "Sauvegarde..." : "Sauvegarder les changements"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {products.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Vous n'avez pas encore de produits.</p>
              </CardContent>
            </Card>
          ) : (
            products.map((p: any) => (
              <Card key={p.id} className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{p.name}</span>
                    <span className="text-sm text-muted-foreground">Total stock: {p.stock}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(!p.variations || p.variations.length === 0) ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 text-sm">Article sans variantes</div>
                        <div className="w-36">
                          <Input type="number" defaultValue={p.stock} onChange={(e) => handleStockChange(p.id, 'main', e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      p.variations.map((v: any) => (
                        <div key={v.id} className="flex items-center gap-3">
                          <div className="flex-1 text-sm">{v.taille || v.couleur_nom || v.couleur || 'Variante'}</div>
                          <div className="w-28 text-sm text-muted-foreground">Seuil: {v.seuil_alerte ?? 0}</div>
                          <div className="w-36">
                            <Input type="number" defaultValue={v.stock} onChange={(e) => handleStockChange(p.id, String(v.id), e.target.value)} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
