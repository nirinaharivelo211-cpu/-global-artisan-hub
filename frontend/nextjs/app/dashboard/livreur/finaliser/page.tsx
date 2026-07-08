// @ts-nocheck
"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Html5Qrcode } from "html5-qrcode"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Package,
  ChevronRight,
  QrCode,
  Loader2,
  X,
  Truck,
  CheckCircle2,
  XCircle,
  Building2,
  Hash,
  Send,
  Clock,
} from "lucide-react"
import { deliveriesApi, type Delivery } from "@/lib/deliveries-api"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { colisApi, type Colis } from "@/lib/api-client"
import { ColisCardRow } from "@/components/colis/colis-card-row"
import { useAppToast } from "@/context/toast-context"
import {
  Order,
  OrderHeaderFull,
  ProductsTable,
  PaymentSummary,
  CustomerInfo,
} from "@/components/orders/order-detail-shared"

// Convert Delivery data to Order format for shared components
function deliveryToOrder(delivery: Delivery): Order {
  // Use backend-calculated values when available
  const totalAmount = delivery.montant_total || delivery.amount || 0
  const shippingFee = delivery.frais_livraison || delivery.montant_du || 0
  const subtotal = totalAmount - shippingFee
  
  return {
    id: delivery.id,
    order_number: delivery.orderNumber,
    status: delivery.statut_validation || delivery.status || 'pending',
    created_at: delivery.date_creation,
    createdAt: delivery.date_creation,
    clientName: delivery.clientName,
    clientEmail: delivery.clientEmail || '',
    clientPhone: delivery.clientPhone,
    address: delivery.address,
    deliveryAddress: delivery.address,
    products: delivery.products || [],
    items: delivery.products || [],
    amount: totalAmount,
    total: totalAmount,
    subtotal: subtotal,
    frais_livraison: shippingFee,
    shipping_fee: shippingFee,
    qr_code: delivery.qr_code,
    qrCode: delivery.qr_code,
    payment_method: delivery.mode_paiement || '',
    mode_paiement: delivery.mode_paiement || '',
    mobile_money_provider: (delivery as any).mobile_money_provider || '',
    hub_destination_nom: delivery.hub_destination_nom || '',
    zone_livraison_nom: delivery.zone_livraison_nom || '',
    delivery: {
      datePrevue: delivery.datePrevue || delivery.date_prevue,
      dateReelle: delivery.dateReelle || delivery.date_reelle,
      statut: delivery.statut_validation || delivery.status,
      mode_paiement: delivery.mode_paiement || '',
      statut_paiement: delivery.statut_paiement || '',
      frais: shippingFee,
      cooperative_nom: delivery.cooperative_nom,
      cooperative_numero_suivi: delivery.cooperative_numero_suivi,
      shipped_at: delivery.shipped_at,
    },
  }
}

function FinaliserLivraisonContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [colisList, setColisList] = useState<Colis[]>([])

  // Scan state
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanTargetUuid, setScanTargetUuid] = useState<string | null>(null)
  const [scanError, setScanError] = useState("")
  const qrRef = useRef<Html5Qrcode | null>(null)
  const readerRef = useRef<HTMLDivElement | null>(null)
  const readerId = "livreur-scan-reader"
  const scanningRef = useRef(false)

  const { addToast } = useAppToast()
  const [startLoading, setStartLoading] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [failing, setFailing] = useState(false)
  const [showMotif, setShowMotif] = useState(false)
  const [motif, setMotif] = useState("")

  const deliveryId = searchParams.get('id')

  useEffect(() => {
    if (!deliveryId) {
      router.push('/dashboard/livreur')
      return
    }

    loadDelivery()
  }, [deliveryId])

  const loadDelivery = async () => {
    try {
      setLoading(true)
      
      // Utiliser getDeliveryById pour récupérer les détails complets
      const delivery = await deliveriesApi.getDeliveryById(parseInt(deliveryId))

      if (!delivery) {
        router.push('/dashboard/livreur')
        return
      }

      setSelectedDelivery(delivery)
      loadColis(delivery.id_validation)
    } catch (error) {
      console.error('Erreur lors du chargement de la livraison:', error)
      router.push('/dashboard/livreur')
    } finally {
      setLoading(false)
    }
  }

  const loadColis = async (validationId: number) => {
    try {
      const result = await colisApi.list({ validation: validationId })
      if (result?.success && Array.isArray(result.data)) {
        setColisList(result.data)
      } else if (Array.isArray(result)) {
        setColisList(result)
      }
    } catch (error) {
      console.error('Erreur chargement colis:', error)
    }
  }

  const stopCamera = useCallback(async () => {
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch {}
    }
  }, [])

  const clearCamera = useCallback(async () => {
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch {}
      try { qrRef.current.clear(); } catch {}
      qrRef.current = null
    }
  }, [])

  const handleScanResult = useCallback(async (uuid: string) => {
    setScanError("")
    try {
      const listRes = await colisApi.list({ validation: Number(selectedDelivery?.id_validation) })
      if (!listRes.success) {
        setScanError("Erreur lors de la recherche du colis")
        setTimeout(() => { setScanError(""); scanningRef.current = false }, 2000)
        return
      }
      if (scanTargetUuid && uuid !== scanTargetUuid) {
        setScanError("Ce QR code ne correspond pas au colis sélectionné")
        setTimeout(() => { setScanError(""); scanningRef.current = false }, 2000)
        return
      }
      const found = (listRes.data || []).find((c: any) => c.uuid === uuid)
      if (!found) {
        setScanError("Aucun colis trouvé avec cet identifiant")
        setTimeout(() => { setScanError(""); scanningRef.current = false }, 2000)
        return
      }
      if (found.statut === "collected") {
        setScanError("Colis déjà collecté")
        setTimeout(() => { setScanError(""); scanningRef.current = false }, 2000)
        return
      }
      const res = await colisApi.collect(found.id)
      if (res.success) {
        addToast({ title: "Colis collecté", description: "Colis marqué comme collecté.", variant: "success", duration: 2000 })
        scanningRef.current = false
        setScanTargetUuid(null)
        setScanModalOpen(false)
        await loadDelivery()
      } else {
        setScanError(res.error || "Impossible de collecter le colis")
        setTimeout(() => { setScanError(""); scanningRef.current = false }, 2000)
      }
    } catch {
      setScanError("Erreur lors de la collecte")
      setTimeout(() => { setScanError(""); scanningRef.current = false }, 2000)
    }
  }, [selectedDelivery, addToast, loadColis, scanTargetUuid, loadDelivery])

  const handleStartDelivery = useCallback(async () => {
    if (!selectedDelivery) return
    setStartLoading(true)
    try {
      const result = await deliveriesApi.startDelivery(selectedDelivery.id)
      if (result) {
        setSelectedDelivery(result)
        addToast({ title: "Livraison démarrée", description: "La livraison est en cours.", variant: "success", duration: 2000 })
      } else {
        addToast({ title: "Erreur", description: "Impossible de démarrer la livraison.", variant: "error", duration: 3000 })
      }
    } catch {
      addToast({ title: "Erreur", description: "Impossible de démarrer la livraison.", variant: "error", duration: 3000 })
    } finally {
      setStartLoading(false)
    }
  }, [selectedDelivery, addToast])

  const handleDelivered = useCallback(async () => {
    if (!selectedDelivery) return
    setFinalizing(true)
    try {
      const totalAmount = selectedDelivery.montant_total || selectedDelivery.amount || 0
      const modePaiement = selectedDelivery.mode_paiement || 'mobile_money'
      const result = await deliveriesApi.finalizeDelivery(
        selectedDelivery.id,
        Number(totalAmount),
        modePaiement,
        'paye',
        ''
      )
      if (result) {
        setSelectedDelivery(result)
        addToast({ title: "Livraison finalisée", description: "La livraison a été marquée comme livrée.", variant: "success", duration: 2000 })
      } else {
        addToast({ title: "Erreur", description: "Impossible de finaliser la livraison.", variant: "error", duration: 3000 })
      }
    } catch {
      addToast({ title: "Erreur", description: "Impossible de finaliser la livraison.", variant: "error", duration: 3000 })
    } finally {
      setFinalizing(false)
    }
  }, [selectedDelivery, addToast])

  const handleReturned = useCallback(async () => {
    if (!selectedDelivery || !motif.trim()) {
      addToast({ title: "Motif requis", description: "Veuillez entrer le motif du retour.", variant: "error", duration: 3000 })
      return
    }
    setFailing(true)
    try {
      const result = await deliveriesApi.failDelivery(selectedDelivery.id, motif, '')
      if (result) {
        setSelectedDelivery(result)
        setShowMotif(false)
        setMotif("")
        addToast({ title: "Livraison retournée", description: "La livraison a été marquée comme retournée.", variant: "success", duration: 2000 })
      } else {
        addToast({ title: "Erreur", description: "Impossible de retourner la livraison.", variant: "error", duration: 3000 })
      }
    } catch {
      addToast({ title: "Erreur", description: "Impossible de retourner la livraison.", variant: "error", duration: 3000 })
    } finally {
      setFailing(false)
    }
  }, [selectedDelivery, motif, addToast])

  // Expedition form state
  const isHorsZone = selectedDelivery && !selectedDelivery.zone_livraison_nom
  const [expCoop, setExpCoop] = useState("")
  const [expSuivi, setExpSuivi] = useState("")
  const [expShippedAt, setExpShippedAt] = useState(() => {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const [expSaving, setExpSaving] = useState(false)

  const handleSaveExpedition = useCallback(async () => {
    if (!selectedDelivery || !expCoop.trim() || !expShippedAt) return
    setExpSaving(true)
    const result = await deliveriesApi.sauvegarderExpedition(selectedDelivery.id, {
      cooperative_nom: expCoop.trim(),
      cooperative_numero_suivi: expSuivi.trim() || undefined,
      shipped_at: new Date(expShippedAt).toISOString(),
    })
    setExpSaving(false)
    if (result) {
      addToast({ title: "Expédition enregistrée", description: "Le colis sera expédié à la date prévue.", variant: "success", duration: 3000 })
      loadDelivery()
    } else {
      addToast({ title: "Erreur", description: "Impossible d'enregistrer l'expédition.", variant: "error", duration: 3000 })
    }
  }, [selectedDelivery, expCoop, expSuivi, expShippedAt, addToast])

  const startCamera = useCallback(async () => {
    setScanError("")
    await stopCamera()
    await new Promise(r => setTimeout(r, 50))
    const el = readerRef.current
    if (!el) { setScanError("Erreur technique"); return }
    try {
      const scanner = new Html5Qrcode(readerId)
      qrRef.current = scanner
      scanningRef.current = false
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (scanningRef.current) return
          scanningRef.current = true
          handleScanResult(decodedText.trim())
        },
        () => {}
      )
      setScanning(true)
    } catch (err: any) {
      const msg = err?.message || ""
      if (msg.includes("NotAllowedError") || msg.includes("Permission denied")) {
        setScanError("Accès à la caméra refusé")
      } else if (msg.includes("NotFoundError")) {
        setScanError("Aucune caméra trouvée")
      } else {
        setScanError("Erreur d'initialisation de la caméra")
      }
    }
  }, [stopCamera, handleScanResult])

  useEffect(() => {
    if (scanModalOpen) {
      const id = setTimeout(() => startCamera(), 200)
      return () => clearTimeout(id)
    } else {
      clearCamera()
      setScanError("")
    }
  }, [scanModalOpen, startCamera, clearCamera])

  const canScan = colisList.some((c) => c.statut === "deposited" || c.statut === "dispatched")

  const formatOrderNumber = (orderNumber: string | number | undefined) => {
    if (!orderNumber) return ""
    return !String(orderNumber).startsWith("CMD")
      ? `CMD${String(orderNumber).padStart(4, "0")}`
      : orderNumber
  }

  if (loading) {
    return (
      <DashboardLayout role="livreur">
        <div className="flex items-center justify-center min-h-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!selectedDelivery) {
    return (
      <DashboardLayout role="livreur">
        <div className="text-center py-12">
          <p className="text-gray-500">Livraison introuvable</p>
          <Button
            onClick={() => router.push('/dashboard/livreur')}
            className="mt-4"
          >
            Retour au dashboard
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  // Convert delivery to Order format for shared components
  const order = selectedDelivery ? deliveryToOrder(selectedDelivery) : null
  const statusRaw = String(order?.status ?? "").toLowerCase().trim()
  const items = order?.products || []
  const breadcrumbOrderNumber = order ? `CMD${String(order.order_number || order.id).padStart(4, "0")}` : ""

  
  return (
    <DashboardLayout role="livreur">
      <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/dashboard/livreur/deliveries" className="transition hover:text-gray-900">
              Livraisons
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900">{breadcrumbOrderNumber}</span>
          </nav>

          {(statusRaw === "prete") && !isHorsZone && (
            <div className="mb-4 flex justify-end">
              <Button
                onClick={handleStartDelivery}
                disabled={startLoading}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Truck className="h-4 w-4" />
                {startLoading ? "Démarrage…" : "Démarrer"}
              </Button>
            </div>
          )}

          <OrderHeaderFull order={order} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* ROW 1: Products + Customer */}
            <div className="lg:col-span-2 relative">
              <div className="absolute inset-0 overflow-auto">
                <ProductsTable items={items} className="h-full" hideStatus={["prete", "in_delivery", "forwarded", "delivered", "cancelled", "returned"].includes(statusRaw)} />
              </div>
            </div>
            <div>
              <CustomerInfo order={order} className="h-full" />
            </div>

            {/* ROW 2: Payment (wide) + Confirmation / Expedition / Info (narrow) */}
            <div className={`lg:col-span-3 grid grid-cols-1 gap-6 ${
              statusRaw === "in_delivery" || (isHorsZone && (statusRaw === "prete" || statusRaw === "forwarded"))
                ? "lg:grid-cols-3"
                : "lg:grid-cols-1"
            }`}>
              <div className={`h-full ${
                statusRaw === "in_delivery" || (isHorsZone && (statusRaw === "prete" || statusRaw === "forwarded"))
                  ? "lg:col-span-2"
                  : "lg:col-span-1"
              }`}>
                <PaymentSummary order={order} className="h-full" />
              </div>

              {statusRaw === "in_delivery" && (
                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Confirmation de livraison</h2>
                  </div>

                  <div className="space-y-4">
                    {selectedDelivery?.mode_paiement === "mobile_money" || (selectedDelivery as any)?.mobile_money_provider ? (
                      <div className="flex flex-col gap-3">
                        <Button
                          onClick={handleDelivered}
                          disabled={finalizing || failing}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {finalizing ? "Finalisation..." : "Livrée"}
                        </Button>
                        <Button
                          onClick={() => setShowMotif(true)}
                          disabled={finalizing || failing}
                          variant="outline"
                          className="w-full border-red-300 text-red-600 hover:bg-red-50 gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Retournée
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <Button
                          onClick={handleDelivered}
                          disabled={finalizing || failing}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {finalizing ? "Finalisation..." : "Payée"}
                        </Button>
                        <Button
                          onClick={() => setShowMotif(true)}
                          disabled={finalizing || failing}
                          variant="outline"
                          className="w-full border-red-300 text-red-600 hover:bg-red-50 gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Retournée
                        </Button>
                      </div>
                    )}

                    {showMotif && (
                      <div className="space-y-3 border-t border-gray-200 pt-4">
                        <label className="text-sm font-medium text-gray-700">Motif du retour</label>
                        <textarea
                          value={motif}
                          onChange={(e) => setMotif(e.target.value)}
                          placeholder="Veuillez indiquer la raison du retour..."
                          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={3}
                        />
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={handleReturned}
                            disabled={finalizing || failing || !motif.trim()}
                            className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
                          >
                            {failing ? "Traitement..." : "Confirmer le retour"}
                          </Button>
                          <Button
                            onClick={() => { setShowMotif(false); setMotif("") }}
                            variant="outline"
                            className="w-full gap-2"
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hors-zone: Expedition form quando prete and not yet saved */}
              {isHorsZone && statusRaw === "prete" && !selectedDelivery?.cooperative_nom && (
                <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
                  <div className="pb-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Expédition</h3>
                  </div>
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">Coopérative</Label>
                      <Input
                        value={expCoop}
                        onChange={(e) => setExpCoop(e.target.value)}
                        placeholder="Ex: Cotisse"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">N° suivi</Label>
                      <Input
                        value={expSuivi}
                        onChange={(e) => setExpSuivi(e.target.value)}
                        placeholder="Ex: COT123456"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">Expédition le</Label>
                      <Input
                        type="datetime-local"
                        value={expShippedAt}
                        onChange={(e) => setExpShippedAt(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      onClick={handleSaveExpedition}
                      disabled={expSaving || !expCoop.trim() || !expShippedAt}
                      size="sm"
                      className="w-full gap-1.5 mt-1"
                    >
                      {expSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Valider l'expédition
                    </Button>
                  </div>
                </div>
              )}

              {/* Hors-zone: Expedition info (read-only) */}
              {isHorsZone && selectedDelivery?.cooperative_nom && (
                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="mb-6 text-lg font-semibold text-gray-900">Expédition</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <Building2 className="mt-1 h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-xs font-medium text-gray-600">Coopérative</div>
                        <div className="mt-1 text-gray-900">{selectedDelivery.cooperative_nom}</div>
                      </div>
                    </div>
                    {selectedDelivery.cooperative_numero_suivi && (
                      <div className="flex items-start gap-3">
                        <Hash className="mt-1 h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-xs font-medium text-gray-600">N° de suivi</div>
                          <div className="mt-1 text-gray-900">{selectedDelivery.cooperative_numero_suivi}</div>
                        </div>
                      </div>
                    )}
                    {selectedDelivery.shipped_at && (
                      <div className="flex items-start gap-3">
                        <Clock className="mt-1 h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-xs font-medium text-gray-600">Expédié le</div>
                          <div className="mt-1 text-gray-900">{new Date(selectedDelivery.shipped_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ROW 3: Colis (bottom) */}
            {colisList.length > 0 && (
              <div className="lg:col-span-3 rounded-lg border bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">Colis</h2>
                  <span className="ml-auto text-sm text-gray-500">{colisList.length} colis</span>
                </div>
                <div className="space-y-3">
                  {colisList.map((c) => (
                    <ColisCardRow
                      key={c.id}
                      colis={c}
                      highlighted={false}
                      onSelect={() => {}}
                       onScan={canScan ? () => { setScanTargetUuid(c.uuid); setScanModalOpen(true); } : undefined}
                      scanStatuts={["deposited", "dispatched"]}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scan modal */}
      <Dialog open={scanModalOpen} onOpenChange={(open) => { if (!open) { clearCamera(); setScanModalOpen(false); setScanTargetUuid(null); setScanError("") } }}>
        <DialogContent className="sm:max-w-sm p-0 gap-0">
          <DialogTitle className="sr-only">Scanner le QR code du colis</DialogTitle>
          <div
            id={readerId}
            ref={readerRef}
            className="w-full overflow-hidden rounded-t-lg bg-black"
            style={{ minHeight: 320, maxHeight: 320 }}
          />
          <div className="px-4 py-3 space-y-2">
            {scanError ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <X className="h-4 w-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            ) : scanning ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recherche du QR code…
              </div>
            ) : (
              <p className="text-sm text-gray-500">Placez le QR code devant la caméra</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export default function FinaliserLivraisonPage() {
  return (
    <Suspense fallback={
      <DashboardLayout role="livreur">
        <div className="flex items-center justify-center min-h-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <FinaliserLivraisonContent />
    </Suspense>
  )
}
