// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Smartphone } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getMesureLabelSafe } from "@/lib/mesure-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useCart } from "@/context/cart-context"
import { useProfile } from "@/context/profile-context"
import { useAuth } from "@/context/auth-context"
import { useAppToast } from "@/context/toast-context"
import { ordersApi, cartApi, hubsApi, zonesApi } from "@/lib/api-client"
import { useOrders } from "@/context/orders-context"
import { useSales } from "@/context/sales-context"
import { REGIONS, CITIES_BY_REGION } from "@/lib/madagascar-data"

const MM_PROVIDERS = [
  { value: "MVola", label: "MVola", color: "text-yellow-600" },
  { value: "Airtel Money", label: "Airtel Money", color: "text-red-600" },
  { value: "Orange Money", label: "Orange Money", color: "text-orange-600" },
]

const PROVIDER_BG: Record<string, string> = {
  "MVola": "bg-yellow-100",
  "Airtel Money": "bg-red-100",
  "Orange Money": "bg-orange-100",
}



export default function CheckoutPage() {
  const { user } = useAuth()
  const { items, totalPrice, clearCart } = useCart()
  const { profile } = useProfile()
  const router = useRouter()
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [orderSummary, setOrderSummary] = useState<{items: any[], totalPrice: number} | null>(null)
  const [orderPaymentInstructions, setOrderPaymentInstructions] = useState<string | null>(null)
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<string | null>(null)
  const [orderMpProvider, setOrderMpProvider] = useState<string | null>(null)
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [zonesLoading, setZonesLoading] = useState(false)
  const [hubSupportCod, setHubSupportCod] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [selectedMMProvider, setSelectedMMProvider] = useState<string>("")
  const [customCity, setCustomCity] = useState("")

  const [formData, setFormData] = useState({
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    phone: profile?.phone || "",
    region: "",
    city: "",
    zone: "",
    address: "",
  })
  const [cancelIfPartial, setCancelIfPartial] = useState(true)

  const { fetchOrders } = useOrders()
  const { fetchSales } = useSales()
  const { addToast } = useAppToast()

  // Rediriger vers login si non connecté
  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/checkout")
    }
  }, [user, router])

  // Populate cities when region changes
  useEffect(() => {
    if (formData.region) {
      setAvailableCities(CITIES_BY_REGION[formData.region] || [])
      setFormData(prev => ({ ...prev, city: "", zone: "" }))
      setZones([])
      setHubSupportCod(false)
      setSelectedPaymentMethod("")
      setSelectedMMProvider("")
    } else {
      setAvailableCities([])
    }
  }, [formData.region])

  // Fetch zones when city (and implicitly hub) is selected
  useEffect(() => {
    if (!formData.region || !formData.city) {
      setZones([])
      setFormData(prev => ({ ...prev, zone: "" }))
      return
    }
    if (formData.city === "Autre") {
      setZones([])
      setHubSupportCod(false)
      return
    }
    let cancelled = false
    const fetchZones = async () => {
      setZonesLoading(true)
      try {
        const hubRes = await hubsApi.nearest(formData.region, formData.city)
        if (cancelled) return
        if (hubRes.success && hubRes.data?.id) {
          setHubSupportCod(hubRes.data.support_cod === true)
          const userRegion = formData.region.toLowerCase().trim()
          const hubRegion = (hubRes.data.region || "").toLowerCase().trim()
          const servedRegions = (hubRes.data.regions_servees || []).map((r: string) => r.toLowerCase().trim())
          if (hubRegion === userRegion || servedRegions.includes(userRegion)) {
            const zonesRes = await zonesApi.fetchZones(String(hubRes.data.id), formData.city)
            if (cancelled) return
            if (zonesRes.success && Array.isArray(zonesRes.data)) {
              setZones(zonesRes.data)
            } else {
              setZones([])
            }
          } else {
            setZones([])
          }
        } else {
          setZones([])
          setHubSupportCod(false)
        }
      } catch {
        if (!cancelled) { setZones([]); setHubSupportCod(false) }
      } finally {
        if (!cancelled) setZonesLoading(false)
      }
    }
    fetchZones()
    return () => { cancelled = true }
  }, [formData.region, formData.city])

  const effectiveCod = hubSupportCod && formData.zone !== "" && formData.zone !== "autre"

  useEffect(() => {
    if (formData.zone === "autre" && selectedPaymentMethod === "cash_on_delivery") {
      setSelectedPaymentMethod("mobile_money")
      setSelectedMMProvider("MVola")
    }
  }, [formData.zone])

  // Ne rien afficher si l'utilisateur n'est pas connecté (pendant la redirection)
  if (!user) {
    return null
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === "region") setCustomCity("")
    if (field === "city" && value !== "Autre") setCustomCity("")
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Améliorer les données de couleur pour la page checkout
  const enhancedItems = items.map(item => ({
    ...item,
    colorHex: item.colorHex || (item.color && /^#(?:[0-9A-F]{3}){1,2}$/i.test(item.color) ? item.color : null),
    colorName: item.colorName || item.color
  }))

  const handlePlaceOrder = async () => {
    try {
      if (enhancedItems.length === 0) {
        console.error('No items in cart')
        return
      }
      
      // Fetch cart from backend to get panier IDs
      const cartResponse = await cartApi.fetchCart()
      
      let panierIds: number[] = []
      
      if (cartResponse.success && cartResponse.data) {
        const cartData = cartResponse.data as any
        // Extract panier IDs from the cart items
        panierIds = (cartData.items || []).map((item: any) => item.id)
      }
      
      if (panierIds.length === 0) {
        console.error('No panier items found in cart')
        return
      }
      
      // Create order for the first panier item
      // (In full implementation, create one per item or a grouped order)
      // Only send the minimal writable data; montant_total and status are
      // computed by the backend and createdAt is auto‑generated.
      const effectiveCity = formData.city === "Autre" ? customCity : formData.city
      const orderPayload: Record<string, any> = {
        id_panier: panierIds[0],
        frais_livraison: 0,
        region: formData.region,
        deliveryAddress: `${formData.region}, ${effectiveCity}, ${formData.address}`,
        cancel_if_partial: cancelIfPartial,
        zone_livraison: formData.zone && formData.zone !== "autre" ? parseInt(formData.zone) : null,
        payment_method: selectedPaymentMethod || undefined,
        mobile_money_provider: selectedMMProvider || "",
        shipping_address: {
          region: formData.region,
          city: effectiveCity,
          address: formData.address
        }
      }
      
      const orderResponse = await ordersApi.createOrder(orderPayload)
      
      if (orderResponse.success && orderResponse.data) {
        const created = orderResponse.data as any
        setOrderId(created.id)
        setOrderNumber(created.order_number || created.numero_commande || null)
        // Save order summary before clearing cart
        setOrderSummary({ items: [...items], totalPrice })
        setOrderPaymentInstructions(created.payment_instructions || null)
        setOrderPaymentMethod(created.mode_paiement || selectedPaymentMethod)
        setOrderMpProvider(created.mobile_money_provider || selectedMMProvider || null)
        setOrderPlaced(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        clearCart()

        // Refresh orders/sales dashboards
        try {
          await fetchOrders()
        } catch (e) {
          console.warn('Failed to refresh orders after create:', e)
        }
        try {
          await fetchSales()
        } catch (e) {
          console.warn('Failed to refresh sales after create:', e)
        }

        addToast({ title: "Commande créée", description: "Votre commande a été enregistrée avec succès", variant: "success", duration: 2500 })
      } else {
        console.error('Failed to create order:', orderResponse.error)
        addToast({ title: "Erreur", description: orderResponse.error || 'Impossible de créer la commande', variant: "error", duration: 3500 })
      }
    } catch (error) {
      console.error('Error placing order:', error)
    }
  }

  if (enhancedItems.length === 0 && !orderPlaced) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground">Aucun article à commander</h1>
          <p className="mt-4 text-muted-foreground">Ajoutez des articles à votre panier d&apos;abord.</p>
          <Button asChild className="mt-8">
            <Link href="/products">Parcourir les produits</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  if (orderPlaced) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
            <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Finaliser votre commande</h1>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {/* Confirmation Message */}
              <div>
                <Card className="border-border/50 bg-card">
                  <CardContent className="p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="mt-6 font-serif text-2xl font-bold text-foreground">Commande confirmée !</h2>
                    <p className="mt-4 text-muted-foreground">
                      Merci pour votre commande. Nous avons envoyé un email de confirmation dans votre boîte de réception.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">CMD{String(orderNumber || orderId || '').padStart(4, '0')}</p>
                    <Button asChild className="mt-8">
                      <Link href="/products">Continuer mes achats</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Payment instructions for Mobile Money */}
                {orderPaymentMethod === "mobile_money" && orderPaymentInstructions && (
                  <Card className="mt-6 border-amber-200 bg-amber-50/50">
                    <CardHeader>
                      <CardTitle className="font-serif text-lg text-amber-900">Instructions de paiement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {orderMpProvider && (
                          <div className={`flex items-center gap-2 rounded-lg px-4 py-3 ${
                            PROVIDER_BG[orderMpProvider] || "bg-amber-100"
                          }`}>
                            <span className={`text-sm font-medium ${
                              orderMpProvider === "MVola" ? "text-yellow-800" :
                              orderMpProvider === "Airtel Money" ? "text-red-800" :
                              orderMpProvider === "Orange Money" ? "text-orange-800" :
                              "text-amber-900"
                            }`}>
                              Opérateur choisi : {orderMpProvider}
                            </span>
                          </div>
                        )}
                        <pre className="whitespace-pre-wrap rounded-lg bg-white p-4 text-sm font-mono text-gray-800 border border-amber-200">
                          {orderPaymentInstructions}
                        </pre>
                        <p className="text-xs text-amber-700">
                          Veuillez effectuer le paiement sur le numéro indiqué ci-dessus.
                          Une fois le paiement reçu, votre commande sera préparée par nos artisans.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {orderPaymentMethod === "cash_on_delivery" && (
                  <Card className="mt-6 border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-6">
                      <p className="text-sm font-medium text-emerald-800">
                        Paiement à la livraison — vous réglerez à la réception de votre colis.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Order Summary */}
              <div>
                <Card className="sticky top-24 border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle className="font-serif">Récapitulatif de la commande</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orderSummary?.items.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                            <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Qté: {item.quantity}</p>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {item.color && !["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"].includes(String(item.color).toUpperCase()) && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                  <span
                                    className="h-1.5 w-1.5 rounded-full mr-1 inline-block"
                                    style={{ backgroundColor: item.colorHex?.trim() || item.color || '#ccc' }}
                                  />
                                  {item.colorName || item.color}
                                </Badge>
                              )}
                              {(() => {
                                const parts: string[] = []
                                if (item.size) parts.push(`${getMesureLabelSafe(item.type_mesure, item.size)} ${item.size}`)
                                if (item.weight && Number(item.weight) > 0) parts.push(`${Number(item.weight)} kg`)
                                return parts.length > 0 ? <span className="text-xs text-muted-foreground">{parts.join(" — ")}</span> : null
                              })()}
                            </div>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            Ar {((item.price ?? 0) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-6" />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span>Ar {orderSummary?.totalPrice?.toFixed(2) ?? '0.00'}</span>
                    </div>

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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          <Link
            href="/cart"
            className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au panier
          </Link>

          <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Finaliser votre commande</h1>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Address Form */}
            <div>
              <Card className="border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="font-serif">Informations de livraison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        className="mt-2 bg-background"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        className="mt-2 bg-background"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        placeholder="Dupont"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <PhoneInput
                      id="phone"
                      className="mt-2 bg-background"
                      value={formData.phone}
                      onChange={(value) => handleInputChange("phone", value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="region">Région</Label>
                    <Select
                      value={formData.region}
                      onValueChange={(value) => handleInputChange("region", value)}
                    >
                      <SelectTrigger className="mt-2 bg-background">
                        <SelectValue placeholder="Sélectionnez votre région" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="city">Ville</Label>
                    <Select
                      value={formData.city}
                      onValueChange={(value) => handleInputChange("city", value)}
                      disabled={!formData.region}
                    >
                      <SelectTrigger className="mt-2 bg-background">
                        <SelectValue placeholder={formData.region ? "Sélectionnez votre ville" : "Choisissez d'abord une région"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCities.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        <SelectItem value="Autre">Autre (saisie libre)</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.city === "Autre" && (
                      <Input
                        id="customCity"
                        className="mt-2 bg-background"
                        placeholder="Saisissez votre ville"
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="zone">Quartier / Zone de livraison</Label>
                    <Select
                      value={formData.zone}
                      onValueChange={(value) => handleInputChange("zone", value)}
                      disabled={!formData.city || zonesLoading}
                    >
                      <SelectTrigger className="mt-2 bg-background">
                        <SelectValue placeholder={
                          !formData.city ? "Choisissez d'abord une ville"
                          : zonesLoading ? "Chargement des zones..."
                          : zones.length === 0 ? "Livraison non disponible"
                          : "Sélectionnez votre quartier"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.filter((z: any) => z.actif !== false).map((z: any) => (
                          <SelectItem key={z.id} value={String(z.id)}>{z.nom}</SelectItem>
                        ))}
                        <SelectItem value="autre">Autre (retrait en point relais)</SelectItem>
                      </SelectContent>
                    </Select>
                    {zones.length === 0 && formData.city && !zonesLoading && (
                      <p className="mt-1 text-xs text-amber-600">
                        Aucune livraison à domicile disponible pour {formData.city}. Choisissez "Autre" pour un retrait en point relais.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="address">Adresse détaillée</Label>
                    <Input
                      id="address"
                      className="mt-2 bg-background"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Lot, rue, bâtiment, points de repère..."
                    />
                  </div>

                  {/* Mode de paiement */}
                  <div className="rounded-lg border p-4 bg-white">
                    <Label className="text-sm font-medium text-gray-900">Mode de paiement</Label>
                    <RadioGroup
                      value={selectedPaymentMethod === "cash_on_delivery" ? "cash_on_delivery" : selectedMMProvider}
                      onValueChange={(value) => {
                        if (value === "cash_on_delivery") {
                          setSelectedPaymentMethod("cash_on_delivery")
                          setSelectedMMProvider("")
                        } else {
                          setSelectedPaymentMethod("mobile_money")
                          setSelectedMMProvider(value)
                        }
                      }}
                      className="mt-3 gap-3"
                    >
                      {effectiveCod && (
                        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
                          <RadioGroupItem value="cash_on_delivery" id="cod" className="data-[state=checked]:text-emerald-600 [&_[data-slot=radio-group-indicator]>svg]:fill-emerald-600" />
                          <Label htmlFor="cod" className="font-medium text-emerald-700 cursor-pointer">
                            Paiement à la livraison (espèces)
                          </Label>
                        </div>
                      )}
                      {MM_PROVIDERS.map((provider) => (
                        <div
                          key={provider.value}
                          className={`flex items-center gap-3 rounded-lg border p-3 ${
                            selectedPaymentMethod === "mobile_money" && selectedMMProvider === provider.value
                              ? "border-blue-200 bg-blue-50/30"
                              : "border-gray-200"
                          }`}
                        >
                          <RadioGroupItem value={provider.value} id={provider.value} className="data-[state=checked]:text-emerald-600 [&_[data-slot=radio-group-indicator]>svg]:fill-emerald-600" />
                          <Label htmlFor={provider.value} className={`font-medium cursor-pointer flex items-center gap-2 ${provider.color}`}>
                            <Smartphone className="h-4 w-4 shrink-0" />
                            {provider.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex-1 min-w-0">
                      <label htmlFor="cancel-partial" className="text-sm font-medium text-gray-900">
                        Annuler si quantité partielle
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Si un artisan ne peut pas fournir la totalité, la ligne sera annulée
                      </p>
                    </div>
                    <Switch
                      id="cancel-partial"
                      checked={cancelIfPartial}
                      onCheckedChange={setCancelIfPartial}
                    />
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handlePlaceOrder}
                    disabled={!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.phone?.trim() || !formData.region?.trim() || !formData.city?.trim() || (formData.city === "Autre" && !customCity?.trim()) || !formData.zone?.trim() || !formData.address?.trim() || !selectedPaymentMethod?.trim() || (selectedPaymentMethod === "mobile_money" && !selectedMMProvider?.trim())}
                  >
                    Confirmer la commande
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24 border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="font-serif">Récapitulatif de la commande</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {enhancedItems.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                          <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qté: {item.quantity}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {item.color && !["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"].includes(String(item.color).toUpperCase()) && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                <span
                                  className="h-1.5 w-1.5 rounded-full mr-1 inline-block"
                                  style={{ backgroundColor: item.colorHex?.trim() || item.color || '#ccc' }}
                                />
                                {item.colorName || item.color}
                              </Badge>
                            )}
                            {(() => {
                              const parts: string[] = []
                              if (item.size) parts.push(`${getMesureLabelSafe(item.type_mesure, item.size)} ${item.size}`)
                              if (item.weight && Number(item.weight) > 0) parts.push(`${Number(item.weight)} kg`)
                              return parts.length > 0 ? <span className="text-xs text-muted-foreground">{parts.join(" — ")}</span> : null
                            })()}
                          </div>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          Ar {((item.price ?? 0) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sous-total ({items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)} articles)</span>
                      <span className="text-foreground">Ar {(totalPrice ?? 0).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total</span>
                      <span>Ar {(totalPrice ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
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

