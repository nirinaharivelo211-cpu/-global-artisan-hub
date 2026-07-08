// @ts-nocheck
 "use client"

import React, { createContext, useContext, useCallback, useEffect, useState } from "react"
import { notificationsApi } from "@/lib/api-client"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/hooks/use-toast"

export interface Notification {
  id: number
  type_notif: string
  titre: string
  message: string
  lien?: string
  est_lu: boolean
  date_creation: string
  temps_depuis: string
  categorie: string
  icone?: string
  couleur?: string
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchNotifications: () => Promise<void>
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: number) => Promise<void>
  
  // Polling
  startPolling: (interval?: number) => void
  stopPolling: () => void
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [lastNotificationTime, setLastNotificationTime] = useState<string | null>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const res = await notificationsApi.fetchNotifications()
      
      if (res.success && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data as any).results || []
        
        // normalize messages for legacy formats
        const newNotifications = (raw as Notification[]).map(n => {
          let msg = n.message
          // legacy pattern like "Commande de X pour 1 x Produit" or "Commande de X pour 1x Produit"
          if (msg.startsWith('Commande de') && msg.includes('pour')) {
            try {
              const clientPart = msg.split(' pour ')[0].replace('Commande de ', '')
              // Extract quantity in a robust way (handles "1 x", "1x", "1 produit", "1 produits" etc.)
              const qtyMatch = msg.match(/pour\s+(\d+)\s*(?:x|produit)/i)
              const qty = qtyMatch?.[1] ?? '1'
              msg = `${clientPart} vient de commander ${qty} produit${qty === '1' ? '' : 's'}.`
            } catch {
              // fallback leave msg unchanged
            }
          }
          // update title as well
          let title = n.titre
          if (title.startsWith('Commande de')) {
            title = 'Nouvelle commande'
          }
          return { ...n, message: msg, titre: title }
        })
        
        // Set notifications and unread count
        setNotifications(newNotifications)
        setUnreadCount(newNotifications.filter((n: Notification) => !n.est_lu).length)
        
        // Update last notification time
        if (newNotifications.length > 0) {
          setLastNotificationTime(newNotifications[0].date_creation)
        }
      }
    } catch (err) {
      console.error("Erreur lors du chargement des notifications:", err)
      setError("Erreur lors du chargement des notifications")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Mark notification as read
  const markAsRead = useCallback(async (id: number) => {
    try {
      const res = await notificationsApi.markAsRead(id)
      if (res.success) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, est_lu: true } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error("Erreur:", err)
      setError("Erreur lors du marquage de la notification")
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await notificationsApi.markAllAsRead()
      if (res.success) {
        setNotifications(prev => prev.map((n: Notification) => ({ ...n, est_lu: true })))
        setUnreadCount(0)
        toast({
          title: "Succès",
          description: (res.data as any)?.message || "Toutes les notifications marquées comme lues",
        })
      }
    } catch (err) {
      console.error("Erreur:", err)
      setError("Erreur lors du marquage des notifications")
    }
  }, [toast])

  // Delete notification
  const deleteNotification = useCallback(async (id: number) => {
    try {
      const res = await notificationsApi.deleteNotification(id)
      if (res.success) {
        setNotifications(prev => {
          const notif = prev.find((n: Notification) => n.id === id)
          const isUnread = notif && !notif.est_lu
          
          if (isUnread) {
            setUnreadCount(prevCount => Math.max(0, prevCount - 1))
          }
          
          return prev.filter((n: Notification) => n.id !== id)
        })
      }
    } catch (err) {
      console.error("Erreur:", err)
      setError("Erreur lors de la suppression")
    }
  }, [])

  // Clear all read notifications


  // Polling
  const startPolling = useCallback((interval = 30000) => {
    // Stop any existing polling first
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
    
    // Fetch immediately
    fetchNotifications()

    // Then set up polling
    const timer = setInterval(() => {
      fetchNotifications()
    }, interval)

    setPollingInterval(timer)
  }, [fetchNotifications, pollingInterval])

  const stopPolling = useCallback(() => {
    setPollingInterval(prev => {
      if (prev) {
        clearInterval(prev)
      }
      return null
    })
  }, [])

  // Start polling when user is authenticated (only once)
  useEffect(() => {
    if (user) {
      startPolling(30000)
    }
    return () => {
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    startPolling,
    stopPolling,
  }

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider")
  }
  return context
}

