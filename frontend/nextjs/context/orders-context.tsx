// @ts-nocheck
"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { ordersApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"
import { normalizeStatus } from "@/lib/statusMapping"

export interface Order {
  id: string
  orderNumber: string
  clientName: string
  products: { id: number; name: string; quantity: number; price?: number }[]
  amount: number
  status: "pending" | "confirmed" | "awaiting_payment" | "preparing" | "prete" | "in_delivery" | "forwarded" | "delivered" | "cancelled" | "returned"
  createdAt: Date
  deliveryAddress?: string
  zone_livraison_nom?: string
  hub_destination_nom?: string
  mobile_money_provider?: string
}

export interface OrdersContextType {
  orders: Order[]
  loading: boolean
  error: string | null
  fetchOrders: () => Promise<void>
  refreshOrders: () => Promise<void>
  addOrder: (order: Omit<Order, "id" | "createdAt">) => Promise<void>
  updateOrderStatus: (id: string, status: Order["status"]) => Promise<void>
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined)

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  // Load orders when user changes (handles login/logout)
  useEffect(() => {
    if (user) {
      fetchOrders()
    } else {
      setOrders([])
    }
  }, [user])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await ordersApi.fetchOrders()
      if (response.success && response.data) {
        console.log('Orders fetched:', response.data.length, 'orders')
        // Transform API data to match our interface
        const transformedOrders = response.data.map((order: any) => {
          // Use the centralized normalization system
          const status = normalizeStatus(order.status || 'pending')
          
          // format order number with CMD prefix and 4 digits
          const formattedOrderNumber = order.orderNumber && !order.orderNumber.startsWith('CMD')
            ? `CMD${String(order.orderNumber).padStart(4, '0')}`
            : order.orderNumber

          return {
            ...order,
            orderNumber: formattedOrderNumber,
            status,
            amount: Number(order.amount),
            createdAt: new Date(order.createdAt),
            productCount: order.productCount || (order.products ? order.products.reduce((s:any,p:any)=> s + (p.quantity||0), 0) : 0),
          }
        })
        console.log('Orders transformed, setting orders state')
        setOrders(transformedOrders)
      } else {
        setOrders([])
        setError(response.error || "Erreur lors du chargement des commandes")
      }
    } catch (err) {
      setError("Erreur lors du chargement des commandes")
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshOrders = async () => {
    console.log('🔄 refreshOrders called - refreshing orders context')
    await fetchOrders()
  }

  const addOrder = async (newOrder: Omit<Order, "id" | "createdAt">) => {
    const response = await ordersApi.createOrder({
      orderNumber: newOrder.orderNumber,
      clientName: newOrder.clientName,
      products: newOrder.products,
      amount: newOrder.amount,
      status: newOrder.status,
    })
    if (response.success) {
      await fetchOrders() // Reload orders
      toast({
        title: "Succès",
        description: "Nouvelle commande ajoutée",
      })
    } else {
      toast({
        title: "Erreur",
        description: response.error || "Impossible d'ajouter la commande",
        variant: "destructive",
      })
    }
  }

  const updateOrderStatus = async (id: string, status: Order["status"]) => {
    const response = await ordersApi.updateOrderStatus(id, status)
    if (response.success) {
      await fetchOrders() // Reload orders
      toast({
        title: "Succès",
        description: "Statut de la commande mis à jour",
      })
    } else {
      toast({
        title: "Erreur",
        description: response.error || "Impossible de mettre à jour le statut",
        variant: "destructive",
      })
    }
  }

  return (
    <OrdersContext.Provider value={{ orders, loading, error, fetchOrders, refreshOrders, addOrder, updateOrderStatus }}>
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (context === undefined) {
    throw new Error("useOrders doit être utilisé dans OrdersProvider")
  }
  return context
}

