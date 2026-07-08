// @ts-nocheck
"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Plus, Package, TrendingUp, Users, ShoppingCart, AlertCircle, Star, RefreshCw, ExternalLink } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useReviews } from "@/context/reviews-context"
import { useProducts } from "@/context/products-context"
import { useOrders } from "@/context/orders-context"
import { DynamicStars } from "@/components/dynamic-stars"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { StatCardSkeleton, TableSkeleton } from "@/components/dashboard-skeletons"
import { useState, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { OrderCardList } from "@/components/orders/order-card-row"
import { getColumnSet } from "@/components/orders/order-columns"
import { StatCard } from "@/components/ui/stat-card"

export default function ArtisanDashboard() {
  const { user } = useAuth()
  const { getProductsByArtisan } = useProducts()
  const { orders, loading: ordersLoading, fetchOrders } = useOrders()
  const { reviews, loading: reviewsLoading, averageRating } = useReviews()
  const { toast } = useToast()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const artisanName = user ? `${user.firstName}` : "James"
  const myProducts = user ? getProductsByArtisan(user.id) : []

  // Filtrer les avis pour ne montrer que ceux des produits de cet artisan
  const myReviews = reviews
    .filter(review => 
      myProducts.some((product: any) => String((product as any).id) === String(review.productId))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalProducts = myProducts.length
  const lowStockProducts = myProducts.filter((p: any) => {
    if (!p.variations || p.variations.length === 0) return false
    return p.variations.some((v: any) => v.stock <= (v.seuil_alerte || 5))
  }).length
  
  const MM_REVENUE_STATUSES = ["preparing", "prete", "in_delivery", "forwarded", "delivered"]
  const COD_REVENUE_STATUSES = ["delivered"]

  function isRevenueStatus(order) {
    if (order.mobile_money_provider) return MM_REVENUE_STATUSES.includes(order.status)
    return COD_REVENUE_STATUSES.includes(order.status)
  }

  const totalRevenue = orders.reduce((sum, order) => {
    if (!isRevenueStatus(order)) return sum
    const artisanProducts = order.products.filter(product => 
      myProducts.some(myProduct => String(myProduct.id) === String(product.id))
    )
    const artisanAmount = artisanProducts.reduce((productSum, product) => {
      if (product.fulfillmentStatus === "unavailable") return productSum
      return productSum + (Number(product.price) || 0) * (product.quantity || 1)
    }, 0)
    return sum + artisanAmount
  }, 0)


  // Calculer la note moyenne pour les produits de cet artisan
  const myAverageRating = myReviews.length > 0 ? myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length : 0

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetchOrders()
      toast({
        title: "Succès",
        description: "Données mises à jour",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir les données",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchOrders, toast])

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <DashboardLayout role="artisan">
      <div className="space-y-6">
        {/* Header avec refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Vue d&apos;ensemble</h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:bg-secondary transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Statistics Grid */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={TrendingUp}
            label="Chiffre d'affaires"
            value={totalRevenue}
            prefix="Ar "
            decimals={2}
            subtitle="Total des ventes"
          />

          <StatCard
            icon={totalProducts === 0 ? Package : lowStockProducts > 0 ? AlertCircle : Package}
            label="Produits actifs"
            value={totalProducts}
          >
            {totalProducts === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun produit pour l&apos;instant</p>
            ) : lowStockProducts > 0 ? (
              <p className="text-xs text-red-600">
                {lowStockProducts} produit(s) avec variation(s) en stock faible
              </p>
            ) : (
              <p className="text-xs text-green-600">Tous les stocks sont bons</p>
            )}
          </StatCard>

          <StatCard
            icon={Star}
            label="Note moyenne"
            value={myAverageRating}
            decimals={1}
            subtitle={`Basée sur ${myReviews.length} avis${myReviews.length === 0 ? " (aucun avis pour le moment)" : ""}`}
            valueEnd={<DynamicStars rating={myAverageRating} size={16} className="ml-2" />}
          />
        </div>
        {/* Recent Orders Table */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-linear-to-r from-[#fef3c7]/60 to-[#fffbeb] dark:from-amber-900/30 dark:to-amber-950/20 border-b">
            <CardTitle className="font-serif text-lg">Commandes récentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <OrderCardList
                columns={getColumnSet("admin")}
                data={orders
                  .filter(order => 
                    order.products.some((product: any) => 
                      myProducts.some((myProduct: any) => String(myProduct.id) === String((product as any).id))
                    )
                  )
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((order: any) => {
                    const artisanProducts = order.products.filter((product: any) => {
                      const productInfo = myProducts.find((p: any) => String(p.id) === String((product as any).id))
                      return productInfo !== undefined
                    })
                    const artisanAmount = artisanProducts.reduce((sum: number, product: any) => {
                      if (product.fulfillmentStatus === "unavailable") return sum
                      return sum + (Number(product.price) || 0) * (product.quantity || 1)
                    }, 0)
                    return { ...order, products: artisanProducts, amount: artisanAmount }
                  })}
                rowKey="id"
                onRowClick={(order) => router.push(`/dashboard/artisan/orders/${order.id}`)}
                className="bg-white"
                maxHeight="none"
                emptyMessage="Aucune commande récente"
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold">Derniers avis reçus</h2>
            {myReviews.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                {Math.min(myReviews.length, 6)} / {myReviews.length}
              </span>
            )}
          </div>
          
          {reviewsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-muted"></div>
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 bg-muted rounded w-24"></div>
                        <div className="h-2.5 bg-muted rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-muted rounded mb-1"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myReviews.length === 0 ? (
            <Card className="border-border/50 bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Star className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <p className="text-muted-foreground font-medium">Aucun avis pour l&apos;instant</p>
                <p className="text-sm text-muted-foreground mt-1">Les avis de vos clients apparaîtront ici</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myReviews.slice(0, 6).map((review) => {
                const nameParts = (review.clientName || "?").split(" ")
                const initials = nameParts.map((p: string) => p[0]).join("").toUpperCase().slice(0, 2)
                const colors = ["bg-amber-500", "bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-rose-500", "bg-cyan-500"]
                const colorIdx = review.id ? review.id.toString().length % colors.length : 0
                return (
                  <Card key={review.id} className="border-border/50 bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <CardContent className="p-5">
                      {/* Top row: avatar + name + rating */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-10 w-10 rounded-full shrink-0 shadow-sm overflow-hidden ${!review.clientAvatar ? colors[colorIdx] : ""} flex items-center justify-center`}>
                            {review.clientAvatar ? (
                              <Image src={review.clientAvatar} alt={review.clientName} width={40} height={40} className="object-cover w-full h-full" />
                            ) : (
                              <span className="text-white text-sm font-bold">{initials || "?"}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate" title={review.clientName}>
                              {review.clientName}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <DynamicStars rating={review.rating} size={13} />
                              <span className="text-[11px] text-muted-foreground font-medium">{review.rating}/5</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2 mt-0.5">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      {/* Comment */}
                      {review.comment && (
                        <div className="relative mb-3 pl-3 border-l-2 border-primary/20">
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 italic">
                            &ldquo;{review.comment}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Product name */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
                        <Package className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="text-xs text-muted-foreground truncate" title={review.productName}>
                          {review.productName}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </DashboardLayout>
  )
}

