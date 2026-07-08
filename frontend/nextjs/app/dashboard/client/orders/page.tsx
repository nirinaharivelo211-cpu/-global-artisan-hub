// @ts-nocheck
"use client"

export const dynamic = 'force-dynamic'

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Search, SlidersHorizontal } from "lucide-react"
import { format } from "date-fns"
import { ordersApi } from "@/lib/api-client"
import { OrderStatus } from "@/lib/statusMapping"
import { OrderCardList } from "@/components/orders/order-card-row"
import { getColumnSet } from "@/components/orders/order-columns"

type Product = {
  id: string
  name: string
  image: string
  price: number | string
  quantity: number
  artisan: string
}

type Order = {
  id: string
  orderNumber: string
  clientName: string
  createdAt: string | Date
  products: Product[]
  amount: number | string
  status: string
  deliveryAddress?: string
}

// Regrouper les statuts par label unique pour éviter les doublons dans le filtre
const statusGroups: Record<string, OrderStatus[]> = {
  "En attente": ["pending"],
  "Confirmée": ["confirmed"],
  "En attente de paiement": ["awaiting_payment"],
  "En préparation": ["preparing"],
  "En livraison": ["in_delivery"],
  "Livrée": ["delivered"],
  "Annulée": ["cancelled"],
  "Retournée": ["returned"],
  "Échec": ["echec"],
}

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  ...Object.entries(statusGroups).map(([label, statuses]) => ({
    value: statuses.join(","),
    label,
  })),
]

const dateFilterOptions = [
  { value: "all", label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "custom", label: "Personnalisé" },
]

export default function ClientOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Filtres
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [customDateOpen, setCustomDateOpen] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await ordersApi.fetchOrders()
        if (response.success && response.data && response.data.length > 0) {
          // Garder les statuts bruts pour le mapping centralisé
          setOrders(response.data)
        } else {
          // Pas de données mockées - rester vide
          setOrders([])
        }
      } catch (err) {
        // Pas de données mockées en cas d'erreur - rester vide
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  // Filtrage des commandes
  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Filtre par statut (gère les groupes de statuts séparés par des virgules)
    if (statusFilter !== "all") {
      const allowedStatuses = statusFilter.split(",")
      filtered = filtered.filter(order => allowedStatuses.includes(order.status))
    }

    // Filtre par date
    if (dateFilter !== "all") {
      const now = new Date()
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt)

        switch (dateFilter) {
          case "today":
            return orderDate.toDateString() === now.toDateString()
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return orderDate >= weekAgo
          case "month":
            const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
            return orderDate >= monthAgo
          case "custom":
            return customDate ? orderDate.toDateString() === customDate.toDateString() : true
          default:
            return true
        }
      })
    }

    // Recherche par numéro de commande
    if (searchQuery.trim()) {
      filtered = filtered.filter(order =>
        String(order.id).toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, statusFilter, dateFilter, searchQuery, customDate])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <DashboardLayout role="client">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Mes commandes</h1>
          <p className="mt-1 text-muted-foreground">Consultez et gérez l&apos;historique complet de vos commandes.</p>
        </div>

        {/* Filtres */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border/60 focus:ring-primary/20">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={(value) => {
                  setDateFilter(value)
                  if (value !== "custom") setCustomDate(undefined)
                }}>
                  <SelectTrigger className="h-10 w-full sm:w-[170px] bg-background border-border/60 focus:ring-primary/20">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dateFilter === "custom" && (
                  <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-10 w-full sm:w-[160px] justify-start text-left font-normal bg-background border-border/60"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {customDate ? format(customDate, "dd/MM/yyyy") : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDate}
                        onSelect={(date) => { setCustomDate(date); setCustomDateOpen(false) }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="N° commande..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 bg-background border-border/60 focus-visible:border-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des commandes */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-linear-to-r from-[#fef3c7]/60 to-[#fffbeb] dark:from-amber-900/30 dark:to-amber-950/20 border-b">
            <CardTitle className="font-serif text-lg">
              Historique des commandes ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <OrderCardList
                  columns={getColumnSet("admin")}
                  data={paginatedOrders}
                  rowKey="id"
                  onRowClick={(order) => router.push(`/dashboard/client/orders/${order.id}`)}
                  className="bg-white"
                  maxHeight="none"
                  emptyMessage="Aucune commande pour l'instant"
                />

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                    <p className="text-sm text-gray-500">
                      Page {currentPage} sur {totalPages} ({filteredOrders.length} commandes)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
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
