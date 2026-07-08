import React from "react"
import { User } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getStatusStyle } from "@/lib/statusStyles"
import type { UserRole } from "@/lib/statusStyles"
import type { CardRowColumn } from "@/components/orders/order-card-row"

function formatOrderNumber(order: any): string {
  const num = order.orderNumber || order.number || order.id
  return !String(num).startsWith("CMD") ? `CMD${String(num).padStart(5, "0")}` : String(num)
}

const formatDate = (d: string | Date) => {
  const date = new Date(d)
  if (isNaN(date.getTime())) return "--"
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

const formatTime = (d: string | Date) => {
  const date = new Date(d)
  if (isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

const formatAmount = (val: any): string => {
  const n = Number(val) || 0
  return n.toLocaleString("fr-FR")
}

export function getOrderNumberColumn<T extends Record<string, any>>(): CardRowColumn<T> {
  return {
    key: "orderNumber",
    header: "N° commande",
    desktop: "1.2fr",
    render: (item: T) => (
      <span className="font-semibold text-gray-900 text-sm">{formatOrderNumber(item)}</span>
    ),
  }
}

export function getDateColumn<T extends Record<string, any>>(): CardRowColumn<T> {
  return {
    key: "date",
    header: "Date",
    desktop: "1fr",
    render: (item: T) => {
      const d = item.date || item.createdAt || item.created_at
      return (
        <div>
          <span className="text-sm text-gray-900">{formatDate(d)}</span>
          <span className="block text-xs text-gray-400 leading-tight">{formatTime(d)}</span>
        </div>
      )
    },
  }
}

export function getClientColumn<T extends Record<string, any>>(): CardRowColumn<T> {
  return {
    key: "client",
    header: "Client",
    desktop: "2fr",
    mobileHide: true,
    render: (item: T) => {
      const name = item.clientName || item.client || item.client_name || "—"
      const phone = item.clientPhone || item.phone || item.client_phone || item.telephone || ""
      const photo = item.clientPhoto || item.client_photo || item.photo || ""
      return (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 ring-2 ring-gray-100">
            <AvatarImage src={photo || undefined} alt={name} />
            <AvatarFallback className="bg-gradient-to-br from-amber-700 to-amber-950">
              <User className="h-4 w-4 text-white" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate block">{name}</span>
            {phone && <span className="block text-xs text-gray-400 truncate">{phone}</span>}
          </div>
        </div>
      )
    },
  }
}

export function getProductsColumn<T extends Record<string, any>>(): CardRowColumn<T> {
  return {
    key: "products",
    header: "Produits",
    desktop: "1.8fr",
    render: (item: T) => {
      const products = item.products || item.items || []
      const names = products.map((p: any) => p.name || p.productName || p.product_name || "").filter(Boolean)
      const full = names.join(", ")
      const visible = names.slice(0, 2)
      const extra = names.length - visible.length
      return (
        <div className="truncate" title={full}>
          {names.length > 0 ? (
            <span className="text-sm text-gray-600">
              {visible.join(", ")}
              {extra > 0 && <span className="ml-1 text-xs text-gray-400">+{extra}</span>}
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>
      )
    },
  }
}

export function getProductCountColumn<T extends Record<string, any>>(): CardRowColumn<T> {
  return {
    key: "productCount",
    header: "Qté",
    desktop: "0.8fr",
    render: (item: T) => {
      const products = item.products || item.items || []
      const count = item.productCount ?? products.length
      return (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
          {count}
        </span>
      )
    },
  }
}

export function getAmountColumn<T extends Record<string, any>>(field = "amount"): CardRowColumn<T> {
  return {
    key: "amount",
    header: "Montant",
    desktop: "1fr",
    align: "right",
    render: (item: T) => {
      const val = (item as any)[field] ?? item.total ?? item.prix_total ?? 0
      const n = Number(val) || 0
      return (
        <span className="font-semibold text-emerald-600 text-sm">
          Ar {formatAmount(n)}
        </span>
      )
    },
  }
}

export function getStatusColumn<T extends Record<string, any>>(role: UserRole): CardRowColumn<T> {
  return {
    key: "status",
    header: "Statut",
    desktop: "1.2fr",
    render: (item: T) => {
      const status = (item as any).status || (item as any).statut || ""
      const style = getStatusStyle(status, role)
      return (
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${style.color || "bg-gray-300"}`} />
          <span className="text-sm font-medium text-gray-700 truncate">{style.label || status}</span>
        </div>
      )
    },
  }
}

export function getColumnSet<T extends Record<string, any>>(role: UserRole, options?: { noClient?: boolean }): CardRowColumn<T>[] {
  const cols: CardRowColumn<T>[] = [
    getOrderNumberColumn(),
    getDateColumn(),
  ]
  if (!options?.noClient) {
    cols.push(getClientColumn())
  }
  cols.push(
    getProductsColumn(),
    getAmountColumn(),
    getStatusColumn(role),
  )
  return cols
}

export function getAddressColumn<T extends Record<string, any>>(): CardRowColumn<T> {
  return {
    key: "address",
    header: "Adresse",
    desktop: "1.5fr",
    mobileHide: true,
    render: (item: T) => {
      const addr = (item as any).address || (item as any).deliveryAddress || (item as any).adresse || ""
      return (
        <span className="text-sm text-gray-600 truncate block" title={addr}>
          {addr || "—"}
        </span>
      )
    },
  }
}

export function getPhoneColumn<T extends Record<string, any>>(): CardRowColumn<T> {
  return {
    key: "phone",
    header: "Téléphone",
    desktop: "1fr",
    mobileHide: true,
    render: (item: T) => {
      const phone = (item as any).clientPhone || (item as any).phone || (item as any).telephone || (item as any).client_phone || ""
      return (
        <span className="text-sm text-gray-600">{phone || "—"}</span>
      )
    },
  }
}

export function getLivreurColumnSet<T extends Record<string, any>>(): CardRowColumn<T>[] {
  return [
    getOrderNumberColumn(),
    getDateColumn(),
    getClientColumn(),
    getAddressColumn(),
    getPhoneColumn(),
    getAmountColumn(),
    getStatusColumn("livreur"),
  ]
}
