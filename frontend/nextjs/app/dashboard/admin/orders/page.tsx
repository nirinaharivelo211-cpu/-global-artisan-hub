// @ts-nocheck
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Plus, Package, TrendingUp, Users, ShoppingCart, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ordersApi, hubsApi } from "@/lib/api-client"
import { API_BASE_URL } from "@/lib/api-config"
import { getStatusStyle } from "@/lib/statusStyles"
import { adminStatusMap, OrderStatus } from "@/lib/statusMapping"
import { OrderCardList } from "@/components/orders/order-card-row"
import { getColumnSet } from "@/components/orders/order-columns"

const ITEMS_PER_PAGE = 10

// Regrouper les statuts par label unique pour éviter les doublons dans le filtre
const statusGroups: Record<string, OrderStatus[]> = {
  "En attente": ["pending"],
  "Confirmée": ["confirmed"],
  "En attente de paiement": ["awaiting_payment"],
  "En préparation": ["preparing"],
  "Prête": ["prete"],
  "Expédiée": ["forwarded"],
  "En livraison": ["in_delivery"],
  "Livrée": ["delivered"],
  "Annulée": ["cancelled"],
  "Retournée": ["returned"],
  "Échec": ["echec"],
}

const getStatusBadge = (status: string) => {
  const style = getStatusStyle(status, 'admin');
  
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${style.color}`} />
      <span className="text-base font-semibold text-gray-900">{style.label}</span>
    </div>
  );
}

export default function OrdersManagementPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [hubs, setHubs] = useState<any[]>([])
  const [hubFilter, setHubFilter] = useState("all")

  useEffect(() => {
    hubsApi.fetchHubs().then((res) => {
      if (res.success && res.data) setHubs(res.data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const response = await ordersApi.fetchOrders()
        if (response.success && response.data) {
          // Transform API data to match the page's expected format
          const transformedOrders = response.data.map((order: any) => {
            const products = order.products || []
            const productCount = order.productCount ?? products.reduce((s:any,p:any)=> s + (p.quantity||0), 0)
            return {
              // keep the raw database id for routing; display orderNumber separately
              id: order.id,
              number: (() => {
                const orderNum = order.orderNumber || order.id
                return !String(orderNum).startsWith('CMD')
                  ? `CMD${String(orderNum).padStart(4, '0')}`
                  : orderNum
              })(),
              client: order.clientName,
              clientPhoto: order.clientPhoto,
              clientPhone: order.clientPhone,
              date: order.createdAt,
              time: new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              amount: Number(order.amount) || 0,
              status: order.status || '',
              products,
              productCount,
              hubId: order.hub_destination || null,
            }
          })
          setOrders(transformedOrders)
        }
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const idString = String(order.number || order.id)
        const matchesSearch =
          idString.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.client.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === "all" || statusFilter.split(",").includes(order.status)
        const matchesHub = hubFilter === "all" || order.hubId === Number(hubFilter)
        return matchesSearch && matchesStatus && matchesHub
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [orders, searchQuery, statusFilter, hubFilter])

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Gérer les commandes</h1>
          <p className="mt-1 text-muted-foreground">Gestion complète de toutes les commandes</p>
        </div>

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
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border/60 focus:ring-primary/20">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {Object.entries(statusGroups).map(([label, statuses]) => (
                      <SelectItem key={label} value={statuses.join(",")}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={hubFilter} onValueChange={setHubFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border/60 focus:ring-primary/20">
                    <SelectValue placeholder="Hub" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les hubs</SelectItem>
                    {hubs.map((hub) => (
                      <SelectItem key={hub.id} value={String(hub.id)}>
                        {hub.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-linear-to-r from-[#fef3c7]/60 to-[#fffbeb] dark:from-amber-900/30 dark:to-amber-950/20 border-b">
            <CardTitle className="font-serif text-lg">
              Commandes ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {currentOrders.length === 0 && <div className="text-center py-12 text-muted-foreground">Aucune commande</div>}
            {currentOrders.length > 0 && (
              <>
                <OrderCardList
                  columns={getColumnSet("admin")}
                  data={currentOrders}
                  rowKey="id"
                  onRowClick={(order) => router.push(`/dashboard/admin/orders/${order.id}`)}
                  className="bg-white"
                  maxHeight="none"
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                    <p className="text-sm text-gray-500">
                      Page {currentPage} sur {totalPages} ({filteredOrders.length} commandes)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
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
