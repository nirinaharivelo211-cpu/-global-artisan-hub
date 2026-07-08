"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { ChevronRight, X, Plus, CheckCheck } from "lucide-react"
import { categoriesApi, productsApi } from "@/lib/api-client"
import { useAppToast } from "@/context/toast-context"

type VariantRow = {
  id?: number
  size: string
  color: string
  colorName: string
  weight: string
  price: string
  remise: string
  stock: string
  imageId?: string | null
  locked?: boolean
}

type ImageObj = { id: number; url: string }

type BackendProduct = {
  id: string
  nom?: string
  name?: string
  description?: string
  id_categorie?: { id: number; nom?: string; name?: string } | number
  category_id?: number
  images?: (string | ImageObj)[]
  image?: string
  variations?: Array<{
    taille?: string
    type_mesure?: string
    couleur?: string
    couleur_nom?: string
    poids?: number
    prix?: number
    stock?: number
  }>
}

const defaultVariantRow: VariantRow = { size: "", color: "", colorName: "", weight: "", price: "", remise: "", stock: "", imageId: null, locked: false }

const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"]
const variantTypeOptions = [
  { value: "taille", label: "Taille" },
  { value: "dimensions", label: "Dimensions" },
  { value: "pointures", label: "Pointures" },
  { value: "diametre", label: "Diamètre" }
]

const predefinedColors = [
  { name: "Noir", hex: "#000000" },
  { name: "Blanc", hex: "#FFFFFF" },
  { name: "Rouge", hex: "#FF0000" },
  { name: "Bleu", hex: "#0000FF" },
  { name: "Vert", hex: "#00FF00" },
  { name: "Jaune", hex: "#FFFF00" },
  { name: "Orange", hex: "#FFA500" },
  { name: "Violet", hex: "#800080" },
  { name: "Rose", hex: "#FFC0CB" },
  { name: "Gris", hex: "#808080" },
  { name: "Marron", hex: "#A52A2A" },
  { name: "Beige", hex: "#F5F5DC" },
]

declare class EyeDropper {
  constructor()
  open(): Promise<{ sRGBHex: string }>
}

async function eyeDropperPick(): Promise<string | null> {
  if (typeof window === 'undefined' || typeof EyeDropper === 'undefined') return null
  try {
    const dropper = new EyeDropper()
    const result = await dropper.open()
    return result?.sRGBHex ?? null
  } catch {
    return null
  }
}

function AddProductPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [loadedProductCategory, setLoadedProductCategory] = useState("")
  const [description, setDescription] = useState("")

  const [categories, setCategories] = useState<Array<{ id: any; name: string }>>([])
  const [variants, setVariants] = useState<VariantRow[]>(Array.from({ length: 3 }, () => ({ ...defaultVariantRow })))
  const variantsTableRef = useRef<HTMLTableSectionElement>(null)
  const prevVariantsLength = useRef(variants.length)

  useEffect(() => {
    if (variants.length > prevVariantsLength.current) {
      prevVariantsLength.current = variants.length
      const tableBody = variantsTableRef.current
      if (tableBody) {
        const lastRow = tableBody.lastElementChild
        if (lastRow) {
          lastRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          const firstField = lastRow.querySelector<HTMLElement>('input, [role="combobox"]')
          if (firstField) firstField.focus()
        }
      }
    } else if (variants.length < prevVariantsLength.current) {
      prevVariantsLength.current = variants.length
    }
  }, [variants.length])
  const [showSize, setShowSize] = useState(true)
  const [showColor, setShowColor] = useState(true)
  const [showWeight, setShowWeight] = useState(true)
  const [showRemise, setShowRemise] = useState(false)
  const [variantType, setVariantType] = useState<"taille" | "dimensions" | "pointures" | "diametre">("taille")

  const [customColors, setCustomColors] = useState<Array<{ name: string; hex: string }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('artisan_custom_colors')
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return []
  })
  useEffect(() => {
    localStorage.setItem('artisan_custom_colors', JSON.stringify(customColors))
  }, [customColors])
  const [customColorName, setCustomColorName] = useState("")
  const [customColorHex, setCustomColorHex] = useState("#000000")
  const [openColorPickerIndex, setOpenColorPickerIndex] = useState<number | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [selectedVariantIndices, setSelectedVariantIndices] = useState<Set<number>>(new Set())
  const [images, setImages] = useState<(File | null)[]>([null, null, null, null, null, null])
  const [previews, setPreviews] = useState<string[]>([])
  const [originalPreviews, setOriginalPreviews] = useState<string[]>([])
  const [originalImageIds, setOriginalImageIds] = useState<(number | null)[]>([null, null, null, null, null, null])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const blobUrls = useRef<string[]>([])
  const toDeleteImageIds = useRef<Set<number>>(new Set())

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { addToast } = useAppToast()

  useEffect(() => {
    const loadCategories = async () => {
      const res = await categoriesApi.fetchCategories()
      if (res.success && res.data) {
        setCategories(res.data.map((cat: any) => ({ id: cat.id, name: cat.nom || cat.name })))
        // Don't set default category here, let the product loading handle it
      }
    }
    loadCategories()
  }, [])

  // Set default category when categories are loaded (only for new products)
  useEffect(() => {
    if (!editId && categories.length > 0 && !category) {
      setCategory(String(categories[0].id))
    }
  }, [categories, editId, category])

  // Load product data if editing
  useEffect(() => {
    if (editId && categories.length > 0) {
      setIsLoading(true)
      const loadProduct = async () => {
        const result = await productsApi.getProduct(editId)
        if (result.success && result.data) {
          const product = result.data as BackendProduct
          
          // Pre-fill form with product data
          setName(product.nom || product.name || "")
          setDescription(product.description || "")
          const rawCategory = product.id_categorie
          const loadedCategory = String(
            typeof rawCategory === "object" && rawCategory !== null
              ? rawCategory.id
              : rawCategory || product.category_id || ""
          )
          setLoadedProductCategory(loadedCategory)
          setCategory(loadedCategory)
          
          // Load images if available
          if (product.images && Array.isArray(product.images)) {
            const ids: (number | null)[] = []
            const urls: string[] = []
            product.images.slice(0, 6).forEach((img) => {
              if (typeof img === 'object' && img !== null && 'id' in img) {
                ids.push(img.id)
                urls.push(img.url)
              } else if (typeof img === 'string') {
                ids.push(null)
                urls.push(img)
              }
            })
            while (urls.length < 6) {
              urls.push("")
              ids.push(null)
            }
            setPreviews(urls)
            setOriginalPreviews([...urls])
            setOriginalImageIds(ids)
            toDeleteImageIds.current.clear()
          } else if (product.image) {
            const existingPreviews = [product.image, "", "", "", "", ""]
            setPreviews(existingPreviews)
            setOriginalPreviews([...existingPreviews])
            setOriginalImageIds([null, null, null, null, null, null])
            toDeleteImageIds.current.clear()
          }
          
          // Load variations
          if (product.variations && Array.isArray(product.variations)) {
            const loadedVariants = product.variations.map((v: any) => ({
              id: v.id,
              size: v.taille || "",
              color: v.couleur || "",
              colorName: v.couleur_nom || "",
              weight: String((v.poids || 0) * 1000),
              price: String(v.prix || ""),
              remise: String(v.remise || ""),
              stock: String(v.stock || ""),
              imageId: v.image_id ? String(v.image_id) : null,
              locked: true,
            }))
            const sortedVariants = [...loadedVariants].sort((a, b) => {
              const colorA = (a.colorName || a.color || "").toLowerCase()
              const colorB = (b.colorName || b.color || "").toLowerCase()
              return colorA.localeCompare(colorB)
            })
            setVariants(sortedVariants.length > 0 ? sortedVariants : Array.from({ length: 3 }, () => ({ ...defaultVariantRow })))
            
            // Determine which fields to show based on variations
            const hasSizes = loadedVariants.some(v => v.size)
            const hasColors = loadedVariants.some(v => v.color)
            const hasWeights = loadedVariants.some(v => v.weight)
            const hasRemises = loadedVariants.some(v => v.remise)
            
            setShowSize(hasSizes)
            setShowColor(hasColors)
            setShowWeight(hasWeights)
            setShowRemise(hasRemises)

            // Restore type_mesure from first variation
            const firstMesure = product.variations.find((v: any) => v.type_mesure)
            if (firstMesure?.type_mesure) {
              setVariantType(firstMesure.type_mesure as "taille" | "dimensions" | "pointures" | "diametre")
            }
          }
        }
        setIsLoading(false)
      }
      loadProduct()
    }
  }, [editId, categories])

  // Remove the useEffect that was causing preview conflicts
  // Stable blob URL cache — track file ref → URL per slot
  const fileCache = useRef<Map<File, string>>(new Map())

  useEffect(() => {
    const newPreviews = images.map((file, index) => {
      if (file) {
        let cached = fileCache.current.get(file)
        if (!cached) {
          cached = URL.createObjectURL(file)
          fileCache.current.set(file, cached)
        }
        return cached
      }
      return originalPreviews[index] || ""
    })
    setPreviews(newPreviews)

    // Garbage collect — revoke URLs for files no longer in any slot
    const activeFiles = new Set(images.filter(Boolean) as File[])
    fileCache.current.forEach((url, f) => {
      if (!activeFiles.has(f)) {
        URL.revokeObjectURL(url)
        fileCache.current.delete(f)
      }
    })
    return () => {
      fileCache.current.forEach((url) => URL.revokeObjectURL(url))
      fileCache.current.clear()
    }
  }, [images, originalPreviews])

  const handleImageClick = (index: number) => {
    if (selectedVariantIndices.size > 0 && previews[index]) {
      const actualId = originalImageIds[index] ?? (index + 1)
      setVariants((prev) =>
        prev.map((row, i) =>
          selectedVariantIndices.has(i)
            ? { ...row, imageId: actualId !== null ? String(actualId) : null }
            : row,
        ),
      )
      setSelectedImageIndex(index)
      setSelectedVariantIndices(new Set())
    } else if (previews[index]) {
      setSelectedImageIndex(index)
    } else {
      const fileInput = document.getElementById(`image-input-${index}`) as HTMLInputElement
      fileInput?.click()
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.map((img, i) => i === index ? null : img))
    if (originalImageIds[index] !== null) {
      toDeleteImageIds.current.add(originalImageIds[index]!)
      setOriginalImageIds((prev) => prev.map((id, i) => i === index ? null : id))
      setOriginalPreviews((prev) => prev.map((url, i) => i === index ? "" : url))
    }
    if (selectedImageIndex === index) {
      setSelectedImageIndex(null)
    }
  }

  const handleVariantUpdate = (index: number, key: keyof VariantRow, value: string) => {
    setVariants((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    )
  }

  const handleColorSelect = (index: number, colorHex: string, colorName: string) => {
    setVariants((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              color: colorHex,
              colorName: colorName,
            }
          : row,
      ),
    )
  }

  const addCustomColor = (rowIndex?: number) => {
    if (!customColorName.trim()) return
    if (allColors.some(c => c.hex.toLowerCase() === customColorHex.toLowerCase())) {
      addToast({ title: "Couleur déjà existante", description: `"${customColorName}" (${customColorHex}) est déjà dans la palette.`, variant: "error" })
      return
    }
    const newColor = { name: customColorName.trim(), hex: customColorHex }
    setCustomColors(prev => [...prev, newColor])
    addToast({ title: "Couleur ajoutée", description: `"${newColor.name}" ajoutée à la palette. Cliquez dessus pour l'affecter.`, variant: "success" })
    setCustomColorName("")
    setCustomColorHex("#000000")
    if (typeof rowIndex === "number") {
      handleColorSelect(rowIndex, newColor.hex, newColor.name)
    }
  }

  const allColors = [...predefinedColors, ...customColors]

  const isDuplicateVariant = (newVariant: typeof defaultVariantRow): boolean => {
    return variants.some((v) => {
      if (v === newVariant) return false
      const sizeMatch = !showSize || (v.size && newVariant.size && v.size === newVariant.size)
      const colorMatch = !showColor || (v.color && newVariant.color && v.color === newVariant.color)
      return sizeMatch && colorMatch
    })
  }

  const validateVariants = (): boolean => {
    // Check if any variant fields are enabled
    const hasVariants = showSize || showColor || showWeight

    if (!hasVariants) {
      // If no variants, ensure at least one image is uploaded
      const hasImages = images.some(img => img !== null)
      if (!hasImages) {
        addToast({
          title: "Erreur",
          description: "Veuillez ajouter au moins une image pour le produit",
          variant: "error"
        })
        return false
      }
      return true
    }

    // If variants are enabled, validate each variant row
    const filledVariants = variants.filter(v =>
      (showSize ? v.size.trim() : true) &&
      (showColor ? v.color.trim() : true)
    )

    if (filledVariants.length === 0) {
      addToast({
        title: "Erreur",
        description: "Veuillez définir au moins une variante complète",
        variant: "error"
      })
      return false
    }

    // Check for duplicate combinations
    const seen = new Set<string>()
    for (const v of filledVariants) {
      const key = `${showSize ? v.size.trim() : ""}|${showColor ? v.color.trim() : ""}`
      if (seen.has(key)) {
        addToast({
          title: "Erreur",
          description: "Vous avez des variantes avec la même combinaison de taille et couleur",
          variant: "error"
        })
        return false
      }
      seen.add(key)
    }

    // Validate that all required fields are filled for each variant
    for (let i = 0; i < filledVariants.length; i++) {
      const v = filledVariants[i]

      if (showSize && !v.size.trim()) {
        addToast({
          title: "Erreur",
          description: `Variante ${i + 1}: La taille est requise`,
          variant: "error"
        })
        return false
      }

      if (showColor && !v.color.trim()) {
        addToast({
          title: "Erreur",
          description: `Variante ${i + 1}: La couleur est requise`,
          variant: "error"
        })
        return false
      }

      if (showWeight && (!v.weight.trim() || isNaN(Number(v.weight)) || Number(v.weight) <= 0)) {
        addToast({
          title: "Erreur",
          description: `Variante ${i + 1}: Le poids doit être un nombre positif`,
          variant: "error"
        })
        return false
      }

      if (!v.price.trim() || isNaN(Number(v.price)) || Number(v.price) <= 0) {
        addToast({
          title: "Erreur",
          description: `Variante ${i + 1}: Le prix doit être un nombre positif`,
          variant: "error"
        })
        return false
      }

      if (!v.stock.trim() || isNaN(Number(v.stock)) || Number(v.stock) < 0) {
        addToast({
          title: "Erreur",
          description: `Variante ${i + 1}: Le stock doit être un nombre positif ou nul`,
          variant: "error"
        })
        return false
      }
    }

    // Ensure at least one image is uploaded (accepted: upload new images OR existing previews from product)
    const hasImages = images.some(img => img !== null) || previews.some((p) => !!p)
    if (!hasImages) {
      addToast({
        title: "Erreur",
        description: "Veuillez ajouter au moins une image pour le produit",
        variant: "error"
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!name.trim() || !category) {
      addToast({ title: "Erreur", description: "Veuillez remplir les champs requis", variant: "error" })
      setIsSubmitting(false)
      return
    }

    if (!validateVariants()) {
      setIsSubmitting(false)
      return
    }

    try {
      const payload = new FormData()
      payload.append("nom", name)
      payload.append("description", description)
      payload.append("id_categorie", category)

      const validVariants = variants
        .filter((v) => (showSize ? v.size.trim() : true) && (showColor ? v.color.trim() : true))
        .map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          taille: v.size || null,
          type_mesure: showSize ? variantType : null,
          couleur: v.color || null,
          couleur_nom: v.colorName || null,
          poids: showWeight ? Number(v.weight || 0) / 1000 : 0,
          prix: Number(v.price || 0),
          remise: showRemise && v.remise ? Number(v.remise) : null,
          stock: Number(v.stock || 0),
          image_id: v.imageId ?? null,
        }))

      // Set a default price from the first variation or 0
      const defaultPrice = validVariants.length > 0 ? validVariants[0].prix : 0
      payload.append("prix", String(defaultPrice))

      payload.append("variations", JSON.stringify(validVariants))
      if (editId && toDeleteImageIds.current.size > 0) {
        payload.append("delete_image_ids", JSON.stringify(Array.from(toDeleteImageIds.current)))
      }
      images.filter(Boolean).slice(0, 6).forEach((file) => payload.append("images", file!))
      
      const response = editId 
        ? await productsApi.updateProduct(editId, payload as any)
        : await productsApi.createProduct(payload as any)

      if (response.success) {
        addToast({ 
          title: editId ? "Produit modifié" : "Produit ajouté", 
          description: editId ? "Le produit a été modifié avec succès" : "Le produit a été créé avec succès" 
        })
        router.push("/dashboard/artisan/products")
      } else {
        addToast({ title: "Erreur", description: response.error || "Impossible de sauvegarder le produit", variant: "error" })
      }
    } catch (error) {
      console.error(error)
      addToast({ title: "Erreur", description: "Erreur serveur", variant: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPreviewForVariant = (imageId: string | null | undefined): string => {
    if (!imageId) return ""
    const id = parseInt(imageId)
    if (id >= 1 && id <= 6 && previews[id - 1]) return previews[id - 1]
    const slotIdx = originalImageIds.indexOf(id)
    if (slotIdx >= 0 && previews[slotIdx]) return previews[slotIdx]
    return ""
  }

  const renderSizeInput = (value: string, onChange: (val: string) => void, disabled = false) => {
    if (disabled) {
      return (
        <div className="rounded-md border border-border/50 bg-slate-100 px-3 py-2 text-sm text-muted-foreground">
          {value || "—"}
        </div>
      )
    }

    if (variantType === "taille") {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {sizeOptions.map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    } else if (variantType === "dimensions") {
      return (
        <Input
          value={value}
          onChange={(e) => {
            const val = e.target.value
            if (/^[0-9xX\.\s-]*$/.test(val) || val === "") {
              onChange(val)
            }
          }}
          placeholder="50x40"
        />
      )
    } else if (variantType === "pointures") {
      return (
        <Input
          value={value}
          onChange={(e) => {
            const val = e.target.value
            if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === "") {
              onChange(val)
            }
          }}
          placeholder="38"
        />
      )
    } else if (variantType === "diametre") {
      return (
        <Input
          value={value}
          onChange={(e) => {
            const val = e.target.value
            if (/^[0-9]*\s*(cm)?$/.test(val) || val === "") {
              onChange(val)
            }
          }}
          placeholder="25cm"
        />
      )
    }
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Taille"
      />
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout role="artisan">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Chargement du produit...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="artisan">
      <main className="min-h-screen">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/artisan/products" className="transition hover:text-foreground">
            Mes produits
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">
            {editId ? "Modifier le produit" : "Ajouter un produit"}
          </span>
        </nav>
        <h1 className="font-serif text-3xl font-bold text-foreground">{editId ? "Modifier le produit" : "Ajouter un produit"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{editId ? "Modifiez les informations du produit et ses variantes." : "Complétez les informations générales, configurez les variantes puis téléversez jusqu'à 6 images."}</p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <Card className="border-border/50 bg-card">
              <CardHeader>
                <CardTitle>Information générale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du produit</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: T-shirt coton bio" required disabled={!!editId} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select value={categories.length > 0 ? category : ""} onValueChange={(val) => setCategory(val)} disabled={!!editId}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card">
              <CardHeader>
                <CardTitle>Variantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={showSize} onChange={(e) => setShowSize(e.target.checked)} /> Mesure
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={showColor} onChange={(e) => setShowColor(e.target.checked)} /> Couleur
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={showWeight} onChange={(e) => setShowWeight(e.target.checked)} /> Poids
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={showRemise} onChange={(e) => setShowRemise(e.target.checked)} /> Remise %
                  </label>
                </div>

                <div className="max-h-60 overflow-x-auto overflow-y-auto">
                    <table className="w-[920px] table-fixed text-left text-sm">
                      <thead className="sticky top-0 bg-card z-10">
                        <tr>
                          <th className="border-b px-3 py-2 w-24">Ligne</th>
                          {showSize && (
                            <th className="border-b px-3 py-2 w-44">
                              <Select value={variantType} onValueChange={(val: any) => setVariantType(val)} disabled={!!editId}>
                                <SelectTrigger className="w-full h-8 text-sm" style={{ minWidth: 170 }}>
                                  <SelectValue placeholder="Type de variante" />
                                </SelectTrigger>
                                <SelectContent>
                                  {variantTypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </th>
                          )}
                          {showColor && <th className="border-b px-3 py-2 w-32">Couleur</th>}
                          {showWeight && <th className="border-b px-3 py-2 w-32">Poids (g)</th>}
                          <th className="border-b px-3 py-2 w-32">Prix (Ar)</th>
                          {showRemise && <th className="border-b px-3 py-2 w-32">Remise (%)</th>}
                          <th className="border-b px-3 py-2 w-32">Stock</th>
                          <th className="border-b px-3 py-2 w-16"></th>
                        </tr>
                      </thead>
                      <tbody ref={variantsTableRef}>
                        {variants.map((variant, originalIndex) => {
                          const isDuplicate = variants.some((v, i) => i !== originalIndex && 
                            (!showSize || (v.size && variant.size && v.size === variant.size)) && 
                            (!showColor || (v.color && variant.color && v.color === variant.color))
                          )
                          const disableVariantFields = !!editId && !!variant.locked
                          return (
                          <tr
                            key={originalIndex}
                            onClick={(e) => {
                              const target = e.target as HTMLElement
                              if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.closest('[role="combobox"]') || target.closest('[role="dialog"]')) return
                              setSelectedVariantIndices(prev => {
                                const next = new Set(prev)
                                if (next.has(originalIndex)) next.delete(originalIndex)
                                else next.add(originalIndex)
                                return next
                              })
                            }}
                            className={`border-b cursor-pointer transition-colors ${
                              selectedVariantIndices.has(originalIndex)
                                ? 'bg-amber-50 dark:bg-amber-950/30 ring-2 ring-amber-300 ring-inset'
                                : 'hover:bg-muted/40'
                            } ${isDuplicate ? 'bg-red-50 dark:bg-red-950' : ''}`}
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                {getPreviewForVariant(variant.imageId) && (
                                  <div className="relative w-8 h-8 rounded overflow-hidden border border-border shrink-0">
                                    <Image
                                      src={getPreviewForVariant(variant.imageId)}
                                      alt=""
                                      fill
                                      sizes="32px"
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <span>{originalIndex + 1}</span>
                              </div>
                            </td>
                            {showSize && (
                              <td className="px-3 py-2">
                                {renderSizeInput(variant.size, (val) => handleVariantUpdate(originalIndex, "size", val), disableVariantFields)}
                              </td>
                          )}
                          {showColor && (
                            <td className="px-3 py-2">
                              {disableVariantFields ? (
                                <div className="flex items-center gap-2 rounded-md border border-border/50 bg-slate-100 p-2 text-xs text-muted-foreground">
                                  <span
                                    className="h-5 w-5 rounded-full border border-gray-300"
                                    style={{ backgroundColor: variant.color || '#ffffff' }}
                                  />
                                  <span>{variant.colorName || variant.color || 'Aucune couleur'}</span>
                                </div>
                              ) : (
                                <div className="relative">
<Dialog open={openColorPickerIndex === originalIndex} onOpenChange={(open) => { setOpenColorPickerIndex(open ? originalIndex : null) }}>
                                  <DialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50 min-w-30"
                                    >
                                      <div
                                        className="w-6 h-6 rounded border border-gray-300"
                                        style={{ backgroundColor: variant.color || '#ffffff' }}
                                      />
                                      <span className="text-xs truncate">{variant.colorName || 'Sélectionner'}</span>
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md p-4">
                                    <DialogHeader>
                                      <DialogTitle>Palette de couleurs</DialogTitle>
                                      <DialogDescription>Choisissez une couleur ou ajoutez-en une nouvelle.</DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-60 overflow-y-auto">
                                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 mt-4">
                                      {allColors.map((color) => (
                                        <button
                                          key={color.hex}
                                          type="button"
                                          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all ${
                                            variant.color === color.hex ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'
                                          }`}
                                          onClick={() => {
                                            handleColorSelect(originalIndex, color.hex, color.name)
                                            setOpenColorPickerIndex(null)
                                          }}
                                          title={color.name}
                                        >
                                          <span
                                            className={`w-9 h-9 rounded-full border-2 shrink-0 ${
                                              variant.color === color.hex ? 'border-blue-500 scale-110' : 'border-gray-300'
                                            } transition-transform`}
                                            style={{ backgroundColor: color.hex }}
                                          />
                                          <span className="text-[10px] leading-tight text-gray-600 truncate max-w-[44px]">
                                            {color.name}
                                          </span>
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => setShowCustomForm(prev => !prev)}
                                        className="flex flex-col items-center justify-center gap-0.5 p-1 rounded-lg hover:bg-gray-50"
                                        title="Ajouter une couleur personnalisée"
                                      >
                                        <span className="w-9 h-9 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center">
                                          <Plus className="w-4 h-4 text-gray-500" />
                                        </span>
                                        <span className="text-[10px] leading-tight text-gray-400 truncate max-w-[44px]">
                                          Ajouter
                                        </span>
                                      </button>
                                    </div>
                                    </div>
                                    {showCustomForm && (
                                      <div className="mt-3 space-y-3 border-t pt-3">
                                        <Label htmlFor={`custom-color-name-${originalIndex}`}>Nouvelle couleur</Label>
                                        <Input
                                          id={`custom-color-name-${originalIndex}`}
                                          placeholder="Nom de la couleur"
                                          value={customColorName}
                                          onChange={(e) => setCustomColorName(e.target.value)}
                                        />
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="color"
                                            value={customColorHex}
                                            onChange={(e) => setCustomColorHex(e.target.value)}
                                            className="w-12 h-12 border rounded cursor-pointer"
                                          />
                                          <Input
                                            value={customColorHex}
                                            onChange={(e) => setCustomColorHex(e.target.value)}
                                            placeholder="#000000"
                                            className="font-mono"
                                          />
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="shrink-0"
                                            onClick={async () => {
                                              setOpenColorPickerIndex(null)
                                              const hex = await eyeDropperPick()
                                              setCustomColorHex(hex || '#000000')
                                              setOpenColorPickerIndex(originalIndex)
                                              setTimeout(() => {
                                                document.getElementById(`custom-color-name-${originalIndex}`)?.focus()
                                              }, 100)
                                            }}
                                            title="Capturer une couleur avec la pipette"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22 20 2"/><path d="m20 2 2 2"/><path d="m7 10 3 3"/><path d="M17 7a3 3 0 0 0-3-3L7 11l3 3Z"/></svg>
                                          </Button>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button size="sm" onClick={() => addCustomColor(originalIndex)} disabled={!customColorName.trim()}>
                                            Ajouter
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => { setShowCustomForm(false); setCustomColorName(""); setCustomColorHex("#000000") }}>
                                            Annuler
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                  </DialogContent>
                                </Dialog>
                              </div>
                              )}
                            </td>
                          )}
                          {showWeight && (
                            <td className="px-3 py-2 w-32">
                              <Input
                                className="w-full"
                                type="number"
                                min={0}
                                value={variant.weight}
                                placeholder="Ex: 500"
                                onChange={(e) => handleVariantUpdate(originalIndex, "weight", e.target.value)}
                              />
                            </td>
                          )}
                          <td className="px-3 py-2 w-32">
                            <Input
                              className="w-full"
                              type="number"
                              step="0.01"
                              min={0}
                              value={variant.price}
                              onChange={(e) => handleVariantUpdate(originalIndex, "price", e.target.value)}
                            />
                          </td>
                          {showRemise && (
                            <td className="px-3 py-2 w-32">
                              <Input
                                className="w-full"
                                type="number"
                                step="0.01"
                                min={0}
                                max={100}
                                placeholder="—"
                                value={variant.remise}
                                onChange={(e) => handleVariantUpdate(originalIndex, "remise", e.target.value)}
                              />
                            </td>
                          )}
                          <td className="px-3 py-2 w-32">
                            <Input
                              className="w-full"
                              type="number"
                              min={0}
                              value={variant.stock}
                              onChange={(e) => handleVariantUpdate(originalIndex, "stock", e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setVariants((prev) => prev.filter((_, i) => i !== originalIndex))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVariants((prev) => [...prev, { ...defaultVariantRow }])}
                  >
                    + Ajouter
                  </Button>
                  {selectedVariantIndices.size > 1 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCheck className="h-4 w-4 text-amber-600" />
                      <span>{selectedVariantIndices.size} variantes sélectionnées</span>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline ml-1"
                        onClick={() => { setSelectedVariantIndices(new Set()) }}
                      >
                        Effacer
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/50 bg-card">
              <CardHeader>
                <CardTitle>Images du produit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Large image display */}
                <div className="relative h-48 sm:h-64 w-full overflow-hidden rounded-lg border border-border bg-secondary cursor-pointer" onClick={() => document.getElementById('multi-image-input')?.click()}>
                  {selectedImageIndex !== null && previews[selectedImageIndex] ? (
                    <Image src={previews[selectedImageIndex]} alt={`Image ${selectedImageIndex + 1}`} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <Plus className="h-12 w-12" />
                    </div>
                  )}
                </div>

                {/* Small images */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {/* Hidden input for multiple file selection */}
                  <input
                    id="multi-image-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (!e.target.files) return
                      const files = Array.from(e.target.files)
                      setImages((prev) => {
                        const newImages = [...prev]
                        let slotIdx = 0
                        files.forEach((file) => {
                          // Skip slots with a File already OR a server image in originalPreviews
                          while (
                            slotIdx < newImages.length &&
                            (newImages[slotIdx] !== null || originalPreviews[slotIdx])
                          ) slotIdx++
                          if (slotIdx < newImages.length) newImages[slotIdx] = file
                        })
                        return newImages
                      })
                      if (files.length > 0) {
                        const firstFree = images.findIndex((img, i) => img === null && !originalPreviews[i])
                        setSelectedImageIndex(firstFree >= 0 ? firstFree : 0)
                      }
                    }}
                    className="hidden"
                  />
                  
                  {images.map((_, index) => (
                    <div key={index} className="relative group">
                      <input
                        id={`image-input-${index}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (!e.target.files || e.target.files.length === 0) return
                          const file = e.target.files[0]
                          if (originalImageIds[index] !== null) {
                            toDeleteImageIds.current.add(originalImageIds[index]!)
                            setOriginalImageIds((prev) => prev.map((id, i) => i === index ? null : id))
                            setOriginalPreviews((prev) => prev.map((url, i) => i === index ? "" : url))
                          }
                          setImages((prev) => prev.map((img, i) => i === index ? file : img))
                          setSelectedImageIndex(index)
                        }}
                        className="hidden"
                      />
                      <div
                        className="relative h-16 w-full overflow-hidden rounded border border-border bg-secondary cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => handleImageClick(index)}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            const file = e.dataTransfer.files[0]
                            setImages((prev) => prev.map((img, i) => i === index ? file : img))
                            setSelectedImageIndex(index)
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {previews[index] ? (
                          <>
                            <Image
                              src={previews[index]}
                              alt={`Miniature ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                            {/* Remove button */}
                            <button
                              type="button"
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeImage(index)
                              }}
                              title="Supprimer l'image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Plus className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="lg:sticky lg:top-28">
              <Card className="border-border/50 bg-card">
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Quand vous avez fini, cliquez sur Enregistrer pour {editId ? "modifier" : "créer"} le produit avec variantes, prix et images.</p>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (editId ? "Modification..." : "Création...") : (editId ? "Modifier le produit" : "Créer le produit")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </DashboardLayout>
  )
}

export default function AddProductPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddProductPageContent />
    </Suspense>
  )
}
