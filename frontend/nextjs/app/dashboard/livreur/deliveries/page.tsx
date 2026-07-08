// @ts-nocheck

"use client"

import { livreurStatusMap } from "@/lib/statusMapping"
import { getStatusStyle } from "@/lib/statusStyles"

import { DashboardLayout } from "@/components/dashboard-layout"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogHeader,

  DialogTitle,

  DialogFooter,

} from "@/components/ui/dialog"

import { useAuth } from "@/context/auth-context"

import { Truck, MapPin, Phone, Eye, Play, Search, Filter, RefreshCw, CheckCircle, X, QrCode, Loader2, CheckCircle2, Send } from "lucide-react"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"

import { useRouter } from "next/navigation"

import { deliveriesApi, type Delivery } from "@/lib/deliveries-api"

import { useOrders } from "@/context/orders-context"

import { Html5Qrcode } from "html5-qrcode"

import { OrderCardList } from "@/components/orders/order-card-row"
import {
  getOrderNumberColumn,
  getDateColumn,
  getClientColumn,
  getProductsColumn,
  getAmountColumn,
} from "@/components/orders/order-columns"



// Plus besoin des statuts hardcodés - utilise le mapping centralisé



export default function LivreurDeliveriesPage() {

  const { user } = useAuth()

  const { refreshOrders } = useOrders()

  const router = useRouter()

  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [dateFilter, setDateFilter] = useState<string>("all")

  const [searchQuery, setSearchQuery] = useState("")

  const [currentPage, setCurrentPage] = useState(1)

  const [loading, setLoading] = useState(true)

  const itemsPerPage = 8



  // États pour les modals et la gestion des livraisons

  const [deliveries, setDeliveries] = useState<Delivery[]>([])

  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)

  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState("")
  const qrRef = useRef<Html5Qrcode | null>(null)
  const readerRef = useRef<HTMLDivElement | null>(null)
  const readerId = "livreur-delivery-scan-reader"
  const scanningRef = useRef(false)
  const [cooperativeDialogOpen, setCooperativeDialogOpen] = useState(false)
  const [pendingDeliveryForCoop, setPendingDeliveryForCoop] = useState<Delivery | null>(null)
  const [cooperativeNom, setCooperativeNom] = useState("")
  const [cooperativeSuivi, setCooperativeSuivi] = useState("")
  const [cooperativeShippedAt, setCooperativeShippedAt] = useState("")


  // Load deliveries on mount

  useEffect(() => {

    const loadDeliveries = async () => {

      setLoading(true)

      try {

        const data = await deliveriesApi.getMyDeliveries()

        setDeliveries(data || [])

      } catch (error) {

        console.error('Error loading deliveries:', error)

      } finally {

        setLoading(false)

      }

    }

    

    loadDeliveries()

  }, [])



  // Scroll to top when page changes

  useEffect(() => {

    window.scrollTo({ top: 0, behavior: 'smooth' })

  }, [currentPage])



  // QR Scanner effect — matches colis scanner pattern
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

  const handleDeliveryScanResult = useCallback(async (scannedValue: string) => {
    setScanError("")
    try {
      const delivery = await deliveriesApi.lookupByScan(scannedValue)
      if (delivery) {
        scanningRef.current = false
        setQrScannerOpen(false)
        router.push(`/dashboard/livreur/finaliser?id=${delivery.id}`)
      } else {
        setScanError(`Aucune livraison trouvée pour: ${scannedValue}`)
        scanningRef.current = false
        setTimeout(() => setScanError(""), 2000)
      }
    } catch {
      setScanError("Erreur lors de la recherche de la livraison")
      scanningRef.current = false
      setTimeout(() => setScanError(""), 2000)
    }
  }, [router])

  const startDeliveryCamera = useCallback(async () => {
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
          handleDeliveryScanResult(decodedText.trim())
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
  }, [stopCamera, handleDeliveryScanResult])

  useEffect(() => {
    if (qrScannerOpen) {
      const id = setTimeout(() => startDeliveryCamera(), 200)
      return () => clearTimeout(id)
    } else {
      clearCamera()
      setScanError("")
    }
  }, [qrScannerOpen, startDeliveryCamera, clearCamera])



  // Filter and sort deliveries

  const filteredDeliveries = useMemo(() => {

    let filtered = deliveries.filter((delivery) => {

      // Status filter (match by label so "Prête" catches prete)
      if (statusFilter !== "all") {
        const deliveryLabel = livreurStatusMap[delivery.status as keyof typeof livreurStatusMap]
        const filterLabel = livreurStatusMap[statusFilter as keyof typeof livreurStatusMap]
        if (deliveryLabel !== filterLabel) return false
      }



      // Date filter

      if (dateFilter !== "all") {

        const today = new Date()

        const deliveryDate = new Date(delivery.date_prevue)

        const tomorrow = new Date(today)

        tomorrow.setDate(today.getDate() + 1)

        const weekFromNow = new Date(today)

        weekFromNow.setDate(today.getDate() + 7)



        switch (dateFilter) {

          case "today":

            if (deliveryDate.toDateString() !== today.toDateString()) return false

            break

          case "tomorrow":

            if (deliveryDate.toDateString() !== tomorrow.toDateString()) return false

            break

          case "this-week":

            if (deliveryDate > weekFromNow) return false

            break

        }

      }



      // Search filter

      if (searchQuery) {

        const query = searchQuery.toLowerCase()

        const matchesOrder = delivery.orderNumber.toLowerCase().includes(query)

        const matchesClient = delivery.clientName.toLowerCase().includes(query)

        const matchesAddress = delivery.deliveryAddress?.toLowerCase().includes(query) || false

        if (!matchesOrder && !matchesClient && !matchesAddress) return false

      }



      return true

    })



    // Sort: "pending" first, then by date

    return filtered.sort((a, b) => {

      if (a.status === "pending" && b.status !== "pending") return -1

      if (a.status !== "pending" && b.status === "pending") return 1

      return new Date(a.date_prevue).getTime() - new Date(b.date_prevue).getTime()

    })

  }, [deliveries, statusFilter, dateFilter, searchQuery])



  // Pagination

  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage)

  const paginatedDeliveries = filteredDeliveries.slice(

    (currentPage - 1) * itemsPerPage,

    currentPage * itemsPerPage

  )



  const handleStartDelivery = async (delivery: Delivery) => {

    // Si pas de zone de livraison, demander les infos coopérative
    if (!delivery.zone_livraison_nom) {
      setPendingDeliveryForCoop(delivery)
      setCooperativeNom("")
      setCooperativeSuivi("")
      const now = new Date()
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      setCooperativeShippedAt(local)
      setCooperativeDialogOpen(true)
      return
    }

    const result = await deliveriesApi.startDelivery(delivery.id)

    if (result) {

      setDeliveries(prev => prev.map(d => d.id === delivery.id ? result : d))

    }

  }

  const handleStartDeliveryWithCoop = async () => {
    if (!pendingDeliveryForCoop || !cooperativeShippedAt) return
    const result = await deliveriesApi.sauvegarderExpedition(pendingDeliveryForCoop.id, {
      cooperative_nom: cooperativeNom.trim(),
      cooperative_numero_suivi: cooperativeSuivi.trim() || undefined,
      shipped_at: new Date(cooperativeShippedAt).toISOString(),
    })
    if (result) {
      setDeliveries(prev => prev.map(d => d.id === pendingDeliveryForCoop!.id ? result : d))
    }
    setCooperativeDialogOpen(false)
    setPendingDeliveryForCoop(null)
  }



  const handleFinalizeDelivery = (delivery: Delivery) => {

    router.push(`/dashboard/livreur/finaliser?id=${delivery.id}`)

  }



  const handleOpenQrScanner = async () => {

    try {

      // Check if camera is available

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

        alert("Votre navigateur ne supporte pas l'accès à la caméra. Utilisez un navigateur moderne comme Chrome, Firefox, Safari ou Edge.")

        return

      }



      // Request camera permission

      const stream = await navigator.mediaDevices.getUserMedia({

        video: { facingMode: "environment" }

      })



      // Stop the test stream

      stream.getTracks().forEach(track => track.stop())



      // Open scanner modal

      setQrScannerOpen(true)

    } catch (err) {

      const error = err as Error

      if (error.name === 'NotAllowedError') {

        alert("Vous avez refusé l'accès à la caméra. Veuillez accepter la permission pour utiliser le scanner QR.")

      } else if (error.name === 'NotFoundError') {

        alert("Aucune caméra trouvée sur cet appareil.")

      } else {

        alert("Erreur lors de l'accès à la caméra: " + error.message)

      }

    }

  }





  const resetFilters = () => {

    setStatusFilter("all")

    setDateFilter("all")

    setSearchQuery("")

    setCurrentPage(1)

  }



  const refreshDeliveries = async () => {

    setLoading(true)

    try {

      const data = await deliveriesApi.getMyDeliveries()

      setDeliveries(data || [])

    } catch (error) {

      console.error('Error refreshing deliveries:', error)

    } finally {

      setLoading(false)

    }

  }



  return (

    <DashboardLayout role="livreur">

      <div className="space-y-6">

        <div>

          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Mes livraisons</h1>

          <p className="mt-1 text-muted-foreground">

            Gérez toutes vos livraisons assignées.

          </p>

        </div>



        {/* QR Scanner Modal - Compact, matching colis scanner */}
        <Dialog open={qrScannerOpen} onOpenChange={(open) => { if (!open) { clearCamera(); setQrScannerOpen(false); setScanError("") } }}>
          <DialogContent className="sm:max-w-sm p-0 gap-0">
            <DialogTitle className="sr-only">Scanner le QR code pour voir le détail de la commande</DialogTitle>
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

        {/* Cooperative Dialog (for deliveries without zone) */}
        <Dialog open={cooperativeDialogOpen} onOpenChange={setCooperativeDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Expédition</DialogTitle>

            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="coop-nom" className="text-sm font-medium">Nom de la coopérative</Label>
                <Input
                  id="coop-nom"
                  value={cooperativeNom}
                  onChange={(e) => setCooperativeNom(e.target.value)}
                  placeholder="Ex: Cotisse, Soatrans..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="coop-suivi" className="text-sm font-medium">Numéro de suivi (optionnel)</Label>
                <Input
                  id="coop-suivi"
                  value={cooperativeSuivi}
                  onChange={(e) => setCooperativeSuivi(e.target.value)}
                  placeholder="Numéro de bordereau ou tracking"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="coop-date" className="text-sm font-medium">Expédié le</Label>
                <Input
                  id="coop-date"
                  type="datetime-local"
                  value={cooperativeShippedAt}
                  onChange={(e) => setCooperativeShippedAt(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCooperativeDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleStartDeliveryWithCoop} disabled={!cooperativeNom.trim() || !cooperativeShippedAt}>
                <Send className="h-4 w-4 mr-2" /> Expédier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher par N° commande ou client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 bg-background border-border/60 focus-visible:border-primary"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border/60 focus:ring-primary/20">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {Array.from(
                      new Map(
                        Object.entries(livreurStatusMap)
                          .filter(([, label]) => label !== null)
                          .map(([status, label]) => [label, status])
                      )
                    ).map(([label, status]) => (
                      <SelectItem key={status} value={status}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-[160px] bg-background border-border/60 focus:ring-primary/20">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="tomorrow">Demain</SelectItem>
                    <SelectItem value="this-week">Cette semaine</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenQrScanner}
                  className="h-10 w-10 shrink-0"
                  title="Scanner QR"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={refreshDeliveries}
                  disabled={loading}
                  className="h-10 w-10 shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Deliveries Table */}

        <Card className="border-0 shadow-md">

          <CardHeader className="bg-linear-to-r from-[#fef3c7]/60 to-[#fffbeb] dark:from-amber-900/30 dark:to-amber-950/20 border-b flex flex-row items-center justify-between">

            <CardTitle className="font-serif text-lg">Livraisons ({filteredDeliveries.length})</CardTitle>

            {filteredDeliveries.length > 0 && (

              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">

                Page {currentPage} / {totalPages}

              </span>

            )}

          </CardHeader>

          <CardContent>

            {loading ? (

              <div className="space-y-3">

                {[...Array(5)].map((_, i) => (

                  <div key={i} className="h-16 bg-secondary/30 rounded animate-pulse" />

                ))}

              </div>

            ) : filteredDeliveries.length === 0 ? (

              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">

                <Truck className="h-12 w-12 mb-3 opacity-50" />

                <p>Aucune livraison trouvée</p>

              </div>

            ) : (

              <>

                <OrderCardList

                  columns={[
                    getOrderNumberColumn(),
                    getDateColumn(),
                    getClientColumn(),
                    getProductsColumn(),
                    getAmountColumn(),
                    {
                      key: "status",
                      header: "Statut",
                      desktop: "1.8fr",
                      render: (item: Delivery) => {
                        const st = String(item.status || item.statut || "").toLowerCase().trim()
                        const style = getStatusStyle(st, "admin")
                        return (
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${style.color || "bg-gray-300"}`} />
                            <span className="text-sm font-medium text-gray-700 truncate">{style.label || st}</span>
                            {(st === "prete") && (
                              <Button
                                size="sm"
                                className={`ml-auto text-white text-xs h-7 px-2 ${!item.zone_livraison_nom ? "bg-amber-700 hover:bg-amber-800" : "bg-blue-600 hover:bg-blue-700"}`}
                                onClick={(e) => { e.stopPropagation(); handleStartDelivery(item) }}
                              >
                                {!item.zone_livraison_nom ? "Expédier" : "Démarrer"}
                              </Button>
                            )}
                          </div>
                        )
                      },
                    },
                  ]}

                  data={paginatedDeliveries.map((d: Delivery) => ({ ...d, createdAt: d.date_creation || d.date_prevue }))}

                  rowKey="id"

                  onRowClick={(delivery: Delivery) => router.push(`/dashboard/livreur/finaliser?id=${delivery.id}`)}

                  className="bg-white"

                  maxHeight="none"

                />

                {totalPages > 1 && (

                  <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50 mt-0">

                    <p className="text-sm text-gray-500">

                      Page {currentPage} sur {totalPages}

                    </p>

                    <div className="flex gap-2">

                      <Button

                        variant="outline"

                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}

                        disabled={currentPage === 1}

                      >

                        Précédent

                      </Button>

                      <Button

                        variant="outline"

                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}

                        disabled={currentPage === totalPages}

                      >

                        Suivant

                      </Button>

                    </div>

                  </div>

                )}

              </>

            )}

          </CardContent>

        </Card>



      </div>

    </DashboardLayout>

  )

}

