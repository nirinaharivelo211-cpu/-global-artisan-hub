"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OrderCardList } from "@/components/orders/order-card-row"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2, CreditCard, Search, SlidersHorizontal, XCircle } from "lucide-react"
import { useAppToast } from "@/context/toast-context"
import { useAuth } from "@/context/auth-context"
import { REGIONS } from "@/lib/madagascar-data"
import { demandesPaiementApi, hubsApi } from "@/lib/api-client"

export default function AdminPaiementsPage() {
  const { addToast } = useAppToast()
  const { user } = useAuth()
  const [demandes, setDemandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [referencePaiement, setReferencePaiement] = useState("")
  const [confirmed, setConfirmed] = useState<"paid" | "rejected" | null>(null)
  const [hubs, setHubs] = useState<any[]>([])
  const [hubFilter, setHubFilter] = useState("all")
  const [regionFilter, setRegionFilter] = useState("all")

  const isManager = user?.role === "manager"

  useEffect(() => {
    loadDemandes()
    hubsApi.fetchHubs().then((res) => {
      if (res.success && res.data) setHubs(res.data)
    })
  }, [])

  const loadDemandes = async () => {
    setLoading(true)
    const res = await demandesPaiementApi.list()
    if (res.success) setDemandes(res.data)
    setLoading(false)
  }

  const filteredDemandes = demandes.filter((d: any) => {
    const matchFilter = filter === "all" || d.statut === filter
    const matchHub = hubFilter === "all" || String(d.hub) === hubFilter
    const matchRegion = regionFilter === "all" || d.artisan_region === regionFilter
    if (!matchFilter || !matchHub || !matchRegion) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      (d.artisan_nom || "").toLowerCase().includes(q) ||
      (d.reference_paiement || "").toLowerCase().includes(q) ||
      parseFloat(d.montant).toLocaleString("fr-FR").includes(q)
    )
  })

  const openModal = (d: any) => {
    if (d.statut !== "pending") return
    setSelectedId(d.id)
    setShowRejectReason(false)
    setRejectReason("")
    setReferencePaiement("")
    setConfirmed(null)
  }

  const selected = selectedId !== null ? demandes.find((d: any) => d.id === selectedId) : null

  const handleConfirm = async () => {
    if (!selectedId || !referencePaiement.trim()) return
    setSubmitting(true)
    const res = await demandesPaiementApi.payer(selectedId, { reference_paiement: referencePaiement, mode_paiement: "MVola" })
    setSubmitting(false)
    if (res.success) {
      setConfirmed("paid")
      loadDemandes()
    } else {
      addToast({ title: "Erreur", description: res.error || "Erreur", variant: "error" })
    }
  }

  const handleReject = async () => {
    if (!selectedId) return
    setSubmitting(true)
    const res = await demandesPaiementApi.rejeter(selectedId, { raison: rejectReason })
    setSubmitting(false)
    if (res.success) {
      setConfirmed("rejected")
      loadDemandes()
    } else {
      addToast({ title: "Erreur", description: res.error || "Erreur", variant: "error" })
    }
  }

  const mmLabel: Record<string, string> = {
    mvola: "MVola",
    airtel: "Airtel Money",
    orange: "Orange Money",
  }

  return (
    <DashboardLayout role={isManager ? "manager" : "admin"}>
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Paiements</h1>
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadDemandes() }}>
              <Loader2 className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>

          {/* Filtres */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Rechercher par nom, référence..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-9 bg-background border-border/60"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="paid">Payées</SelectItem>
                      <SelectItem value="rejected">Refusées</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select value={hubFilter} onValueChange={(v) => { setHubFilter(v); setRegionFilter("all") }}>
                    <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border/60">
                      <SelectValue placeholder="Tous les hubs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les hubs</SelectItem>
                      {hubs.map((h: any) => (
                        <SelectItem key={h.id} value={String(h.id)}>{h.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); setHubFilter("all") }}>
                    <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border/60">
                      <SelectValue placeholder="Toutes les régions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les régions</SelectItem>
                      {REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tableau */}
          <Card className="overflow-hidden border shadow-md shadow-black/10">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDemandes.length === 0 ? (
                <div className="p-8 text-center">
                  <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Aucune demande de paiement.</p>
                </div>
              ) : (
                <OrderCardList
                  columns={[
                    { key: "date", header: "Date", desktop: "1fr", render: (d: any) => <span className="ml-2">{new Date(d.date_demande).toLocaleDateString("fr-FR")}</span> },
                    { key: "artisan", header: "Artisan", desktop: "1.5fr", render: (d: any) => d.artisan_nom || "-" },
                    {
                      key: "mm", header: "Mobile Money", desktop: "1.8fr", render: (d: any) => (
                        <div>
                          <span className={d.mode_paiement_artisan === "mvola" ? "text-yellow-600" : d.mode_paiement_artisan === "airtel" ? "text-red-600" : "text-orange-600"}>
                            {mmLabel[d.mode_paiement_artisan] || "-"}
                          </span>
                          {d.reference_mm && <span className="block text-[11px] text-muted-foreground">+261 {d.reference_mm}</span>}
                        </div>
                      )
                    },
                    { key: "montant", header: "Montant", desktop: "1fr", render: (d: any) => `${parseFloat(d.montant).toLocaleString("fr-FR")} Ar` },
                    { key: "ref", header: "Référence", desktop: "1.2fr", render: (d: any) => d.reference_paiement || <span className="text-muted-foreground">-----</span> },
                    {
                      key: "statut", header: "Statut", desktop: "1fr", render: (d: any) => (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${
                            d.statut === "paid" ? "bg-emerald-500" :
                            d.statut === "rejected" ? "bg-red-500" :
                            "bg-gray-400"
                          }`} />
                          {d.statut === "paid" ? "Payé" :
                           d.statut === "rejected" ? "Refusé" :
                           "En attente"}
                        </span>
                      )
                    },
                  ]}
                  data={filteredDemandes}
                  rowKey="id"
                  onRowClick={openModal}
                  maxHeight="500px"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal traitement */}
      <Dialog open={selectedId !== null} onOpenChange={(open) => { if (!open) { setSelectedId(null); setShowRejectReason(false); setConfirmed(null) } }}>
        <DialogContent className="shadow-lg shadow-black/10">
          <DialogHeader>
            <DialogTitle className="text-foreground font-bold">
              {confirmed === "paid" ? "Paiement confirmé" :
               confirmed === "rejected" ? "Demande refusée" :
               "Traiter la demande"}
            </DialogTitle>
            {selected && (
              <p className="text-sm text-muted-foreground mt-1">
                {selected.artisan_nom} — {parseFloat(selected.montant).toLocaleString("fr-FR")} Ar
              </p>
            )}
          </DialogHeader>

          {selected && selected.mode_paiement_artisan && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={selected.mode_paiement_artisan === "mvola" ? "text-yellow-600 font-medium" : selected.mode_paiement_artisan === "airtel" ? "text-red-600 font-medium" : "text-orange-600 font-medium"}>
                  {mmLabel[selected.mode_paiement_artisan] || selected.mode_paiement_artisan}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Numéro</span>
                <span className="font-medium text-foreground">+261 {selected.reference_mm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Titulaire</span>
                <span className="font-medium text-foreground">{selected.titulaire_mm}</span>
              </div>
              {confirmed === "paid" && (
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Référence</span>
                  <span className="font-medium text-emerald-600">{referencePaiement}</span>
                </div>
              )}
              {confirmed === "rejected" && rejectReason && (
                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground block mb-0.5">Raison du refus</span>
                  <span className="text-red-600">{rejectReason}</span>
                </div>
              )}
            </div>
          )}

          {!confirmed && !showRejectReason && (
            <div className="space-y-3">
              <Label className="text-foreground">Référence de paiement</Label>
              <Input
                value={referencePaiement}
                onChange={(e) => setReferencePaiement(e.target.value)}
                placeholder="Ex: MVOLA-20260523"
                disabled={submitting}
              />
            </div>
          )}

          {!confirmed && showRejectReason && (
            <div className="space-y-3">
              <Label className="text-foreground">Raison du refus</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez pourquoi cette demande est refusée..."
                rows={3}
                disabled={submitting}
              />
            </div>
          )}

          {confirmed && (
            <div className={`rounded-lg p-4 text-center text-sm font-medium ${
              confirmed === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>
              {confirmed === "paid" ? "✓ Paiement enregistré avec succès" : "✗ Demande refusée"}
            </div>
          )}

          <DialogFooter className="gap-2">
            {!confirmed && isManager ? (
              !showRejectReason ? (
                <>
                  <Button variant="destructive" onClick={() => setShowRejectReason(true)} disabled={submitting}>
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Refuser
                  </Button>
                  <Button onClick={handleConfirm} disabled={submitting || !referencePaiement.trim()}>
                    {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CreditCard className="mr-1.5 h-4 w-4" />}
                    Confirmer le paiement
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setShowRejectReason(false)} disabled={submitting}>
                    Annuler
                  </Button>
                  <Button variant="destructive" onClick={handleReject} disabled={submitting}>
                    {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    Confirmer le refus
                  </Button>
                </>
              )
            ) : (
              <Button onClick={() => { setSelectedId(null); setConfirmed(null) }}>
                Fermer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
