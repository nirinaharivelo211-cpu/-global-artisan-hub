// @ts-nocheck
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronRight, Package, Truck, CheckCircle2, Clock,
  Minus, Plus, XCircle, AlertCircle, Download, FileText,
  Building2, User, Phone,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/context/auth-context"
import { getMesureLabel } from "@/lib/mesure-utils"
import { useProducts } from "@/context/products-context"
import { ordersApi, colisApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { colisStatusMap, getColisAction } from "@/lib/statusMapping"
import {
  Order, OrderItem, OrderSkeleton, OrderHeaderFull,
  CustomerInfo,
} from "@/components/orders/order-detail-shared"

async function downloadFile(url?: string, filename?: string) {
  if (!url || !filename) return
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  } catch (error) {
    console.error("Download error:", error)
  }
}

function ColisQRCard({ colis, colisStatusLabel, className = "" }: { colis: any; colisStatusLabel: string; className?: string }) {
  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    }) : "--"

  return (
    <div className={`rounded-lg border bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Package className="h-4 w-4 text-gray-500" />
        Colis
      </h3>
      <div className="mb-4 flex items-center justify-between">
        <Badge className={colisStatusLabel === "Preparing" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}>
          {colisStatusLabel}
        </Badge>
        <span className="text-xs text-gray-500">{colis.items_count || 0} produit(s)</span>
      </div>
      {colis.qr_code && (
        <div className="mb-4 flex justify-center rounded-lg bg-gray-50 p-4">
          <Image src={colis.qr_code} alt="QR Colis" width={130} height={130} className="h-auto w-auto" />
        </div>
      )}
      {colis.submitted_at && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <Clock className="h-3 w-3 shrink-0" />
          Envoyé le {formatDate(colis.submitted_at)}
        </div>
      )}
      {colis.numero_colis && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <Package className="h-3 w-3 shrink-0" />
          N°: {colis.numero_colis}
        </div>
      )}
      {colis.qr_code && (
        <button
          onClick={() => downloadFile(colis.qr_code, `colis-${colis.id}-qr.png`)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
        >
          <Download className="mr-2 inline h-4 w-4" />
          Télécharger QR
        </button>
      )}
    </div>
  )
}

export default function ArtisanOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { getProductsByArtisan } = useProducts()
  const { toast } = useToast()

  const [order, setOrder] = useState<any>(null)
  const [colisItems, setColisItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fulfillment state
  const [fulfillmentQtys, setFulfillmentQtys] = useState<Record<string, number>>({})
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Dispatch state
  const [mode, setMode] = useState<"depot" | "envoi">("depot")
  const [cooperative_nom, setCooperativeNom] = useState("")
  const [numero_colis, setNumeroColis] = useState("")
  const [sending, setSending] = useState(false)
  const [selectingMode, setSelectingMode] = useState(false)

  const validationId = params?.id as string
  const myProducts = user ? getProductsByArtisan(user.id) : []

  const fetchData = useCallback(async () => {
    if (!validationId) return
    setLoading(true)
    try {
      const [orderRes, colisRes] = await Promise.all([
        ordersApi.getOrder(validationId),
        colisApi.list({ validation: Number(validationId) }),
      ])
      if (orderRes.success) setOrder(orderRes.data)
      if (colisRes.success) setColisItems(colisRes.data || [])
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger la commande", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [validationId, toast])

  useEffect(() => { fetchData() }, [fetchData])

  const artisanProducts = order?.products?.filter((p: any) =>
    myProducts.some((mp: any) => String(mp.id) === String(p.id))
  ).map((p: any) => ({
    ...p,
    price: Number(p.price),
  })) || []

  const colis = colisItems[0]
  const canDispatch = colis && colis.statut === "preparing"

  const lineKey = (p: any) => String(p.panierItemId ?? p.id) as string
  const lineQty = useCallback(
    (p: any) => fulfillmentQtys[lineKey(p)] ?? p.quantity,
    [fulfillmentQtys],
  )

  const allResolved = useMemo(() => {
    return artisanProducts.length > 0 && artisanProducts.every(p => {
      const fs = p.fulfillmentStatus || ""
      return fs === "available" || fs === "unavailable" || submitted
    })
  }, [artisanProducts, submitted])

  const recalculatedTotal = useMemo(() => {
    return artisanProducts.reduce((sum, p) => {
      const qty = lineQty(p)
      return sum + (p.price || 0) * qty
    }, 0)
  }, [artisanProducts, lineQty])

  useEffect(() => {
    if (artisanProducts.length === 0) return
    const init: Record<string, number> = {}
    artisanProducts.forEach((p) => {
      const key = lineKey(p)
      const fs = p.fulfillmentStatus || ""
      if (fs === "unavailable") {
        init[key] = 0
      } else if (p.fulfillmentQuantity != null) {
        init[key] = p.fulfillmentQuantity
      } else {
        init[key] = p.quantity
      }
    })
    setFulfillmentQtys(init)
  }, [order?.id])

  const setQty = useCallback((key: string, qty: number) => {
    setFulfillmentQtys(prev => ({ ...prev, [key]: qty }))
  }, [])

  const buildLines = () =>
    artisanProducts.map((p) => ({
      panier_item_id: Number(p.panierItemId ?? p.id),
      available_quantity: lineQty(p),
    }))

  const handleConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await ordersApi.submitArtisanFulfillment(validationId, buildLines())
      if (res.success) {
        toast({ title: "Enregistré", description: "Disponibilité des produits transmise." })
        setSubmitted(true)
        await fetchData()
      } else {
        toast({ title: "Erreur", description: res.error || "Action impossible", variant: "destructive" })
      }
    } catch {
      toast({ title: "Erreur", description: "Échec de l'envoi", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim() || submitting) return
    setSubmitting(true)
    try {
      const lines = artisanProducts.map((p) => ({
        panier_item_id: Number(p.panierItemId ?? p.id),
        available_quantity: 0,
      }))
      const res = await ordersApi.submitArtisanFulfillment(validationId, lines)
      if (res.success) {
        toast({ title: "Refus enregistré", description: "Produits marqués indisponibles." })
        setSubmitted(true)
        setShowRejectForm(false)
        setRejectReason("")
        await fetchData()
      } else {
        toast({ title: "Erreur", description: res.error || "Action impossible", variant: "destructive" })
      }
    } catch {
      toast({ title: "Erreur", description: "Échec de l'envoi", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSend = async () => {
    if (!colis || sending) return
    setSending(true)
    try {
      const res = await colisApi.dispatcher(colis.id, {
        mode,
        numero_colis: numero_colis.trim(),
        cooperative_nom: mode === "envoi" ? cooperative_nom.trim() : "",
      })
      if (res.success) {
        toast({ title: "Colis envoyé", description: "Le colis a été déclaré envoyé." })
        setColisItems(prev => prev.map(c => c.id === (res.data as any)?.id ? (res.data as any) : c))
      } else {
        toast({ title: "Erreur", description: res.error || "Action impossible", variant: "destructive" })
      }
    } catch {
      toast({ title: "Erreur", description: "Échec de l'envoi", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const formatPrice = (price: number) =>
    price === undefined || price === null ? "Ar 0,00" : `Ar ${price.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`

  const statusLabels = colisStatusMap

  if (loading) {
    return (
      <DashboardLayout role="artisan">
        <OrderSkeleton />
      </DashboardLayout>
    )
  }

  if (!order) {
    return (
      <DashboardLayout role="artisan">
        <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
          <div className="mx-auto" style={{ maxWidth: 1200 }}>
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">Commande introuvable</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/artisan")}>
                Retour au tableau de bord
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const statusRaw = String(order.status ?? "").toLowerCase().trim()
  const showFulfillment = (statusRaw === "confirmed" || statusRaw === "pending") && artisanProducts.length > 0
  const hideStatus = ["prete", "in_delivery", "forwarded", "delivered", "cancelled", "returned"].includes(statusRaw)
  const items: OrderItem[] = order.products as OrderItem[] || []

  const finalOrderId = order.order_number || order.order_number === 0 ? order.order_number : order.id
  const breadcrumbOrderNumber = `CMD${String(finalOrderId).padStart(4, "0")}`

  return (
    <DashboardLayout role="artisan">
      <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/dashboard/artisan" className="transition hover:text-gray-900">
              Ventes
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900">{breadcrumbOrderNumber}</span>
          </nav>

          <OrderHeaderFull order={order as Order} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Products table with fulfillment steppers + actions */}
            <div className="lg:col-span-2 lg:row-start-1 relative">
              <div className="absolute inset-0 overflow-auto rounded-lg">
                <div className="rounded-lg border bg-white p-5 shadow-sm h-full flex flex-col">
                <div className="mb-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Produits commandés</h2>
                      <p className="text-sm text-gray-500">{artisanProducts.length} article{artisanProducts.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="min-w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <th className="min-w-[280px] px-3 py-3 text-left">Produit</th>
                        <th className="min-w-[150px] px-3 py-3 text-left">Variantes</th>
                        <th className="min-w-[130px] px-3 py-3 text-right">Prix unitaire</th>
                        <th className="min-w-[140px] px-3 py-3 text-center">Qté</th>
                        <th className="min-w-[130px] px-3 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {artisanProducts.map((product: any) => {
                        const key = lineKey(product)
                        const orderedQty = product.quantity || 1
                        const currentQty = fulfillmentQtys[key] ?? orderedQty
                        const fs = product.fulfillmentStatus || ""
        const resolved = fs === "available" || fs === "unavailable" || submitted
                        const declined = currentQty <= 0 && resolved
                        const partial = currentQty > 0 && currentQty < orderedQty && resolved
                        const showStepper = !resolved && showFulfillment
                        const price = product.price || 0
                        const lineTotal = price * (showStepper ? currentQty : (product.fulfillmentQuantity || orderedQty))

                        const taille = product.variation_size
                        const colorName = product.variation_color_name
                        const colorHex = product.variation_color && /^#/i.test(product.variation_color) ? product.variation_color : null
                        const showColor = !!(colorHex || colorName)

                        return (
                          <tr key={key} className={`border-b border-gray-100 transition-colors ${declined ? "bg-gray-50 opacity-60" : "hover:bg-gray-50"}`}>
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-3">
                                {product.image ? (
                                  <div className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 ${declined ? "grayscale" : ""}`}>
                                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                                    <Package className="h-5 w-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className={`font-medium text-sm ${declined ? "text-gray-400 line-through" : "text-gray-900"}`}>
                                    {product.name}
                                  </div>
                                  {product.artisan && (
                                    <div className={`text-xs ${declined ? "text-gray-300" : "text-gray-500"}`}>{product.artisan}</div>
                                  )}
                    {!hideStatus && resolved && (
                    <span className={`inline-block mt-0.5 text-xs font-medium ${
                      fs === "unavailable" ? "text-red-500" :
                      partial ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {fs === "unavailable" ? "Indisponible" :
                       partial ? `Partiel (${currentQty}/${orderedQty})` :
                       getColisAction({ mode: product.colis_mode, statut: product.colis_statut || "preparing" })}
                    </span>
                    )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex flex-col gap-1.5 text-xs">
                                {(() => {
                                  const pParts: string[] = [];
                                  if (taille) pParts.push(`${getMesureLabel(product.variation_type_mesure)}: ${taille}`);
                                  const pw = product.weight != null ? Number(product.weight) : 0;
                                  if (pw > 0) pParts.push(`${pw} kg`);
                                  return pParts.length > 0 ? (
                                    <div className="text-gray-700">{pParts.join(" — ")}</div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  );
                                })()}
                                <div>
                                  {showColor ? (
                                    <span className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700">
                                      <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-gray-200" style={{ backgroundColor: colorHex || "#9CA3AF" }} />
                                      {colorName || "-"}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className={`px-3 py-4 text-right font-semibold ${declined ? "text-gray-300" : "text-gray-900"}`}>{formatPrice(price)}</td>
                            <td className={`px-3 py-4 text-center ${declined ? "text-gray-300" : "text-gray-900"}`}>
                              {showStepper ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button type="button" onClick={() => setQty(key, Math.max(0, currentQty - 1))} disabled={currentQty <= 0}
                                    className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40">
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="flex h-7 min-w-[2.5rem] items-center justify-center rounded border bg-gray-50 px-2 text-sm font-semibold">{currentQty}</span>
                                  <button type="button" onClick={() => setQty(key, Math.min(orderedQty, currentQty + 1))} disabled={currentQty >= orderedQty}
                                    className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40">
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <span>{partial ? `${currentQty} / ${orderedQty}` : currentQty}</span>
                              )}
                            </td>
                            <td className={`px-3 py-4 text-right font-semibold ${declined ? "text-gray-300" : "text-gray-900"}`}>{formatPrice(lineTotal)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {showFulfillment && !allResolved && (
                    <div className="border-t border-gray-100 pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Total vos produits</span>
                        <span className="text-base font-bold text-gray-900">{formatPrice(recalculatedTotal)}</span>
                      </div>
                      {!showRejectForm ? (
                        <div className="flex gap-3">
                          <Button onClick={handleConfirm} disabled={artisanProducts.every(p => lineQty(p) <= 0) || submitting} className="flex-1">
                            {submitting ? "Envoi en cours..." : "Valider la disponibilité"}
                          </Button>
                          <Button variant="outline" onClick={() => setShowRejectForm(true)}
                            className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
                            <XCircle className="h-4 w-4 mr-2" /> Refuser
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Label htmlFor="reject-reason" className="text-sm font-medium">Raison du refus</Label>
                          <Textarea id="reject-reason" placeholder="Expliquez la raison du refus..."
                            value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
                          <div className="flex gap-3">
                            <Button onClick={handleReject} disabled={!rejectReason.trim()} className="flex-1 bg-red-600 hover:bg-red-700">
                              Confirmer le refus
                            </Button>
                            <Button variant="outline" onClick={() => { setShowRejectForm(false); setRejectReason("") }} className="flex-1">
                              Annuler
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>

            <div className="lg:row-start-1 h-full">
              <CustomerInfo order={order as Order} className="h-full" />
            </div>
            {colis && (
              <div className="lg:col-start-3 lg:row-start-2">
                <ColisQRCard colis={colis} colisStatusLabel={statusLabels[colis.statut] || colis.statut} />
              </div>
            )}

            {colis && (
              <div className="lg:col-span-2 lg:row-start-2 rounded-lg border bg-white shadow-sm p-5 flex flex-col gap-4 min-h-[280px]">
                {/* Hub info */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Hub de destination</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="font-semibold text-gray-900">{order?.hub_destination_nom || "Hub de destination"}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{order?.hub_destination_adresse || "Adresse non disponible"}</p>
                    </div>
                    <div className="flex flex-col gap-2 text-sm sm:border-l sm:border-gray-200 sm:pl-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="text-gray-700">{order?.hub_destination_contact || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="text-gray-700">{order?.hub_destination_telephone || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Before dispatch: mode toggle + instructions + send */}
                {colis.statut === "preparing" && (
                  <>
                    <div className="border-t border-gray-100 pt-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
                        <Truck className="h-4 w-4 text-gray-500" />
                        Envoyer le colis
                      </h3>

                      <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-1">
                        <button
                          type="button"
                          disabled={selectingMode}
                          onClick={async () => {
                            setSelectingMode(true)
                            try {
                              const res = await ordersApi.selectMode(validationId, "depot")
                              if (res.success) {
                                setMode("depot")
                                setOrder(res.data)
                              } else {
                                toast({ title: "Erreur", description: res.error || "Action impossible", variant: "destructive" })
                              }
                            } catch {
                              toast({ title: "Erreur", description: "Échec de la sélection", variant: "destructive" })
                            } finally {
                              setSelectingMode(false)
                            }
                          }}
                          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                            mode === "depot" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          Dépôt au hub
                        </button>
                        <button
                          type="button"
                          disabled={selectingMode}
                          onClick={async () => {
                            setSelectingMode(true)
                            try {
                              const res = await ordersApi.selectMode(validationId, "envoi")
                              if (res.success) {
                                setMode("envoi")
                                setOrder(res.data)
                              } else {
                                toast({ title: "Erreur", description: res.error || "Action impossible", variant: "destructive" })
                              }
                            } catch {
                              toast({ title: "Erreur", description: "Échec de la sélection", variant: "destructive" })
                            } finally {
                              setSelectingMode(false)
                            }
                          }}
                          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                            mode === "envoi" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          Envoi via coopérative
                        </button>
                      </div>
                    </div>

                    {mode === "depot" && (
                      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                        <p className="text-sm leading-relaxed text-gray-700">
                          Imprimez le QR code depuis la carte Colis ci-contre et collez-le sur le colis avant de le deposer au hub. Le responsable du hub scannera le QR code a l'arrivee pour enregistrer le colis.
                        </p>
                      </div>
                    )}

                    {mode === "envoi" && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Nom de la cooperative</Label>
                          <Input
                            value={cooperative_nom}
                            onChange={(e) => setCooperativeNom(e.target.value)}
                            placeholder="Ex: Cotisse, Soatrans..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Numero de suivi (optionnel)</Label>
                          <Input
                            value={numero_colis}
                            onChange={(e) => setNumeroColis(e.target.value)}
                            placeholder="Ex: COT123456"
                          />
                        </div>
                        <Button onClick={handleSend} disabled={sending || !cooperative_nom.trim()} className="w-full">
                          {sending ? "Envoi en cours..." : "Envoyer le colis"}
                        </Button>
                        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                          <p className="text-sm leading-relaxed text-gray-700">
                            Imprimez le QR code depuis la carte Colis ci-contre et collez-le sur le colis avant de le remettre a la cooperative. Le livreur scannera le QR code lors de la collecte pour confirmer la prise en charge.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* After dispatch: success checkmark + time */}
                {colis.statut !== "preparing" && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200">
                      <CheckCircle2 className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Colis {colis.mode === "envoi" ? "envoyé" : "déposé"}
                    </h3>
                    {colis.submitted_at && (
                      <p className="mt-2 text-sm font-medium text-gray-500">
                        {new Date(colis.submitted_at).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    )}
                    {colis.cooperative_nom && colis.mode === "envoi" && (
                      <p className="mt-4 text-sm text-gray-600">
                        Transporteur : <span className="font-medium text-gray-900">{colis.cooperative_nom}</span>
                        {colis.numero_colis && <> · Suivi : <span className="font-medium text-gray-900">{colis.numero_colis}</span></>}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!colis && (
              <div className="lg:col-span-2 lg:row-start-2 rounded-lg border bg-white p-8 text-center text-sm text-gray-500">
                <Package className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>Aucun colis créé pour cette commande.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
