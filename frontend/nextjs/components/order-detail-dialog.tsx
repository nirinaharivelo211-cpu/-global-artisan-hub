// @ts-nocheck
"use client"

import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MapPin, Calendar, Package as PackageIcon, CreditCard } from "lucide-react"
import { getMesureLabel } from "@/lib/mesure-utils"

const statusColors: Record<string, string> = {
  "En attente": "bg-yellow-100 text-yellow-700",
  "En préparation": "bg-orange-100 text-orange-700",
  "En livraison": "bg-blue-100 text-blue-700",
  "Livrée": "bg-green-100 text-green-700",
  "Annulée": "bg-red-100 text-red-700",
}

type OrderProduct = {
  id?: string
  name: string
  quantity: number
  price?: number | string
  image?: string
  size?: string | null
  color?: string | null
  colorHex?: string | null
  type_mesure?: string | null
}

type Order = {
  id: string
  orderNumber?: string
  clientName?: string
  createdAt?: string | Date
  products: OrderProduct[]
  amount: number | string
  status: string
  deliveryAddress?: string
}

interface OrderDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedOrder: Order | null
}

const formatOrderNumber = (order?: Order) => {
  if (!order) return ""
  if (order.orderNumber && !order.orderNumber.startsWith("CMD")) {
    return `CMD${String(order.orderNumber).padStart(4, "0")}`
  }
  if (order.orderNumber) {
    return order.orderNumber
  }
  return order.id ? `CMD${String(order.id).padStart(4, "0")}` : ""
}

const formatDate = (date?: string | Date) => {
  if (!date) return "-"
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const formatMoney = (value?: number | string) => {
  const amount = Number(value ?? 0)
  return `Ar ${amount.toLocaleString("fr-FR")}`
}

export function OrderDetailDialog({ open, onOpenChange, selectedOrder }: OrderDetailDialogProps) {
  const getProductPrice = (product: OrderProduct): number => {
    if (!product.price) return 0
    return typeof product.price === "string" ? parseFloat(product.price) : product.price
  }

  const calculateSubtotal = (product: OrderProduct): number => {
    return getProductPrice(product) * product.quantity
  }

  const totalAmount = selectedOrder?.amount ? Number(selectedOrder.amount) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-slate-950">
        <div className="overflow-y-auto flex-1">
          <DialogHeader className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <DialogTitle className="text-2xl font-serif text-slate-900 dark:text-white">Détails de la commande</DialogTitle>
                  <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                    {formatOrderNumber(selectedOrder)}
                  </DialogDescription>
                </div>
                <Badge className={`${statusColors[selectedOrder?.status ?? ""] || "bg-slate-100 text-slate-800"} text-sm px-4 py-2`}>
                  {selectedOrder?.status || "Statut inconnu"}
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Date de commande</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(selectedOrder?.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Adresse de livraison</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedOrder?.deliveryAddress || "Non renseignée"}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <PackageIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Produits commandés</h3>
              <Badge variant="outline" className="ml-auto text-sm">{selectedOrder?.products.length ?? 0} produit{(selectedOrder?.products.length ?? 0) > 1 ? "s" : ""}</Badge>
            </div>

            <div className="space-y-3">
              {selectedOrder?.products.map((product, index) => {
                const unitPrice = getProductPrice(product)
                const subtotal = calculateSubtotal(product)
                return (
                  <div key={product.id ?? index} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-700">
                          {product.image ? (
                            <Image src={product.image} alt={product.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-slate-800">
                              <PackageIcon className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{product.name}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1">Qté {product.quantity}</span>
                            <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1">{formatMoney(unitPrice)}</span>
                            {product.size && <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1">{getMesureLabel(product.type_mesure)} {product.size}</span>}
                            {product.color && (
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1">
                                <span
                                  className="h-2.5 w-2.5 rounded-full border border-slate-200 dark:border-slate-700"
                                  style={{ backgroundColor: product.colorHex || product.color || "#94a3b8" }}
                                />
                                {product.color}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-2 text-right lg:items-end lg:text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Sous-total</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatMoney(subtotal)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <Separator className="my-0" />

          <div className="px-6 py-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Montant total</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatMoney(totalAmount)}</p>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{selectedOrder?.clientName ? `Client : ${selectedOrder.clientName}` : "Client non spécifié"}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Fermer
          </Button>
          <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
            Télécharger la facture
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
