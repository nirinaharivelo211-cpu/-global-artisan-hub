// @ts-nocheck
"use client"

import React, { useMemo, useState } from "react"
import { Bell, CheckCheck, Loader, ArrowRight, ShoppingCart, Truck, CreditCard, Package, UserCheck, UserPlus, AlertTriangle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useNotifications, Notification } from "@/context/notifications-context"
import { useAppToast } from "@/context/toast-context"
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

// Component for individual notification item (simplified for dropdown)
function NotificationItem({
  notification,
  onMarkAsRead,
  onNavigate,
}: {
  notification: Notification
  onMarkAsRead: (id: number) => void
  onNavigate: (lien: string) => void
}) {
  const IconComponent = getNotificationIcon(notification.icone)
  const iconColor = getNotificationIconColor(notification.categorie)

  return (
    <div
      className="p-3 cursor-pointer hover:bg-secondary/30 transition-colors relative"
      onClick={() => {
        if (!notification.est_lu) {
          onMarkAsRead(notification.id)
        }
        const lien = notification.lien
        if (lien) {
          onNavigate(lien)
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100/80 flex items-center justify-center">
          <IconComponent className={`w-4 h-4 ${iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title with unread dot */}
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-semibold line-clamp-1 ${!notification.est_lu ? "text-foreground font-bold" : "text-muted-foreground"}`}>
              {notification.titre}
            </p>
            {/* unread dot after title */}
            {!notification.est_lu && (
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            )}
          </div>

          {/* Content/Message */}
          <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        </div>
      </div>
    </div>
  )
}

// Main NotificationDropdown component
export default function NotificationDropdown() {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    // deleteNotification, // not used in dropdown
    // clearAll, // no delete action
  } = useNotifications()
  const { addToast } = useAppToast()

  // Get only the 5 most recent notifications
  const recentNotifications = useMemo(() => {
    return notifications.slice(0, 5)
  }, [notifications])

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id)
      addToast({
        title: "Marquée comme lue",
        description: "Notification mise à jour avec succès",
        variant: "success",
        duration: 2000,
      })
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Impossible de mettre à jour la notification",
        variant: "error",
        duration: 3000,
      })
    }
  }

  const handleNavigate = (lien: string) => {
    setDropdownOpen(false)
    setTimeout(() => router.push(lien), 50)
  }


  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      addToast({
        title: "Tout marqué comme lu",
        description: "Vos notifications sont maintenant lues",
        variant: "success",
        duration: 2000,
      })
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Impossible de mettre à jour les notifications",
        variant: "error",
        duration: 3000,
      })
    }
  }


  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {isLoading ? (
            <Loader className="h-5 w-5 animate-spin" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-[10px] z-10"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center justify-between p-4 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="default">{unreadCount} nouveau</Badge>
            )}
          </div>

          {/* Header Actions */}
          {notifications.length > 0 && unreadCount > 0 && (
            <div className="flex gap-1">
              <Button
                size="sm"
                className="h-6 text-xs"
                onClick={handleMarkAllAsRead}
              >
                Tous lus
              </Button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          )}

          {!isLoading && recentNotifications.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucune notification
            </div>
          )}

          {!isLoading && recentNotifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onNavigate={handleNavigate}
            />
          ))}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border p-2 bg-secondary/30">
            <Button
              size="sm"
              className="w-full text-xs justify-center"
              onClick={() => handleNavigate('/dashboard/notifications')}
            >
              Voir toutes les notifications
              <ArrowRight className="h-3 w-3 ml-2" />
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

