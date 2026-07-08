// @ts-nocheck
"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getMesureLabelSafe } from "@/lib/mesure-utils"
import { useCart } from "@/context/cart-context"

interface CartSidebarProps {
  onClose: () => void
}

export function CartSidebar({ onClose }: CartSidebarProps) {
  const { items, removeItem, updateQuantity, totalPrice } = useCart()

  const total = totalPrice

  return (
    <div className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle className="font-serif text-2xl">Votre panier</SheetTitle>
      </SheetHeader>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Votre panier est vide</p>
          <Button onClick={onClose} asChild>
            <Link href="/products">Continuer l&apos;achat</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto py-6">
            <ul className="space-y-6">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4">
                  <Link href={`/products/${item.productId || item.id}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary hover:opacity-80 transition-opacity">
                    <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-medium text-foreground">{item.name}</h3>
                      <p className="font-medium text-foreground whitespace-nowrap">Ar {(item.price ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="mt-1 flex flex-nowrap items-center gap-2 min-w-0">
                      {item.color && !["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"].includes(String(item.color).toUpperCase()) && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full mr-1 inline-block"
                            style={{
                              backgroundColor: item.colorHex?.trim() || item.color || '#ccc'
                            }}
                          />
                          {item.colorName || item.color}
                        </Badge>
                      )}
                      {(() => {
                        const parts: string[] = []
                        if (item.size) parts.push(`${getMesureLabelSafe(item.type_mesure, item.size)} ${item.size}`)
                        if (item.weight && Number(item.weight) > 0) parts.push(`${Number(item.weight)} kg`)
                        return parts.length > 0 ? <span className="text-[10px] text-muted-foreground truncate">{parts.join(" — ")}</span> : null
                      })()}
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-base font-medium">
                <span>Total</span>
                <span>Ar {(total ?? 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <Button className="w-full" size="lg" asChild>
                <Link href="/cart" onClick={onClose}>
                  Voir le panier
                </Link>
              </Button>
              <Button variant="outline" className="w-full bg-transparent" onClick={onClose}>
                Continuer l&apos;achat
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

