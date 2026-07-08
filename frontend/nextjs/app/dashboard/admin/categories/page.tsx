// @ts-nocheck
"use client"

import { useState, useMemo, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Package, Edit, AlertCircle, Image as ImageIcon, X } from "lucide-react"
import { categoriesApi } from "@/lib/api-client"

const ITEMS_PER_PAGE = 6

interface Category {
  id: string | number
  name?: string
  nom?: string
  description: string
  image?: string | null
  productsCount?: number
}

export default function CategoriesManagementPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState<{ name: string; description: string; image: File | null }>({
    name: "",
    description: "",
    image: null
  })
  const [editCategory, setEditCategory] = useState<{ name: string; description: string; image: File | null }>({
    name: "",
    description: "",
    image: null
  })

  const fetchCategories = async () => {
    setIsLoading(true)
    setError(null)
    const response = await categoriesApi.fetchCategories()
    if (response.success && response.data) {
      setCategories(response.data as Category[])
    } else {
      setError(response.error || "Erreur lors du chargement des catégories")
    }
    setIsLoading(false)
  }

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
  }, [])

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const name = (category.name || category.nom || "").toLowerCase()
      return name.includes(searchQuery.toLowerCase())
    })
  }, [categories, searchQuery])

  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentCategories = filteredCategories.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleAddCategory = async () => {
    if (!newCategory.name.trim() || !newCategory.description.trim()) return
    
    setIsSaving(true)
    setError(null)
    
    // Create FormData to handle file upload
    const formData = new FormData()
    formData.append("nom", newCategory.name)
    formData.append("description", newCategory.description)
    if (newCategory.image) {
      formData.append("image", newCategory.image)
    }
    
    const response = await categoriesApi.createCategory(formData)
    if (response.success && response.data) {
      // Add the new category to the list
      setCategories([...categories, response.data])
      setIsAddDialogOpen(false)
      setNewCategory({ name: "", description: "", image: null })
    } else {
      setError(response.error || "Erreur lors de la création de la catégorie")
    }
    setIsSaving(false)
  }

  const handleEditCategory = async () => {
    if (!editCategory.name.trim() || !editCategory.description.trim() || !selectedCategory) return
    
    setIsSaving(true)
    setError(null)
    
    // Create FormData to handle file upload
    const formData = new FormData()
    formData.append("nom", editCategory.name)
    formData.append("description", editCategory.description)
    if (editCategory.image) {
      formData.append("image", editCategory.image)
    }
    
    const response = await categoriesApi.updateCategory(String(selectedCategory.id), formData)
    if (response.success && response.data) {
      // Update the category in the list
      setCategories(categories.map(cat => cat.id === selectedCategory.id ? response.data : cat))
      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      setEditCategory({ name: "", description: "", image: null })
    } else {
      setError(response.error || "Erreur lors de la modification de la catégorie")
    }
    setIsSaving(false)
  }

  const openEditDialog = (category: any) => {
    setSelectedCategory(category)
    setEditCategory({
      name: category.name || category.nom || "",
      description: category.description || "",
      image: null
    })
    setIsEditDialogOpen(true)
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Gestion des catégories</h1>
            <p className="mt-1 text-muted-foreground">Gérez toutes les catégories de produits</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Search and Add */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher par nom de catégorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 bg-background border-border/60 focus-visible:border-primary"
                />
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-10 text-sm gap-1.5 px-4">
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Ajouter une catégorie</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="add-name">Nom de la catégorie</Label>
                      <Input
                        id="add-name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Entrez le nom de la catégorie"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-description">Description</Label>
                      <Textarea
                        id="add-description"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Entrez la description de la catégorie"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Photo de la catégorie</Label>
                      <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors p-6 text-center cursor-pointer group"
                        onClick={() => document.getElementById('add-image')?.click()}>
                        {newCategory.image ? (
                          <div className="space-y-2">
                            <img 
                              src={URL.createObjectURL(newCategory.image)} 
                              alt="Preview" 
                              className="mx-auto h-24 w-24 object-cover rounded-lg"
                            />
                            <p className="text-sm text-muted-foreground">{newCategory.image.name}</p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setNewCategory(prev => ({ ...prev, image: null }))
                              }}
                              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                              Supprimer
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-center mb-2">
                              <div className="rounded-full bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                                <ImageIcon className="h-6 w-6 text-primary" />
                              </div>
                            </div>
                            <p className="text-sm font-medium text-foreground">Ajouter une photo</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, ou GIF (max 5MB)</p>
                          </div>
                        )}
                      </div>
                      <input
                        id="add-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setNewCategory(prev => ({ ...prev, image: e.target.files?.[0] || null }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleAddCategory} 
                        disabled={!newCategory.name.trim() || !newCategory.description.trim() || isSaving}
                      >
                        {isSaving ? "Ajout..." : "Ajouter"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Categories Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-muted-foreground col-span-full">Chargement des catégories...</p>
          ) : currentCategories.length > 0 ? (
            currentCategories.map((category) => (
              <Card
                key={category.id}
                className="group cursor-pointer overflow-hidden rounded-lg transition-transform transform hover:scale-[1.01] hover:shadow-xl p-0"
                onClick={() => openEditDialog(category)}
              >
                <div className="relative h-48 w-full">
                  <img
                    src={category.image ? category.image : 'https://via.placeholder.com/400x300?text=No+Image'}
                    alt={category.name || category.nom}
                    className="w-full h-full object-cover brightness-75"
                  />

                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-semibold text-lg mb-1 drop-shadow-md">{category.name || category.nom}</h3>
                    <p className="text-sm opacity-90 mb-2 line-clamp-2 drop-shadow-sm">{category.description}</p>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span className="text-sm">{category.productsCount || 0} produits</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full">Aucune catégorie trouvée</p>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier la catégorie</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nom de la catégorie</Label>
                <Input
                  id="edit-name"
                  value={editCategory.name}
                  onChange={(e) => setEditCategory(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Entrez le nom de la catégorie"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editCategory.description}
                  onChange={(e) => setEditCategory(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Entrez la description de la catégorie"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Photo de la catégorie (optionnel)</Label>
                <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors p-6 text-center cursor-pointer group"
                  onClick={() => document.getElementById('edit-image')?.click()}>
                  {editCategory.image ? (
                    <div className="space-y-2">
                      <img 
                        src={URL.createObjectURL(editCategory.image)} 
                        alt="Preview" 
                        className="mx-auto h-24 w-24 object-cover rounded-lg"
                      />
                      <p className="text-sm text-muted-foreground">{editCategory.image.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditCategory(prev => ({ ...prev, image: null }))
                        }}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-center mb-2">
                        <div className="rounded-full bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                          <ImageIcon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground">Ajouter une photo</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, ou GIF (max 5MB)</p>
                    </div>
                  )}
                </div>
                <input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setEditCategory(prev => ({ ...prev, image: e.target.files?.[0] || null }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleEditCategory} 
                  disabled={!editCategory.name.trim() || !editCategory.description.trim() || isSaving}
                >
                  {isSaving ? "Modification..." : "Modifier"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredCategories.length)} sur {filteredCategories.length} catégories
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
