// @ts-nocheck
import ProductsClient, { Product } from "./products-client"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"

async function fetchProductsServer() {
  const res = await fetch(`${API_BASE}/produits/`, { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : (data.results || [])
}

async function fetchCategoriesServer() {
  try {
    const res = await fetch(`${API_BASE}/categories/`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    const items = Array.isArray(data) ? data : (data.results || [])
    return items.map((cat: any) => cat.nom || cat.name).filter(Boolean).sort()
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

function mapProduct(item: any): Product {
  return {
    id: String(item.id),
    name: item.nom,
    description: item.description,
    price: parseFloat(item.prix),
    image: item.image || (item.images && item.images.length > 0 ? (item.images[0]?.url || item.images[0]) : ""),
    images: Array.isArray(item.images) && item.images.length > 0
      ? item.images.map((im: any) => im?.url || im)
      : (item.image ? [item.image] : []),
    category: (item.id_categorie?.nom || "").trim(),
    artisan: item.id_utilisateur ? `${item.id_utilisateur.prenom || ''} ${item.id_utilisateur.nom || ''}`.trim() : "",
    rating: Number(item.note_moyenne ?? item.rating ?? 0),
    stock: 0, // Will be calculated from variations
    variations: Array.isArray(item.variations) ? item.variations.map((v: any) => ({
      id: v.id?.toString() || '',
      couleur: v.couleur || v.color || null,
      couleur_nom: v.couleur_nom || null,
      taille: v.taille || v.size || null,
      type_mesure: v.type_mesure || null,
      poids: Number(v.poids || v.weight || 0),
      prix: Number(v.prix || v.price || item.prix || 0),
      remise: v.remise ? Number(v.remise) : undefined,
      stock: Number(v.stock ?? 0),
      seuil_alerte: Number(v.seuil_alerte ?? 5),
      image_url: v.image_url || null,
    })) : [],
  }
}

export default async function ProductsPage() {
  const [data, categories] = await Promise.all([
    fetchProductsServer(),
    fetchCategoriesServer()
  ])
  const products: Product[] = data.map(mapProduct)

  return <ProductsClient initialProducts={products} categories={categories} />
}

