// @ts-nocheck
"use client"

export const dynamic = 'force-dynamic'

import React, { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, TrendingUp, ShoppingCart, ShoppingBag } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { ordersApi } from "@/lib/api-client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OrderCardList } from "@/components/orders/order-card-row"
import { getColumnSet } from "@/components/orders/order-columns"
import { StatCard } from "@/components/ui/stat-card"

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
  orderNumber?: string
  clientName?: string
  createdAt: string | Date
  products: Product[]
  productCount?: number
  amount: number | string
  status: string
  deliveryAddress?: string
}

export default function ClientDashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await ordersApi.fetchOrders()
        if (response.success && response.data) {
          // transform to include productCount and normalize status
          const transformed: Order[] = (response.data || []).map((o: any) => {
            const products = o.products || []
            const count = o.productCount ?? products.reduce((s:any,p:any)=> s + (p.quantity||0), 0)
            return {
              ...o,
              products,
              amount: Number(o.amount) || 0,
              productCount: count,
              status: o.status || '',
            }
          })
          setOrders(transformed)
        } else {
          setOrders([])
        }
      } catch (err) {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const PAID_MM_STATUSES = [
    'preparing', 'prete',
    'in_delivery', 'forwarded', 'delivered',
  ]

  const totals = useMemo(() => {
    const totalOrders = orders.length
    const totalSpent = orders.reduce((acc, o) => {
      const o2 = o as any
      const mode = o2.mode_paiement || o2.payment_method || ''
      const status = (o2.status || '').toLowerCase().trim()
      if (mode === 'mobile_money' && PAID_MM_STATUSES.includes(status))
        return acc + Number(o.amount || 0)
      if (mode === 'cash_on_delivery' && status === 'delivered')
        return acc + Number(o.amount || 0)
      return acc
    }, 0)
    return { totalOrders, totalSpent }
  }, [orders])

  return (
    <DashboardLayout role="client">
      <div className="space-y-6 w-full" style={{ overflowX: 'hidden' }}>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Content de vous revoir</h1>
          <p className="mt-1 text-muted-foreground">Consultez l&apos;historique de vos commandes et les paramètres de votre compte.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <StatCard
            icon={ShoppingBag}
            label="Nombre total de commandes"
            value={totals.totalOrders}
            subtitle="Commandes passées"
          />
          <StatCard
            icon={ShoppingBag}
            label="Montant total dépensé"
            value={totals.totalSpent}
            prefix="Ar "
            subtitle="Total dépensé"
          />
        </div>

        {/* Order History */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 w-full" style={{ maxWidth: '100%' }}>
          <CardHeader className="bg-linear-to-r from-[#fef3c7]/60 to-[#fffbeb] dark:from-amber-900/30 dark:to-amber-950/20 border-b border-amber-100 dark:border-amber-900/40 flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-lg">Commandes récentes</CardTitle>
            <Link href="/dashboard/client/orders">
              <Button variant="outline" size="sm" className="bg-transparent">
                Voir tout
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <OrderCardList
                columns={getColumnSet("admin")}
                data={[...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
                rowKey="id"
                onRowClick={(order) => router.push(`/dashboard/client/orders/${order.id}`)}
                className="bg-white"
                maxHeight="none"
                emptyMessage="Aucune commande pour l'instant"
              />
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  )
}

