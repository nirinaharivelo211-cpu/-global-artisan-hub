// @ts-nocheck
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Truck, Wallet, ClipboardList, Package, RefreshCw, Target, TrendingUp, MapPin, Send, Loader2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useAppToast } from "@/context/toast-context"
import { deliveriesApi, type Delivery, type GroupedDeliveries } from "@/lib/deliveries-api"
import { getStatusStyle } from "@/lib/statusStyles"
import { OrderCardList } from "@/components/orders/order-card-row"
import { getOrderNumberColumn, getDateColumn, getClientColumn, getProductsColumn, getAmountColumn } from "@/components/orders/order-columns"
import { StatCard } from "@/components/ui/stat-card"
import { AnimatedCounter } from "@/components/animated-counter"

export default function LivreurDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [grouped, setGrouped] = useState<GroupedDeliveries | null>(null)
  const [stats, setStats] = useState({
    assigned_today: 0,
    in_delivery_count: 0,
    completed_this_month: 0,
    total_collected_this_month: 0,
    success_rate: 0,
    to_collect_count: 0,
    quota_quotidien: 8,
    charge_aujourdhui: 0,
    zones: [] as { id: number; nom: string; hub_nom: string | null }[],
  })
  const [loading, setLoading] = useState(true)
  const [expDialogOpen, setExpDialogOpen] = useState(false)
  const [expDelivery, setExpDelivery] = useState<Delivery | null>(null)
  const [expCoop, setExpCoop] = useState("")
  const [expSuivi, setExpSuivi] = useState("")
  const [expShippedAt, setExpShippedAt] = useState("")
  const [expSaving, setExpSaving] = useState(false)
  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      const [groupedData, statsData] = await Promise.all([
        deliveriesApi.getGroupedByStatus(),
        deliveriesApi.getStats(),
      ])
      if (groupedData) setGrouped(groupedData)
      if (statsData) setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()
    const interval = setInterval(loadAllData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadAllData])

  const { addToast } = useAppToast()

  const handleStartDelivery = useCallback(async (delivery: Delivery) => {
    if (!delivery.zone_livraison_nom) {
      setExpDelivery(delivery)
      setExpCoop("")
      setExpSuivi("")
      const now = new Date()
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      setExpShippedAt(local)
      setExpDialogOpen(true)
      return
    }
    const result = await deliveriesApi.startDelivery(delivery.id)
    if (result) {
      addToast({ title: "Livraison démarrée", description: "La livraison est en cours." })
      loadAllData()
    } else {
      addToast({ title: "Erreur", description: "Impossible de démarrer la livraison.", variant: "error" })
    }
  }, [loadAllData, addToast])

  const handleExpedition = useCallback(async () => {
    if (!expDelivery || !expCoop.trim() || !expShippedAt) return
    setExpSaving(true)
    try {
      const result = await deliveriesApi.sauvegarderExpedition(expDelivery.id, {
        cooperative_nom: expCoop.trim(),
        cooperative_numero_suivi: expSuivi.trim() || undefined,
        shipped_at: new Date(expShippedAt).toISOString(),
      })
      if (result) {
        addToast({ title: "Expédié", description: "La commande a été expédiée.", variant: "success" })
        setExpDialogOpen(false)
        setExpDelivery(null)
        loadAllData()
      } else {
        addToast({ title: "Erreur", description: "Impossible d'expédier la commande.", variant: "error" })
      }
    } catch {
      addToast({ title: "Erreur", description: "Impossible d'expédier la commande.", variant: "error" })
    } finally {
      setExpSaving(false)
    }
  }, [expDelivery, expCoop, expSuivi, expShippedAt, loadAllData, addToast])

  const allDeliveries = useMemo(() => {
    if (!grouped) return []
    const lists = [grouped.in_delivery || [], grouped.delivered || [], grouped.failed || [], grouped.to_collect || []]
    return lists.flat()
  }, [grouped])

  return (
    <DashboardLayout role="livreur">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Tableau de bord</h1>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            label="À livrer"
            value={stats.assigned_today + stats.to_collect_count}
            subtitle="Livraisons en attente"
            badge={stats.assigned_today + stats.to_collect_count > 5 ? "Urgent" : undefined}
          />
          <StatCard
            icon={Truck}
            label="En cours"
            value={stats.in_delivery_count}
            subtitle="Livraisons actives"
          />
          <StatCard
            icon={Target}
            label="Taux de réussite"
            value={stats.success_rate}
            suffix="%"
            decimals={0}
            subtitle="Livraisons réussies"
          >
            <div className="flex items-center gap-1 text-xs text-amber-700 font-medium">
              <TrendingUp className="h-3 w-3 text-amber-600" />
              <span>{stats.completed_this_month} ce mois</span>
            </div>
          </StatCard>
          <StatCard
            icon={Wallet}
            label="Total encaissé"
            value={stats.total_collected_this_month}
            prefix="Ar "
            subtitle="Montant collecté ce mois"
          />
        </div>

        {/* Quota du jour — barre full-width */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 shadow-lg shadow-amber-900/30 ring-1 ring-amber-600/20">
                  <TrendingUp className="h-4 w-4 text-white/90 drop-shadow" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">Quota du jour</p>
                  <p className="text-xs text-stone-500">
                    <AnimatedCounter value={stats.charge_aujourdhui} /> / <AnimatedCounter value={stats.quota_quotidien} /> livraisons
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-stone-900">
                  <AnimatedCounter value={stats.quota_quotidien > 0 ? Math.round(stats.charge_aujourdhui / stats.quota_quotidien * 100) : 0} suffix="%" />
                </p>
              </div>
            </div>
            <div className="mt-3 h-2.5 w-full rounded-full bg-stone-100 ring-1 ring-inset ring-stone-200/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 transition-all duration-1000 ease-out"
                style={{ width: `${stats.quota_quotidien > 0 ? Math.min(stats.charge_aujourdhui / stats.quota_quotidien * 100, 100) : 0}%` }}
              />
            </div>
          </div>
          {/* Mini ticks */}
          <div className="relative h-1.5 bg-stone-50 border-t">
            {[25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute top-0 h-full w-px bg-stone-200"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>
          {stats.zones && stats.zones.length > 0 && (
            <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border-t border-stone-100 bg-stone-50/50">
              <MapPin className="h-3.5 w-3.5 text-stone-500 shrink-0" />
              <span className="text-xs font-medium text-stone-600 shrink-0">Zones :</span>
              <div className="flex flex-wrap gap-1.5">
                {stats.zones.map((z) => (
                  <span
                    key={z.id}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-br from-amber-100 to-amber-50 text-amber-800 border border-amber-200/60 shadow-sm"
                  >
                    {z.nom}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Liste complete des livraisons */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Mes livraisons</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAllData}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Actualiser
              </Button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-secondary/30 animate-pulse" />
                ))}
              </div>
            ) : allDeliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">Aucune livraison</p>
              </div>
            ) : (
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
                data={allDeliveries.map((d: Delivery) => ({ ...d, createdAt: d.date_creation || d.date_prevue }))}
                rowKey="id"
                onRowClick={(d: Delivery) => router.push(`/dashboard/livreur/finaliser?id=${d.id}`)}
                className="bg-white"
                maxHeight="none"
                emptyMessage="Aucune livraison"
              />
            )}
          </CardContent>
        </Card>

      </div>

      {/* Expedition modal for hors zone */}
      <Dialog open={expDialogOpen} onOpenChange={setExpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Expédition</DialogTitle>
  
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exp-coop">Nom de la coopérative</Label>
              <Input id="exp-coop" value={expCoop} onChange={(e) => setExpCoop(e.target.value)} placeholder="Ex: Cotisse, Soatrans..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-suivi">Numéro de suivi (optionnel)</Label>
              <Input id="exp-suivi" value={expSuivi} onChange={(e) => setExpSuivi(e.target.value)} placeholder="Numéro de bordereau ou tracking" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-date">Expédié le</Label>
              <Input id="exp-date" type="datetime-local" value={expShippedAt} onChange={(e) => setExpShippedAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpDialogOpen(false)} disabled={expSaving}>Annuler</Button>
            <Button onClick={handleExpedition} disabled={!expCoop.trim() || !expShippedAt || expSaving}>
              {expSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {expSaving ? "Expédition..." : "Expédier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
