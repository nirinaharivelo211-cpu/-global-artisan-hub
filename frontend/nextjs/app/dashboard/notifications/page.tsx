// @ts-nocheck
"use client"

import React, { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Bell, Trash2, CheckCheck, MoreVertical, Loader, Filter, ShoppingCart, Truck, CreditCard, Package, UserCheck, UserPlus, AlertTriangle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNotifications, Notification } from "@/context/notifications-context"
import { useAppToast } from "@/context/toast-context"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"

// Mapping des couleurs pour les catégories
const CATEGORY_COLORS: Record<string, string> = {
  commande: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  livraison: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paiement: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  produit: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  artisan: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  stock: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  avis: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  systeme: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  autre: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
}

// Mapping des icônes pour les types de notification
const NOTIFICATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'shopping-cart': ShoppingCart,
  'truck': Truck,
  'credit-card': CreditCard,
  'package': Package,
  'user-check': UserCheck,
  'user-plus': UserPlus,
  'package-check': Package,
  'alert-triangle': AlertTriangle,
  'x-circle': XCircle,
  'alert-circle': AlertCircle,
}

// Mapping des couleurs d'icônes selon la catégorie
const ICON_COLORS: Record<string, string> = {
  commande: "text-blue-600",
  livraison: "text-green-600",
  paiement: "text-purple-600",
  produit: "text-orange-600",
  artisan: "text-indigo-600",
  stock: "text-yellow-600",
  avis: "text-pink-600",
  systeme: "text-gray-600",
  autre: "text-slate-600",
}

// Fonction pour obtenir l'icône d'une notification
function getNotificationIcon(icone?: string) {
  const IconComponent = NOTIFICATION_ICONS[icone || ''] || Bell
  return IconComponent
}

// Fonction pour obtenir la couleur de l'icône
function getNotificationIconColor(categorie?: string) {
  return ICON_COLORS[categorie || ''] || ICON_COLORS.autre
}

// Component for individual notification item (TikTok/WhatsApp style)
function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  router,
}: {
  notification: Notification
  onMarkAsRead: (id: number) => void
  onDelete: (id: number) => void
  router: ReturnType<typeof useRouter>
}) {
  const backgroundColor = CATEGORY_COLORS[notification.categorie] || CATEGORY_COLORS.autre
  const IconComponent = getNotificationIcon(notification.icone)
  const iconColor = getNotificationIconColor(notification.categorie)

  const handleClick = () => {
    console.log("[NOTIFICATION] Clicking notification with lien:", notification.lien)
    if (notification.lien) {
      console.log("[NOTIFICATION] Navigating to:", notification.lien)
      router.push(notification.lien)
    }
  }

  return (
    <Card className="relative transition-all hover:shadow-md cursor-pointer" onClick={handleClick}>
      <CardContent className="p-2">
        <div className="space-y-1">
          {/* Header with icon, title and category */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {/* Icon */}
              <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <IconComponent className={`w-3 h-3 ${iconColor}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`font-semibold text-xs ${!notification.est_lu ? "text-foreground" : "text-muted-foreground"}`}>
                    {notification.titre}
                  </h4>
                  {/* unread dot after title */}
                  {!notification.est_lu && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                </div>
              </div>
            </div>

            {/* Category Badge */}
            <div className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${backgroundColor}`}>
              {notification.categorie}
            </div>
          </div>

          {/* Message/Content */}
          <p className="text-xs text-foreground leading-relaxed pl-8">
            {notification.message}
          </p>

          {/* Footer with metadata and actions */}
          <div className="flex items-center justify-between pl-8">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{notification.temps_depuis}</p>
            </div>

            {/* Action Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {!notification.est_lu && (
                  <>
                    <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                      <CheckCheck className="h-3 w-3 mr-2" />
                      Marquer comme lue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => onDelete(notification.id)} className="text-destructive">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardNotificationsPage() {
  const { user } = useAuth()
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()
  const { addToast } = useAppToast()

  const router = useRouter()

  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Filter notifications by category
  const filteredNotifications = useMemo(() => {
    if (selectedCategory === "all") return notifications
    return notifications.filter(notif => notif.categorie === selectedCategory)
  }, [notifications, selectedCategory])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(notifications.map(n => n.categorie))
    return Array.from(cats)
  }, [notifications])

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id)
      addToast({
        title: "Marquée comme lue",
        description: "Notification mise à jour avec succès",
        variant: "success",
        duration: 2500,
      })
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Impossible de mettre à jour la notification",
        variant: "error",
        duration: 3500,
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id)
      addToast({
        title: "Supprimée",
        description: "Notification supprimée avec succès",
        variant: "success",
        duration: 2500,
      })
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "error",
        duration: 3500,
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      addToast({
        title: "Tout marqué comme lu",
        description: "Toutes vos notifications sont maintenant lues",
        variant: "success",
        duration: 2500,
      })
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Impossible de mettre à jour les notifications",
        variant: "error",
        duration: 3500,
      })
    }
  }

  return (
    <DashboardLayout role={user?.role || "client"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">
                Gérez vos notifications et restez informé des dernières activités
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Badge variant="default" className="text-sm px-3 py-1">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline">
                <CheckCheck className="h-4 w-4 mr-2" />
                Tout marquer comme lu
              </Button>
            )}
          </div>
        )}

        {/* Filter Tabs */}
        {notifications.length > 0 && (
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
              <TabsTrigger value="all">Toutes</TabsTrigger>
              {categories.slice(0, 5).map(category => (
                <TabsTrigger key={category} value={category} className="capitalize text-xs">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Notifications List */}
        <div className="space-y-4 max-h-150 overflow-y-auto">
          {isLoading && (
            <div className="text-center py-12">
              <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement des notifications...</p>
            </div>
          )}

          {!isLoading && filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucune notification</h3>
              <p className="text-muted-foreground">
                {selectedCategory === "all"
                  ? "Vous n'avez aucune notification pour le moment."
                  : `Aucune notification dans la catégorie "${selectedCategory}".`
                }
              </p>
            </div>
          )}

          {!isLoading && filteredNotifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              router={router}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
