// @ts-nocheck
"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Package, Star, Archive } from "lucide-react"
import { productsApi, categoriesApi } from "@/lib/api-client"
import { API_BASE_URL } from "@/lib/api-config"

const ITEMS_PER_PAGE = 12

const STATUT_STYLES: Record<string, string> = {
  publie: "bg-emerald-100 text-emerald-800",
  suspendu: "bg-amber-100 text-amber-800",
  banni: "bg-red-100 text-red-800",
}

const STATUT_LABELS: Record<string, string> = {
  publie: "Publié",
  suspendu: "Suspendu",
  banni: "Banni",
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [prodRes, catRes] = await Promise.all([
          productsApi.fetchProducts(),
          categoriesApi.fetchCategories(),
        ])
        if (prodRes.success && prodRes.data) {
          const raw = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.results || []
          setProducts(raw)
        }
        if (catRes.success && catRes.data) {
          const raw = Array.isArray(catRes.data) ? catRes.data : catRes.data.results || []
          setCategories(raw)
        }
      } catch (err) {
        console.error("Error loading products:", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const artisanNom = `${p.id_utilisateur?.prenom || ""} ${p.id_utilisateur?.nom || ""}`.trim().toLowerCase()
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        p.nom?.toLowerCase().includes(q) ||
        artisanNom.includes(q)
      const matchesCategory = categoryFilter === "all" || String(p.id_categorie?.id) === categoryFilter
      const matchesStatus = statusFilter === "all" || p.statut === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [products, searchQuery, categoryFilter, statusFilter])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const getImgSrc = (p: any) => {
    const src = p.images?.[0]?.url || p.image
    if (!src) return ""
    if (src.startsWith("http")) return src
    return `${API_BASE_URL}${src}`
  }

  const totalStock = (p: any) =>
    p.variations?.reduce((s: number, v: any) => s + Number(v.stock || 0), 0) || 0

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Produits</h1>
          <p className="mt-1 text-muted-foreground">Tous les produits des artisans</p>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Nom du produit, artisan..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="h-10 pl-9 bg-background border-border/60 focus-visible:border-primary"
                />
              </div>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1) }}>
                <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border/60">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nom || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
                <SelectTrigger className="h-10 w-full sm:w-[140px] bg-background border-border/60">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="publie">Publié</SelectItem>
                  <SelectItem value="suspendu">Suspendu</SelectItem>
                  <SelectItem value="banni">Banni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : currentProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Aucun produit</h3>
            <p className="text-muted-foreground">Aucun produit trouvé pour les filtres sélectionnés.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentProducts.map((p) => {
              const artisan = p.id_utilisateur
              const artisanNom = artisan ? `${artisan.prenom || ""} ${artisan.nom || ""}`.trim() : "—"
              const imgSrc = getImgSrc(p)
              const stock = totalStock(p)
              const note = p.note_moyenne
              return (
                <Link key={p.id} href={`/dashboard/admin/products/${p.id}`} className="block">
                  <Card className="border-0 shadow-md bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                          {imgSrc ? (
                            <img src={imgSrc} alt={p.nom} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-400">
                              <Package className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-sm text-foreground truncate">{p.nom}</p>
                              <Badge className={`${STATUT_STYLES[p.statut] || "bg-gray-100 text-gray-800"} text-[10px] h-5 px-1.5 shrink-0`}>
                                {STATUT_LABELS[p.statut] || p.statut}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{artisanNom}</p>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                              {note > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  {note.toFixed(1)}
                                </span>
                              )}
                              {p.id_categorie && (
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{p.id_categorie.nom}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Archive className="h-3 w-3" />
                            <span>Stock: <strong>{stock}</strong></span>
                            <span className="text-gray-300">·</span>
                            <span>{new Date(p.date_ajout).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)} sur {filteredProducts.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">{currentPage}/{totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
