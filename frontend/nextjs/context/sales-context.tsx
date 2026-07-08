// @ts-nocheck
"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { salesApi } from "@/lib/api-client"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/hooks/use-toast"

export interface Sale {
  id: string
  orderNumber: string
  clientName: string
  products: Array<{
    name: string
    quantity: number
  }>
  amount: number
  status: "pending" | "delivered" | "cancelled"
  date: Date
  month: number
  year: number
}

export interface SalesContextType {
  sales: Sale[]
  loading: boolean
  error: string | null
  fetchSales: () => Promise<void>
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchSales()
    } else {
      setSales([])
      setError(null)
    }
  }, [user])

  const fetchSales = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await salesApi.fetchSales()
      if (response.success && response.data) {
        // Transform API data to match our interface
        const transformedSales = response.data.map((sale: any) => ({
          ...sale,
          date: new Date(sale.date),
        }))
        setSales(transformedSales)
      } else {
        setSales([])
        setError(response.error || "Erreur lors du chargement des ventes")
        toast({
          title: "Erreur",
          description: response.error || "Impossible de charger les ventes",
          variant: "destructive",
        })
      }
    } catch (err) {
      setError("Erreur lors du chargement des ventes")
      toast({
        title: "Erreur",
        description: "Impossible de charger les ventes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SalesContext.Provider
      value={{
        sales,
        loading,
        error,
        fetchSales,
      }}
    >
      {children}
    </SalesContext.Provider>
  )
}

export function useSales() {
  const context = useContext(SalesContext)
  if (!context) throw new Error("useSales must be used within SalesProvider")
  return context
}

