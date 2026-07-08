// @ts-nocheck
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CreditCard,
  Users,
  Package,
  ShoppingCart,
  AlertTriangle,
  Truck,
  Eye,
  UserCheck,
  UserX,
  Briefcase,
  ChevronDown
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, LabelList } from "recharts"
import { ordersApi } from "@/lib/api-client"
import { API_BASE_URL } from "@/lib/api-config"
import { getStatusStyle } from "@/lib/statusStyles"
import { OrderCardList } from "@/components/orders/order-card-row"
import { getColumnSet } from "@/components/orders/order-columns"
import { StatCard } from "@/components/ui/stat-card"

const ITEMS_PER_PAGE = 10

const getStatusBadge = (status: string) => {
  const style = getStatusStyle(status, 'admin');
  
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${style.color}`} />
      <span className="text-base font-semibold text-gray-900">{style.label}</span>
    </div>
  );
}

import { useSales } from "@/context/sales-context"
import { useProducts } from "@/context/products-context"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"

// Plus besoin des statuts hardcodés - utilise le mapping centralisé

export default function AdminDashboard() {
  const { sales, loading: salesLoading } = useSales()
  const { products, isLoading: productsLoading } = useProducts()
  const { user } = useAuth()
  const router = useRouter()

  // Direct orders state - fetch directly from API instead of context
  const [orders, setOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  // Fetch orders directly from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setOrdersLoading(true)
        const response = await ordersApi.fetchOrders()
        if (response.success && response.data) {
          console.log('📦 Dashboard: Orders fetched directly from API:', response.data.length, 'orders')
          console.log('📦 First order status:', response.data[0]?.status)
          setOrders(response.data)
        } else {
          console.error('Failed to fetch orders:', response.error)
          setOrders([])
        }
      } catch (error) {
        console.error('Error fetching orders:', error)
        setOrders([])
      } finally {
        setOrdersLoading(false)
      }
    }

    if (user) {
      fetchOrders()
    }
  }, [user])

  // Dynamic stats - start at 0 and will be populated from API
  const [stats, setStats] = useState<any>({
    totalArtisans: { value: 0, pending: 0, change: "0%" },
    totalClients: { value: 0, pending: 0, change: "0%" },
    totalOrders: { value: 0, pending: 0, change: "0%", trend: "up" },
    totalRevenue: { value: 0, change: "0%", trend: "up" },
    deliveriesInProgress: { value: 0, change: "0%", trend: "up" },
    totalEquipe: { value: 0, managers: 0, livreurs: 0 },
  })

  // Revenue data - start empty
  const [revenueData, setRevenueData] = useState<{date: string, revenue: number}[]>([])
  const [orderBounds, setOrderBounds] = useState<{first: string; last: string} | null>(null)
  const [chartCollapsed, setChartCollapsed] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30'>('30')

  // Recent orders - start empty
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  // Fetch stats once the authenticated user is known
  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      try {
        // use same key as api-config (setAuthToken)
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
        const statsUrl = `${API_BASE_URL}/stats/`
        console.log('Fetching stats from:', statsUrl)
        const response = await fetch(statsUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })
        if (!response.ok) {
          console.error('Stats API error:', response.status, response.statusText)
          return
        }
        const statesData = await response.json()
        console.log('Stats data received:', statesData)
        
        setStats(prevStats => ({
          ...prevStats,
          totalArtisans: { 
            value: statesData?.artisans?.total || prevStats.totalArtisans.value, 
            pending: statesData?.artisans?.active || prevStats.totalArtisans.pending, 
            change: "0%" 
          },
          totalClients: { 
            value: statesData?.clients?.total || prevStats.totalClients.value, 
            pending: statesData?.clients?.active || prevStats.totalClients.pending, 
            change: "0%" 
          },
          totalEquipe: {
            value: (statesData?.livreurs?.total || 0) + (statesData?.managers?.total || 0),
            managers: statesData?.managers?.total || 0,
            livreurs: statesData?.livreurs?.total || 0,
          },
        }))
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    // Fetch now that user is loaded
    fetchStats()
  }, [user])

  // Calculate orders and deliveries stats + revenue chart data
  useEffect(() => {
    if (orders.length > 0 || !ordersLoading) {
      const now = new Date()
      const periodDays = Number(selectedPeriod)
      const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)

      const ordersInPeriod = orders.filter(o => o.createdAt && new Date(o.createdAt) >= periodStart)

      // =========================
      // TOTAL ORDERS CALCULATION
      // =========================
      const totalOrders = orders.length
      const pendingOrders = orders.filter(order => order.status === 'pending').length
      const ordersLast15 = ordersInPeriod.filter(o => new Date(o.createdAt) >= fifteenDaysAgo).length
      const ordersPrev15 = ordersInPeriod.filter(o => {
        const d = new Date(o.createdAt)
        return d >= periodStart && d < fifteenDaysAgo
      }).length
      const ordersChange = ordersPrev15 > 0 ? Math.round(((ordersLast15 - ordersPrev15) / ordersPrev15) * 100) : (ordersLast15 > 0 ? 100 : 0)
      const ordersTrend = ordersChange >= 0 ? "up" : "down"

      // =========================
      // DELIVERIES IN PROGRESS
      // =========================
      const deliveriesInProgress = orders.filter(order =>
        order.status === 'in_delivery' || order.status === 'preparing'
      ).length
      const deliveriesLast15 = ordersInPeriod
        .filter(o => new Date(o.createdAt) >= fifteenDaysAgo &&
          (o.status === 'in_delivery' || o.status === 'preparing'))
        .length
      const deliveriesPrev15 = ordersInPeriod
        .filter(o => {
          const d = new Date(o.createdAt)
          return d >= periodStart && d < fifteenDaysAgo &&
            (o.status === 'in_delivery' || o.status === 'preparing')
        }).length
      const deliveriesChange = deliveriesPrev15 > 0 ? Math.round(((deliveriesLast15 - deliveriesPrev15) / deliveriesPrev15) * 100) : (deliveriesLast15 > 0 ? 100 : 0)
      const deliveriesTrend = deliveriesChange >= 0 ? "up" : "down"

      // =========================
      // TOTAL REVENUE + CHART DATA — ne compter que le paiement effectif
      // =========================
      const MM_REVENUE_STATUSES = ["preparing", "prete", "in_delivery", "forwarded", "delivered"]
      const isRevenueStatus = (order) => {
        if (order.mobile_money_provider) return MM_REVENUE_STATUSES.includes(order.status)
        return order.status === "delivered"
      }
      const paidOrders = orders.filter(isRevenueStatus)
      const totalRevenue = paidOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0)
      const revenueLast15 = ordersInPeriod
        .filter(o => new Date(o.createdAt) >= fifteenDaysAgo && isRevenueStatus(o))
        .reduce((sum, o) => sum + (Number(o.amount) || 0), 0)
      const revenuePrev15 = ordersInPeriod
        .filter(o => {
          const d = new Date(o.createdAt)
          return d >= periodStart && d < fifteenDaysAgo && isRevenueStatus(o)
        })
        .reduce((sum, o) => sum + (Number(o.amount) || 0), 0)
      const revenueChange = revenuePrev15 > 0 
        ? Math.round(((revenueLast15 - revenuePrev15) / revenuePrev15) * 100)
        : (revenueLast15 > 0 ? 100 : 0)
      const revenueTrend = revenueChange >= 0 ? "up" : "down"

      // Build revenue map — init all days in period to 0, then overlay real data
      const revenueByDate: {[key: string]: number} = {}

      for (let i = periodDays - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        revenueByDate[d.toISOString().split('T')[0]] = 0
      }

      orders.forEach(order => {
        if (order.createdAt && isRevenueStatus(order)) {
          const orderDate = new Date(order.createdAt)
          if (orderDate >= periodStart && orderDate <= now) {
            const dateKey = orderDate.toISOString().split('T')[0]
            revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + (Number(order.amount) || 0)
          }
        }
      })

      const revenueSorted = Object.entries(revenueByDate)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setRevenueData(revenueSorted)

      // Find first & last date with orders
      const entriesWithRevenue = revenueSorted.filter(d => d.revenue > 0)
      if (entriesWithRevenue.length > 0) {
        setOrderBounds({
          first: entriesWithRevenue[0].date,
          last: entriesWithRevenue[entriesWithRevenue.length - 1].date,
        })
      } else {
        setOrderBounds(null)
      }

      setStats(prevStats => ({
        ...prevStats,
        totalOrders: { 
          value: totalOrders, 
          pending: pendingOrders, 
          change: `${ordersChange > 0 ? '+' : ''}${ordersChange}%`,
          trend: ordersTrend
        },
        totalRevenue: { 
          value: totalRevenue, 
          change: `${revenueChange > 0 ? '+' : ''}${revenueChange}%`,
          trend: revenueTrend
        },
        deliveriesInProgress: { 
          value: deliveriesInProgress, 
          change: `${deliveriesChange > 0 ? '+' : ''}${deliveriesChange}%`,
          trend: deliveriesTrend
        },
      }))

      // Set recent orders (last 5)
      const validOrders = orders.filter(o => o.createdAt)
      const sortedOrders = validOrders
        .sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return isNaN(dateB) ? -1 : dateB - dateA
        })
        .slice(0, 5)
        .map(order => {
          const createdDate = new Date(order.createdAt)
          const products = order.products || []
          const count = order.productCount ?? products.reduce((s:any,p:any)=> s + (p.quantity||0), 0)
          
          const normalizedStatus = order.status || ''
          console.log('🔄 Using status:', order.status)
          const formattedOrderNumber = (() => {
            const orderNum = order.orderNumber || order.id
            return !String(orderNum).startsWith('CMD')
              ? `CMD${String(orderNum).padStart(4, '0')}`
              : orderNum
          })()
          return {
            id: order.id,
            number: formattedOrderNumber,
            date: isNaN(createdDate.getTime()) ? new Date().toISOString() : createdDate.toISOString(),
            time: isNaN(createdDate.getTime()) ? '' : createdDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            client: order.clientName,
            clientPhoto: order.clientPhoto,
            clientPhone: order.clientPhone,
            products,
            productCount: count,
            amount: Number(order.amount) || 0,
            status: normalizedStatus,
            deliveryAddress: order.deliveryAddress || "Adresse non disponible"
          }
        })
      console.log('📋 Dashboard: Recent orders transformed:', sortedOrders)
      setRecentOrders(sortedOrders)
    }
  }, [orders, ordersLoading, selectedPeriod])

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Vue d&apos;ensemble</h1>
          <p className="mt-1 text-muted-foreground">Tableau de bord administrateur - Aperçu général de la plateforme</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={CreditCard}
            label="Chiffre d'affaires total"
            value={stats.totalRevenue.value}
            prefix="Ar "
            trend={stats.totalRevenue.trend}
            trendValue={stats.totalRevenue.change}
          />
          <StatCard
            icon={ShoppingCart}
            label="Nombre total des commandes"
            value={stats.totalOrders.value}
            badge={`${stats.totalOrders.pending} en attente`}
            trend={stats.totalOrders.trend}
            trendValue={stats.totalOrders.change}
            alert={stats.totalOrders.pending > 10}
          />
          <StatCard
            icon={Truck}
            label="Nombre de livraisons en cours"
            value={stats.deliveriesInProgress.value}
            trend={stats.deliveriesInProgress.trend}
            trendValue={stats.deliveriesInProgress.change}
            alert={stats.deliveriesInProgress.value > 20}
          />
          <StatCard
            icon={Briefcase}
            label="Équipes"
            value={stats.totalEquipe.value}
            badge={`${stats.totalEquipe.managers} Manager${stats.totalEquipe.managers > 1 ? 's' : ''} / ${stats.totalEquipe.livreurs} Livreur${stats.totalEquipe.livreurs > 1 ? 's' : ''}`}
          />
          <StatCard
            icon={UserCheck}
            label="Nombre total des artisans"
            value={stats.totalArtisans.value}
            badge={`${stats.totalArtisans.pending} actifs`}
            trend="up"
            trendValue={stats.totalArtisans.change}
          />
          <StatCard
            icon={Users}
            label="Nombre total des clients"
            value={stats.totalClients.value}
            badge={`${stats.totalClients.pending} actifs`}
            trend="up"
            trendValue={stats.totalClients.change}
          />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6">
          {/* Revenue Evolution Chart */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-[#78350f]/[0.04] to-transparent border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif text-lg">Chiffre d&apos;affaires</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Revenu quotidien en Ariary</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex rounded-full bg-muted p-0.5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => { setSelectedPeriod('7'); setChartCollapsed(false) }}
                      className={`relative px-5 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ${
                        selectedPeriod === '7'
                          ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md'
                          : 'text-muted-foreground/70 hover:text-foreground bg-transparent'
                      }`}
                    >
                       7j
                     </button>
                     <button
                       type="button"
                       onClick={() => { setSelectedPeriod('30'); setChartCollapsed(false) }}
                       className={`relative px-5 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ${
                         selectedPeriod === '30'
                           ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md'
                          : 'text-muted-foreground/70 hover:text-foreground bg-transparent'
                      }`}
                    >
                      30j
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => setChartCollapsed(!chartCollapsed)}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 text-muted-foreground ${chartCollapsed ? '' : 'rotate-180'}`}
                    />
                  </Button>
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
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#78350f" stopOpacity={0.85}/>
                          <stop offset="100%" stopColor="#78350f" stopOpacity={0.35}/>
                        </linearGradient>
                        <linearGradient id="boundsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#78350f" stopOpacity={0.04}/>
                          <stop offset="100%" stopColor="#78350f" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>

                      {orderBounds && (
                        <ReferenceArea
                          x1={orderBounds.first}
                          x2={orderBounds.last}
                          fill="url(#boundsGradient)"
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
                        minTickGap={selectedPeriod === '7' ? 35 : 70}
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
                        fill="url(#barGradient)"
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
        </div>

        {/* Recent Orders Table */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-linear-to-r from-[#fef3c7]/60 to-[#fffbeb] dark:from-amber-900/30 dark:to-amber-950/20 border-b">
            <CardTitle className="font-serif text-lg">Commandes récentes ({recentOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Aucune commande pour l&apos;instant</div>
            ) : (
              <OrderCardList
                columns={getColumnSet("admin")}
                data={recentOrders}
                rowKey="id"
                onRowClick={(order) => router.push(`/dashboard/admin/orders/${order.id}`)}
                className="bg-white"
                maxHeight="none"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}


