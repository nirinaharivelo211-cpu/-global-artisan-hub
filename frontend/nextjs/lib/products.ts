// @ts-nocheck
export interface Product {
  id: string
  name: string
  price: number
  image: string
  artisan: string
  artisanBio: string
  rating: number
  reviewCount: number
  category: string
  description: string
  stock: number
  images: string[]
}

// Categories will be loaded dynamically from API
export const categories = [
  { name: "All", slug: "all" },
]

