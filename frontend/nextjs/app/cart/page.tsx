// @ts-nocheck
"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getMesureLabelSafe } from "@/lib/mesure-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useCart, type CartItem } from "@/context/cart-context"
import { useAuth } from "@/context/auth-context"

export default function CartPage() {
  const { user } = useAuth()
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart()
  const router = useRouter()

  // No redirect for logged out users - allow viewing cart

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <div className="rounded-full bg-secondary p-6 mb-6">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Votre panier est vide</h1>
          <p className="mt-4 text-muted-foreground max-w-md">
            Vous n’avez pas encore ajouté d’article à votre panier. 
            Laissez-vous séduire par nos créations faites main.
          </p>
          <Button asChild className="mt-8" size="lg">
            <Link href="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continuer mes achats
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Panier d&apos;achat</h1>
            <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={clearCart}>
              Vider le panier
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card className="border-border/50 bg-card">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {items.map((item: CartItem, index: number) => (
                      <div key={item.id}>
                        <div className="flex gap-4 sm:gap-6">
                          <Link
                            href={`/products/${item.productId || item.id}`}
                            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-32 sm:w-32"
                          >
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover transition-opacity hover:opacity-80"
                            />
                          </Link>
                          <div className="flex flex-1 flex-col gap-1.5 min-h-[96px] sm:min-h-[128px]">
                            <div className="flex justify-between gap-4">
                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                {/* Product name */}
                                <Link
                                  href={`/products/${item.productId || item.id}`}
                                  className="font-medium text-foreground hover:text-primary transition-colors leading-tight"
                                >
                                  {item.name}
                                </Link>
                                {/* Artisan name */}
                                <p className="text-xs text-muted-foreground">par {item.artisan || 'artisan inconnu'}</p>
                                <div className="flex flex-col gap-0.5">
                                  {item.color && !["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"].includes(String(item.color).toUpperCase()) && (
                                    <Badge variant="secondary" className="w-fit text-xs flex items-center gap-1">
                                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.colorHex || item.color || '#ddd' }} />
                                      {item.colorName || item.color}
                                    </Badge>
                                  )}
                                  {item.size && (
                                    <span className="text-xs text-muted-foreground">{getMesureLabelSafe(item.type_mesure, item.size)} {item.size}</span>
                                  )}
                                  {item.weight && Number(item.weight) > 0 && (
                                    <span className="text-xs text-muted-foreground">{Number(item.weight)} kg</span>
                                  )}
                                </div>

                                {/* Price */}
                                <p className="font-semibold text-foreground mt-0.5">
                                  Ar {(item.price ?? 0).toFixed(2)}
                                </p>
                              </div>

                              {/* Quantity controls top right */}
                              <div className="flex items-start shrink-0">
                                <div className="flex items-center gap-2 rounded-lg border border-border p-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-10 text-center font-medium">{item.quantity}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Remove button */}
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Enlever
                              </Button>
                            </div>
                          </div>
                        </div>
                        {index < items.length - 1 && <Separator className="mt-6" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Link
                href="/products"
                className="mt-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Continuer mes achats
              </Link>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24 border-border/50 bg-card">
                <CardContent className="p-6">
                  <h2 className="font-serif text-xl font-semibold text-foreground">Détail de la commande</h2>

                  <div className="mt-6 space-y-3">
                    {items.map((item: CartItem) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {item.name} x {item.quantity}
                        </span>
                        <span className="text-foreground font-medium">Ar {((item.price ?? 0) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}

                    <Separator className="my-4" />

                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground">Ar {(totalPrice ?? 0).toFixed(2)}</span>
                    </div>
                  </div>

                  
                  <Button className="mt-6 w-full" size="lg" asChild>
                    <Link href="/checkout">Passer la commande</Link>
                  </Button>

                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

