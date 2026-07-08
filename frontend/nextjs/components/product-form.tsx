// @ts-nocheck
"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useProducts } from "@/context/products-context"
import { useAuth } from "@/context/auth-context"
import { useAppToast } from "@/context/toast-context"
import { categoriesApi } from "@/lib/api-client"

interface ProductFormProps {
  product?: any
  onSuccess?: () => void
  onCancel?: () => void
  mode?: "inline" | "modal"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProductForm({ product, onSuccess, onCancel, mode = "inline", open, onOpenChange }: ProductFormProps) {
  const { addProduct, updateProduct } = useProducts()
  const { user } = useAuth()
  const { addToast } = useAppToast()
  const [isLoading, setIsLoading] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])
  const [categories, setCategories] = useState<Array<{ id: any; name: string }>>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [selectedCategory, setSelectedCategory] = useState(product?.category || "")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [weight, setWeight] = useState("")
  const [stock, setStock] = useState("")
  const [colors, setColors] = useState("")
  const [sizes, setSizes] = useState("")

  // Track if form has been initialized to prevent re-initialization during typing
  const [formInitialized, setFormInitialized] = useState(false)
  const prevProductIdRef = useRef<string | undefined>(undefined)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadCategories = async () => {
      const res = await categoriesApi.fetchCategories()
      if (res.success && res.data) {
        const mapped = res.data.map((c: any) => ({ id: c.id, name: c.nom || c.name }))
        setCategories(mapped)
        if (!product && !selectedCategory && mapped.length > 0) {
          setSelectedCategory(String(mapped[0].id))
        }
        if (product?.category) {
          const match = mapped.find((cat) => cat.name === product.category)
          if (match) setSelectedCategory(String(match.id))
        }
      }
    }

    loadCategories()
  }, [])

  useEffect(() => {
    // Only initialize form fields once when modal opens
    // This prevents interrupting user input during typing
    if (mode === "modal" && open) {
      const currentProductId = product?.id
      const prevProductId = prevProductIdRef.current

      // Reset form if switching between different products or if no previous product
      if (prevProductId !== currentProductId) {
        setFormInitialized(false)
        // Clear all fields when switching products
        setName("")
        setDescription("")
        setPrice("")
        setWeight("")
        setStock("")
        prevProductIdRef.current = currentProductId
      }

      if (!formInitialized) {
        if (product) {
          // Editing existing product
          setName(product.name || "")
          setDescription(product.description || "")
          setPrice(product.price != null ? product.price.toString() : "")
          setWeight(product.weight != null ? String(Math.round(Number(product.weight) * 1000)) : "")
          setStock(product.stock != null ? product.stock.toString() : "")
          if (product.variations && Array.isArray(product.variations)) {
            const uniqColors = Array.from(new Set(product.variations.map((v: any) => v.color).filter(Boolean)))
            const uniqSizes = Array.from(new Set(product.variations.map((v: any) => v.size).filter(Boolean)))
            setColors(uniqColors.join(', '))
            setSizes(uniqSizes.join(', '))
          } else {
            setColors("")
            setSizes("")
          }
        } else {
          // Adding new product - keep fields empty
          setName("")
          setDescription("")
          setPrice("")
          setWeight("")
          setStock("")
        }
        setFormInitialized(true)

        // Focus on name field only for new products
        if (!product && nameInputRef.current) {
          setTimeout(() => nameInputRef.current?.focus(), 100)
        }
      }
    } else if (mode === "modal" && !open) {
      // Reset when modal closes
      setFormInitialized(false)
      prevProductIdRef.current = undefined
    }
  }, [open, product?.id, mode, formInitialized])

  useEffect(() => {
    if (product?.images && Array.isArray(product.images)) {
      setPreviews(product.images)
    } else if (product?.image) {
      setPreviews([product.image])
    } else {
      setPreviews([])
    }
  }, [product])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const limited = files.slice(0, 6)
    setImageFiles(limited)
    Promise.all(
      limited.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          }),
      ),
    ).then(setPreviews)
  }

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validName = name.trim()
    const validDescription = description.trim()
    const validPrice = price.trim()
    const validWeight = weight.trim()

    if (!user || !validName || !validPrice || !validWeight || !stock.trim()) {
      addToast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "error" })
      return
    }

    const priceNum = parseFloat(validPrice)
    const stockNum = parseInt(stock.trim())
    const weightNum = parseFloat(validWeight)

    if (isNaN(priceNum) || priceNum <= 0 || isNaN(stockNum) || stockNum < 0 || isNaN(weightNum) || weightNum <= 0) {
      addToast({ title: "Erreur", description: "Veuillez saisir des valeurs valides", variant: "error" })
      return
    }

    setIsLoading(true)

    try {
      if (product) {
        await updateProduct(product.id, {
          name: validName,
          description: validDescription,
          price: priceNum,
          category: selectedCategory,
          poids: weightNum / 1000,
          stock: stockNum,
          colors,
          sizes,
        })
        addToast({ title: "Succès", description: "Produit modifié avec succès" })
        onSuccess?.()
      } else {
        const payload = new FormData()
        payload.append("nom", validName)
        payload.append("description", validDescription)
        payload.append("prix", validPrice)
        payload.append("id_categorie", selectedCategory)
        payload.append("poids", String(weightNum / 1000))
        // stock is managed at the variation level only
        if (colors) payload.append("colors", colors)
        if (sizes) payload.append("sizes", sizes)

        imageFiles.slice(0, 6).forEach((file) => payload.append("images", file))

        const created = await addProduct(payload as any)
        if (created) {
          addToast({ title: "Succès", description: "Produit ajouté avec succès" })
          onSuccess?.()
        } else {
          addToast({ title: "Erreur", description: "Erreur lors de l'ajout du produit", variant: "error" })
        }
      }
    } catch (error) {
      console.error(error)
      addToast({ title: "Erreur", description: "Erreur lors de l'operation", variant: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="image">Images du produit {product ? `(actuellement ${previews.length} image${previews.length > 1 ? "s" : ""})` : ""}</Label>
        <div className="flex items-center gap-4">
          <div className="flex-none w-44">
            <div className="relative border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer group bg-muted/5">
              <input id="image" type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" multiple />
              <div className="flex flex-col items-center justify-center py-2">
                <Upload className="h-6 w-6 text-muted-foreground mb-1 group-hover:text-primary transition-colors" />
                <p className="text-sm font-medium text-foreground">{imageFiles.length > 0 ? `${imageFiles.length} nouvelle${imageFiles.length > 1 ? "s" : ""}` : "Ajouter des images"}</p>
                <p className="text-xs text-muted-foreground">Jusqu'à 6 cliquez ou déposez</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-start shrink-0 flex-wrap">
            {previews.length > 0 ? (
              previews.map((p, i) => (
                <div key={i} className="relative group">
                  <div className="relative h-20 w-20 overflow-hidden rounded-md border border-border shadow-sm bg-muted">
                    <Image src={p} alt={`Image ${i + 1}`} fill className="object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-md transition-opacity flex items-center justify-center">
                    <button type="button" onClick={() => removeImage(i)} className="p-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors" title="Supprimer">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center text-sm text-muted-foreground">Aucune image</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className={product ? "text-muted-foreground" : ""}>Nom du produit</Label>
          <Input ref={nameInputRef} value={name} onChange={(e) => setName(e.target.value)} id="name" placeholder="Ex: Vase en céramique" disabled={!!product} className={product ? "bg-muted cursor-not-allowed opacity-50" : ""} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category" className={product ? "text-muted-foreground" : ""}>Catégorie</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!!product}>
            <SelectTrigger id="category" disabled={!!product} className={product ? "bg-muted cursor-not-allowed opacity-50" : ""}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">Prix (Ar)</Label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} id="price" type="number" step="0.01" placeholder="25.00" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Poids (g)</Label>
          <Input value={weight} onChange={(e) => setWeight(e.target.value)} id="weight" type="number" placeholder="500" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Stock</Label>
          <Input value={stock} onChange={(e) => setStock(e.target.value)} id="stock" type="number" placeholder="10" required />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="colors">Couleurs (séparées par une virgule)</Label>
          <Input value={colors} onChange={(e) => setColors(e.target.value)} id="colors" placeholder="Rouge, Bleu, Vert" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sizes">Tailles (séparées par une virgule)</Label>
          <Input value={sizes} onChange={(e) => setSizes(e.target.value)} id="sizes" placeholder="S, M, L, XL" />
        </div>
      </div>
    </form>
  )

  if (mode === "modal") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif">{product ? "Modifier le produit" : "Ajouter un nouveau produit"}</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif">{product ? "Modifier le produit" : "Ajouter un nouveau produit"}</CardTitle>
        {onCancel && <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>}
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  )
}


