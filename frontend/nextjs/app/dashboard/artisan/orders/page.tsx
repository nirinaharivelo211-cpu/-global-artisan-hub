// @ts-nocheck
"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useOrders } from "@/context/orders-context"
import { useProducts } from "@/context/products-context"
import { useAuth } from "@/context/auth-context"
import { OrderCardList } from "@/components/orders/order-card-row"
import { getColumnSet } from "@/components/orders/order-columns"
import type { OrderStatus } from "@/lib/statusMapping"

const ITEMS_PER_PAGE = 10

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

export default function ArtisanOrdersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { orders, loading } = useOrders()
  const { getProductsByArtisan } = useProducts()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

  const myProducts = user ? getProductsByArtisan(user.id) : []

  const artisanOrders = useMemo(() => {
    return orders
      .filter((order) =>
        order.products.some((product: any) =>
          myProducts.some((myProduct: any) => String(myProduct.id) === String((product as any).id))
        )
      )
      .map((order: any) => {
        const artisanProducts = order.products.filter((product: any) => {
          const productInfo = myProducts.find((p: any) => String(p.id) === String((product as any).id))
          return productInfo !== undefined
        })
        const artisanAmount = artisanProducts.reduce((sum: number, product: any) => {
          if (product.fulfillmentStatus === "unavailable") return sum
          return sum + (Number(product.price) || 0) * (product.quantity || 1)
        }, 0)
        const orderNum = order.orderNumber || order.id
        const displayNumber = !String(orderNum).startsWith("CMD")
          ? `CMD${String(orderNum).padStart(4, "0")}`
          : orderNum
        return {
          id: order.id,
          number: displayNumber,
          orderNumber: displayNumber,
          client: order.clientName,
          clientName: order.clientName,
          clientPhoto: order.clientPhoto,
          clientPhone: order.clientPhone,
          date: order.createdAt,
          createdAt: order.createdAt,
          amount: artisanAmount,
          status: order.status,
          products: artisanProducts,
          productCount: artisanProducts.reduce((s: any, p: any) => s + (p.quantity || 0), 0),
        }
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [orders, myProducts])

  const filteredOrders = useMemo(() => {
    return artisanOrders.filter((order: any) => {
      const idString = String(order.number || order.id)
      const matchesSearch =
        idString.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.client && order.client.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesStatus = statusFilter === "all" || statusFilter.split(",").includes(order.status)
      return matchesSearch && matchesStatus
    })
  }, [artisanOrders, searchQuery, statusFilter])

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <DashboardLayout role="artisan">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Mes commandes</h1>
          <p className="mt-1 text-muted-foreground">Commandes contenant vos produits</p>
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
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-linear-to-r from-[#fef3c7]/60 to-[#fffbeb] dark:from-amber-900/30 dark:to-amber-950/20 border-b">
            <CardTitle className="font-serif text-lg">
              Commandes ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : currentOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Aucune commande</div>
            ) : (
              <>
                <OrderCardList
                  columns={getColumnSet("admin")}
                  data={currentOrders}
                  rowKey="id"
                  onRowClick={(order: any) => router.push(`/dashboard/artisan/orders/${order.id}`)}
                  className="bg-white"
                  maxHeight="none"
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
