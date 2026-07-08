// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, Package, Star, Archive, User, Tag, Calendar,
  AlertTriangle, ChevronLeft, ChevronRight,
  ImageIcon, X,
} from "lucide-react"
import { productsApi } from "@/lib/api-client"
import { getMesureLabel } from "@/lib/mesure-utils"
import { useAppToast } from "@/context/toast-context"
import { useAuth } from "@/context/auth-context"
import { API_BASE_URL } from "@/lib/api-config"

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

export default function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { addToast } = useAppToast()
  const { user } = useAuth()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"suspendre" | "bannir">("suspendre")
  const [motif, setMotif] = useState("")
  const [motifError, setMotifError] = useState("")

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      const res = await productsApi.getProduct(id)
      if (res.success && res.data) {
        setProduct(res.data)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const getImgSrc = (src: string) => {
    if (!src) return ""
    if (src.startsWith("http")) return src
    return `${API_BASE_URL}${src}`
  }

  const openModal = (type: "suspendre" | "bannir") => {
    setModalType(type)
    setMotif("")
    setMotifError("")
    setShowModal(true)
  }

  const handleConfirmAction = async () => {
    const trimmed = motif.trim()
    if (!trimmed) {
      setMotifError("Le motif est requis.")
      return
    }
    setActionLoading(true)
    setMotifError("")

    const res = modalType === "suspendre"
      ? await productsApi.suspendreProduct(id, { motif: trimmed })
      : await productsApi.bannirProduct(id, { motif: trimmed })

    if (res.success) {
      const newStatut = modalType === "suspendre" ? "suspendu" : "banni"
      setProduct((prev: any) => ({ ...prev, statut: newStatut, suspendu_jusqua: res.data?.suspendu_jusqua || null, suspension_motif: trimmed }))
      addToast({
        title: `Produit ${modalType === "suspendre" ? "suspendu" : "banni"}`,
        description: modalType === "suspendre"
          ? "Le produit ne sera plus visible pendant 5 jours, puis réactivé automatiquement."
          : "Le produit a été définitivement retiré.",
        variant: "success", duration: 3000,
      })
      setShowModal(false)
    } else {
      addToast({ title: "Erreur", description: res.error || `Impossible de ${modalType} le produit`, variant: "error", duration: 3500 })
    }
    setActionLoading(false)
  }

  if (loading) {
    return (
      <DashboardLayout role={user?.role || "admin"}>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!product) {
    return (
      <DashboardLayout role={user?.role || "admin"}>
        <div className="text-center py-20">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Produit introuvable</h3>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/products">Retour aux produits</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const images = product.images?.map((im: any) => im?.url || im) || (product.image ? [product.image] : [])
  const artisan = product.id_utilisateur
  const artisanNom = artisan ? `${artisan.prenom || ""} ${artisan.nom || ""}`.trim() : "—"
  const totalVariants = product.variations?.length || 0
  const totalStock = product.variations?.reduce((s: number, v: any) => s + Number(v.stock || 0), 0) || 0

  return (
    <DashboardLayout role={user?.role || "admin"}>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link
              href="/dashboard/admin/products"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Produits
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">{product.nom}</h1>
              <Badge className={`${STATUT_STYLES[product.statut] || "bg-gray-100 text-gray-800"} text-xs px-2 py-0.5`}>
                {STATUT_LABELS[product.statut] || product.statut}
              </Badge>
            </div>
          </div>
          {user?.role === "admin" && (
            <div className="flex items-center gap-2 shrink-0">
              {product.statut === "publie" && (
                <Button
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => openModal("suspendre")}
                  disabled={actionLoading}
                >
                  Suspendre
                </Button>
              )}
              {product.statut === "suspendu" && (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => openModal("bannir")}
                  disabled={actionLoading}
                >
                  Bannir
                </Button>
              )}
              {product.statut === "banni" && (
                <Badge variant="destructive" className="text-xs px-3 py-1">
                  Produit banni
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left column — images */}
          <div className="lg:col-span-2 space-y-3">
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="relative aspect-square bg-gray-50">
                {images.length > 0 ? (
                  <img
                    src={getImgSrc(images[selectedImage])}
                    alt={product.nom}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-gray-300" />
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex items-center gap-2 p-3 border-t">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setSelectedImage(i => Math.max(0, i - 1))}
                    disabled={selectedImage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex gap-1.5 overflow-auto">
                    {images.map((img: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`shrink-0 h-12 w-12 rounded-lg overflow-hidden border-2 transition-all ${
                          i === selectedImage ? "border-primary ring-1 ring-primary" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={getImgSrc(img)} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setSelectedImage(i => Math.min(images.length - 1, i + 1))}
                    disabled={selectedImage === images.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Right column — info */}
          <div className="lg:col-span-3 space-y-4">
            {/* Description & metadata */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-5 space-y-4">
                {product.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1.5">Description</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Catégorie
                    </span>
                    <p className="text-sm font-medium">{product.id_categorie?.nom || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Ajouté le
                    </span>
                    <p className="text-sm font-medium">{new Date(product.date_ajout).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="h-3 w-3" /> Note
                    </span>
                    <p className="text-sm font-medium">
                      {product.note_moyenne > 0
                        ? `${product.note_moyenne.toFixed(1)} / 5 (${product.nombre_avis} avis)`
                        : "Aucun avis"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Archive className="h-3 w-3" /> Stock total
                    </span>
                    <p className="text-sm font-medium">{totalStock} unités ({totalVariants} variantes)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Artisan */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <User className="h-4 w-4" /> Artisan
                </h3>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden bg-gray-100">
                    {artisan?.photo_de_profil ? (
                      <img src={getImgSrc(artisan.photo_de_profil)} alt={artisanNom} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground">{artisanNom}</p>
                    {artisan?.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{artisan.description}</p>
                    )}
                    {!artisan?.description && (
                      <p className="text-xs text-muted-foreground italic">Aucune bio</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prix */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Prix de base</span>
                  <span className="text-2xl font-bold text-foreground">{Number(product.prix).toLocaleString()} Ar</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Variants table */}
        {product.variations?.length > 0 && (
          <VariantsTable variations={product.variations} />
        )}

        {/* Warning for old/unused status */}
        {!["publie", "suspendu", "banni"].includes(product.statut) && (
          <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                Ce produit a le statut &ldquo;{product.statut}&rdquo;. Seuls les statuts Publié, Suspendu et Banni sont gérés.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal motif */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {modalType === "suspendre" ? "Suspendre le produit" : "Bannir le produit"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                disabled={actionLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              {modalType === "suspendre"
                ? "Le produit ne sera plus visible dans le catalogue. Il sera automatiquement réactivé dans 5 jours."
                : "Le produit sera définitivement retiré du catalogue et ne pourra plus être réactivé."}
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Motif
              </label>
              <textarea
                value={motif}
                onChange={e => { setMotif(e.target.value); setMotifError("") }}
                placeholder="Raison de la suspension..."
                rows={3}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
                  motifError ? "border-red-500 ring-1 ring-red-500" : "border-input"
                }`}
                disabled={actionLoading}
              />
              {motifError && (
                <p className="text-xs text-red-500">{motifError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={actionLoading}
              >
                Annuler
              </Button>
              <Button
                variant={modalType === "bannir" ? "destructive" : "default"}
                onClick={handleConfirmAction}
                disabled={actionLoading}
                className={modalType === "suspendre" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
              >
                {actionLoading
                  ? "En cours..."
                  : modalType === "suspendre" ? "Suspendre" : "Bannir"
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

const VARIANTS_PER_PAGE = 10

function VariantsTable({ variations }: { variations: any[] }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(variations.length / VARIANTS_PER_PAGE)
  const paged = variations.slice(page * VARIANTS_PER_PAGE, (page + 1) * VARIANTS_PER_PAGE)

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-foreground">
            Variantes ({variations.length})
          </h3>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">{page + 1}/{totalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap min-w-[500px]">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Couleur</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Mesure</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground" />
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Stock</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Prix</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Promo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paged.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {v.couleur ? (
                        <span
                          className="h-5 w-5 rounded-full border border-gray-200 shrink-0"
                          style={{ backgroundColor: v.couleur }}
                          title={v.couleur_nom || v.couleur}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      <span className="text-xs text-muted-foreground">{v.couleur_nom || ""}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{getMesureLabel(v.type_mesure)}</td>
                  <td className="px-5 py-3 text-sm font-medium">{v.taille || "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={Number(v.stock) <= (v.seuil_alerte || 5) && Number(v.stock) > 0 ? "text-amber-600 font-medium" : Number(v.stock) === 0 ? "text-red-500 font-medium" : ""}>
                      {v.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium">{Number(v.prix).toLocaleString()} Ar</td>
                  <td className="px-5 py-3 text-right">
                    {v.remise ? (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">-{Math.round(v.remise)}%</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
