// @ts-nocheck
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getStatusStyle } from "@/lib/statusStyles"
import { Calendar, TrendingUp, ShoppingCart, RefreshCw, Eye, ExternalLink, ChevronDown } from "lucide-react"
import { useOrders } from "@/context/orders-context"
import { useState, useMemo, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useAppToast } from "@/context/toast-context"
import { useAuth } from "@/context/auth-context"
import { useProducts } from "@/context/products-context"
import { OrderCardList } from "@/components/orders/order-card-row"
import { getColumnSet } from "@/components/orders/order-columns"
import { StatCard } from "@/components/ui/stat-card"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  LabelList,
} from "recharts"

type PeriodType = "this-month" | "this-quarter" | "this-year" | "all-time" | "custom"

const COLORS = ["#2A0800", "#775144", "#C09891", "#BEA8A7", "#F4DBD8"]

export default function SalesPage() {
  const router = useRouter()
  const { orders, loading, fetchOrders } = useOrders()
  const { addToast } = useAppToast()
  const { toast } = useToast()
  const { user } = useAuth()
  const { getProductsByArtisan } = useProducts()
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("all-time")
  const [chartPeriod, setChartPeriod] = useState<'7' | '30'>('30')
  const [chartCollapsed, setChartCollapsed] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  // Charger les commandes au montage de la page
  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Get artisan's products
  const myProducts = user ? getProductsByArtisan(user.id) : []
  
  // Liste des IDs des produits de l'artisan (pour filtrage rapide)
  const artisanProductIds = useMemo(() => 
    myProducts.map(p => String(p.id)),
    [myProducts]
  )
  
  // Statuts où le paiement a été effectivement reçu
  const MM_REVENUE_STATUSES = ["preparing", "prete", "in_delivery", "forwarded", "delivered"]
  const COD_REVENUE_STATUSES = ["delivered"]

  function isRevenueStatus(order) {
    if (order.mobile_money_provider) return MM_REVENUE_STATUSES.includes(order.status)
    return COD_REVENUE_STATUSES.includes(order.status)
  }

  // Convertir les commandes en données de ventes pour cet artisan
  // Les produits dans les commandes ONT un id (item.id_produit.id)
  const filteredSales = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    return orders
      .filter(order => {
        if (!isRevenueStatus(order)) return false
        if (!order.products || order.products.length === 0) return false
        return order.products.some((product: any) => 
          artisanProductIds.includes(String(product.id))
        )
      })
      .filter(order => {
        // Filtrer par période
        const orderDate = new Date(order.createdAt)
        const orderYear = orderDate.getFullYear()
        const orderMonth = orderDate.getMonth() + 1

        switch (selectedPeriod) {
          case "this-month":
            return orderMonth === currentMonth && orderYear === currentYear
          case "this-quarter":
            const quarter = Math.ceil(currentMonth / 3)
            const orderQuarter = Math.ceil(orderMonth / 3)
            return orderQuarter === quarter && orderYear === currentYear
          case "this-year":
            return orderYear === currentYear
          case "all-time":
            return true
          default:
            return true
        }
      })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, selectedPeriod, artisanProductIds])

  // Calculer les statistiques - filtrage par ID
  const stats = useMemo(() => {
    // Calculer les montants seulement pour les produits de l'artisan
    const totalAmount = filteredSales.reduce((sum, order) => {
      if (!order.products || order.products.length === 0) return sum
      
      const artisanProducts = order.products.filter((product: any) => 
        artisanProductIds.includes(String(product.id))
      )
      const artisanAmount = artisanProducts.reduce((productSum, product: any) => {
        if (product.fulfillmentStatus === "unavailable") return productSum
        return productSum + (Number(product.price) || 0) * (product.quantity || 1)
      }, 0)
      return sum + artisanAmount
    }, 0)

    const totalSales = filteredSales.length
    const averageOrder = totalSales > 0 ? totalAmount / totalSales : 0

    return {
      totalAmount,
      totalSales,
      averageOrder,
    }
  }, [filteredSales, orders, myProducts, artisanProductIds])

  // Préparer les données pour le graphique (par jour)
  const revenueData = useMemo(() => {
    const now = new Date()
    const periodDays = Number(chartPeriod)
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

    const revenueByDate: {[key: string]: number} = {}
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      revenueByDate[d.toISOString().split('T')[0]] = 0
    }

    orders.forEach((order: any) => {
      if (!isRevenueStatus(order)) return
      if (!order.createdAt) return
      const orderDate = new Date(order.createdAt)
      if (orderDate < periodStart || orderDate > now) return

      const artisanProducts = order.products?.filter((p: any) =>
        artisanProductIds.includes(String(p.id))
      ) || []
      const artisanAmount = artisanProducts.reduce((sum: number, p: any) => {
        if (p.fulfillmentStatus === "unavailable") return sum
        return sum + (Number(p.price) || 0) * (p.quantity || 1)
      }, 0)

      const dateKey = orderDate.toISOString().split('T')[0]
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + artisanAmount
    })

    return Object.entries(revenueByDate)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [orders, artisanProductIds, chartPeriod])

  const orderBounds = useMemo(() => {
    const entriesWithRevenue = revenueData.filter(d => d.revenue > 0)
    if (entriesWithRevenue.length > 0) {
      return {
        first: entriesWithRevenue[0].date,
        last: entriesWithRevenue[entriesWithRevenue.length - 1].date,
      }
    }
    return null
  }, [revenueData])

  // Préparer les données pour le graphique en camembert (top 5 produits de l'artisan)
  const topProducts = useMemo(() => {
    const productMap: Record<string, { quantity: number; revenue: number }> = {}
    
    filteredSales.forEach((order) => {
      if (!order.products || order.products.length === 0) return
      
      order.products.forEach((product: any) => {
        const isArtisanProduct = artisanProductIds.includes(String(product.id))
        if (isArtisanProduct) {
          const productName = product.name || 'Produit inconnu'
          const qty = product.quantity || 1
          const rev = qty * (Number(product.price) || 0)
          if (productMap[productName]) {
            productMap[productName].quantity += qty
            productMap[productName].revenue += rev
          } else {
            productMap[productName] = { quantity: qty, revenue: rev }
          }
        }
      })
    })

    return Object.entries(productMap)
      .map(([name, data]) => ({
        name,
        value: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [filteredSales, artisanProductIds])

  // Calculer les pourcentages pour le camembert
  const totalQuantity = topProducts.reduce((sum, p) => sum + p.value, 0)
  const pieData = topProducts.map((p) => ({
    ...p,
    percentage: totalQuantity > 0 ? ((p.value / totalQuantity) * 100).toFixed(1) : "0",
  }))

  // Les ventes à afficher sont les mêmes que filteredSales
  const displaySales = filteredSales

  // Pagination
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return displaySales.slice(start, start + itemsPerPage)
  }, [displaySales, currentPage])

  const totalPages = Math.ceil(displaySales.length / itemsPerPage)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchOrders()
      addToast({
        title: "Succès",
        description: "Données mises à jour",
        variant: "success",
        duration: 2500
      })
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Impossible de rafraîchir les données",
        variant: "error",
        duration: 3500
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const style = getStatusStyle(status, 'artisan');
    
    return (
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${style.color}`} />
        <span className="text-base font-semibold text-gray-900">{style.label}</span>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    try {
      if (!date) return 'Date invalide'
      
      const dateObj = typeof date === 'string' ? new Date(date) : date
      
      if (isNaN(dateObj.getTime())) {
        // Try parsing different date formats
        if (typeof date === 'string') {
          // Try DD/MM/YYYY format
          const parts = date.split('/')
          if (parts.length === 3) {
            const day = parseInt(parts[0])
            const month = parseInt(parts[1]) - 1 // months are 0-indexed
            const year = parseInt(parts[2])
            const parsedDate = new Date(year, month, day)
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              })
            }
          }
          
          // Try YYYY-MM-DD format
          const isoDate = new Date(date + 'T00:00:00')
          if (!isNaN(isoDate.getTime())) {
            return isoDate.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            })
          }
        }
        return 'Date invalide'
      }
      
      return dateObj.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })
    } catch (error) {
      return 'Date invalide'
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="artisan">
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="artisan">
      <div className="space-y-6">
        {/* Header avec refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
              Ventes
            </h1>
            <p className="mt-1 text-muted-foreground">Analyse de vos ventes et revenus</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodType)}>
              <SelectTrigger className="w-45">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">Ce mois</SelectItem>
                <SelectItem value="this-quarter">Ce trimestre</SelectItem>
                <SelectItem value="this-year">Cette année</SelectItem>
                <SelectItem value="all-time">Tout le temps</SelectItem>
              </SelectContent>
            </Select>
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
        </div>

        {/* Cartes statistiques */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={TrendingUp}
            label="Chiffre d'affaires"
            value={stats.totalAmount}
            prefix="Ar "
            decimals={2}
            subtitle="Pour cette période"
          />
          <StatCard
            icon={ShoppingCart}
            label="Nombre de ventes"
            value={stats.totalSales}
            subtitle="Ventes effectuées"
          />
          <StatCard
            icon={TrendingUp}
            label="Moyenne par commande"
            value={stats.averageOrder}
            prefix="Ar "
            decimals={2}
            subtitle="Montant moyen"
          />
        </div>

        {/* Graphiques */}
        <div className="grid gap-4 w-full">
          {/* Revenue Evolution Chart */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-[#78350f]/[0.04] to-transparent border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif text-lg">Évolution du chiffre d&apos;affaires</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Revenu quotidien en Ariary</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex rounded-full bg-muted p-0.5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setChartPeriod('7')}
                      className={`relative px-5 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ${
                        chartPeriod === '7'
                          ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md'
                          : 'text-muted-foreground/70 hover:text-foreground bg-transparent'
                      }`}
                    >
                      7j
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartPeriod('30')}
                      className={`relative px-5 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ${
                        chartPeriod === '30'
                          ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md'
                          : 'text-muted-foreground/70 hover:text-foreground bg-transparent'
                      }`}
                    >
                      30j
                    </button>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                    onClick={() => setChartCollapsed(!chartCollapsed)}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 text-muted-foreground ${chartCollapsed ? '' : 'rotate-180'}`}
                    />
                  </button>
                </div>
              </div>
            </CardHeader>
            {!chartCollapsed && (
              <CardContent className="p-6">
                {revenueData.length === 0 ? (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground text-sm">
                    Aucune donnée pour cette période
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={370}>
                    <BarChart
                      data={revenueData}
                      margin={{ top: 30, right: 20, left: 10, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient id="barGradientSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#78350f" stopOpacity={0.85}/>
                          <stop offset="100%" stopColor="#78350f" stopOpacity={0.35}/>
                        </linearGradient>
                        <linearGradient id="boundsGradientSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#78350f" stopOpacity={0.04}/>
                          <stop offset="100%" stopColor="#78350f" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>

                      {orderBounds && (
                        <ReferenceArea
                          x1={orderBounds.first}
                          x2={orderBounds.last}
                          fill="url(#boundsGradientSales)"
                          fillOpacity={1}
                        />
                      )}

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(100,100,100,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                        }}
                        tick={{ fontSize: 12, fill: '#444' }}
                        tickLine={{ stroke: 'rgba(100,100,100,0.1)' }}
                        axisLine={{ stroke: 'rgba(100,100,100,0.15)' }}
                        interval="preserveStartEnd"
                        minTickGap={chartPeriod === '7' ? 35 : 70}
                        dy={6}
                      />
                      <YAxis
                        tickFormatter={(value) => `${value.toLocaleString('fr-FR')} Ar`}
                        tick={{ fontSize: 12, fill: '#444' }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 'auto']}
                        width={90}
                      />
                      <Tooltip
                        cursor={false}
                        contentStyle={{
                          backgroundColor: '#fff',
                          borderRadius: '6px',
                          border: '1px solid rgba(100,100,100,0.12)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                          fontSize: '12px',
                          padding: '8px 12px',
                        }}
                        labelStyle={{ fontWeight: 600, marginBottom: 4, color: '#1e293b', fontSize: '13px' }}
                        formatter={(value: any) => [
                          <span key="val" style={{ color: '#78350f', fontWeight: 600 }}>
                            {Number(value).toLocaleString('fr-FR')} Ar
                          </span>,
                          'Revenu'
                        ]}
                        labelFormatter={(label) => {
                          const date = new Date(label)
                          return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                        }}
                        itemStyle={{ padding: 0 }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="url(#barGradientSales)"
                        maxBarSize={10}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                        shape={(props: any) => {
                          if (props.payload?.revenue === 0) return null
                          const r = Math.min(4, props.width / 2)
                          return (
                            <path
                              d={`M${props.x},${props.y + r}
                                Q${props.x},${props.y} ${props.x + r},${props.y}
                                L${props.x + props.width - r},${props.y}
                                Q${props.x + props.width},${props.y} ${props.x + props.width},${props.y + r}
                                L${props.x + props.width},${props.y + props.height}
                                L${props.x},${props.y + props.height} Z`}
                              fill={props.fill}
                            />
                          )
                        }}
                      >
                        <LabelList
                          dataKey="revenue"
                          position="top"
                          formatter={(val: number) => val > 0 ? `${val.toLocaleString('fr-FR')} Ar` : ''}
                          style={{ fontSize: '10px', fill: '#78350f', fontWeight: 600 }}
                          offset={4}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            )}
          </Card>

          {/* Graphique en camembert - pleine largeur */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-[#78350f]/[0.04] to-transparent border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif text-lg">Top 5 produits les plus vendus</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Répartition par quantité vendue et chiffre d&apos;affaires</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {topProducts.length === 0 ? (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground text-sm">
                  <div className="text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune donnée disponible</p>
                    <p className="text-sm">Les ventes de produits apparaîtront ici</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={370}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percentage }) => {
                        const truncated = name.length > 22 ? name.substring(0, 19) + "…" : name
                        return `${truncated} (${percentage}%)`
                      }}
                      outerRadius={120}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.08))' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: string, props: any) => {
                        if (name === 'Quantité') return [`${value} unité(s)`, 'Quantité']
                        return null
                      }}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '6px',
                        border: '1px solid rgba(100,100,100,0.12)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                        fontSize: '12px',
                        padding: '8px 12px',
                      }}
                      labelStyle={{ fontWeight: 600, marginBottom: 4, color: '#1e293b', fontSize: '13px' }}
                      formatter={(_: any, __: string, props: any) => {
                        const payload = props?.payload
                        return [
                          <div key="tooltip" className="space-y-1">
                            <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{payload?.name}</p>
                            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{payload?.value} unité(s)</p>
                            <p style={{ margin: 0, fontSize: 12, color: '#78350f', fontWeight: 600 }}>
                              {Number(payload?.revenue || 0).toLocaleString('fr-FR')} Ar
                            </p>
                          </div>,
                          null
                        ]
                      }}
                      labelFormatter={() => ''}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={40}
                      formatter={(value) => <span style={{ fontSize: '12px', color: '#1e293b' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tableau des ventes */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-linear-to-r from-[#fef3c7]/60 to-[#fffbeb] dark:from-amber-900/30 dark:to-amber-950/20 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif text-lg">Détail des ventes</CardTitle>
                <CardDescription className="mt-1">
                  Affichage {displaySales.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} à{" "}
                  {Math.min(currentPage * itemsPerPage, displaySales.length)} sur {displaySales.length} vente{displaySales.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {paginatedSales.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p>Aucune vente pour l&apos;instant</p>
              </div>
            ) : (
              <>
                <OrderCardList
                  columns={getColumnSet("admin")}
                  data={paginatedSales.map((order: any) => {
                    const artisanProducts = order.products ? order.products.filter((product: any) => 
                      artisanProductIds.includes(String(product.id))
                    ) : []
                    const artisanTotal = artisanProducts.reduce((sum: number, product: any) => {
                      if (product.fulfillmentStatus === "unavailable") return sum
                      return sum + (Number(product.price) || 0) * (product.quantity || 1)
                    }, 0)
                    return { ...order, products: artisanProducts, amount: artisanTotal }
                  })}
                  rowKey="id"
                  onRowClick={(order) => router.push(`/dashboard/artisan/orders/${order.id}`)}
                  className="bg-white"
                  maxHeight="none"
                  emptyMessage="Aucune vente pour l'instant"
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                    <p className="text-sm text-gray-500">
                      Page {currentPage} sur {totalPages} ({displaySales.length} ventes)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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

