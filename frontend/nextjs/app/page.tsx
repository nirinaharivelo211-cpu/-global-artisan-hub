// @ts-nocheck
"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/hero-section"
import { FeaturedProducts } from "@/components/featured-products"
import { PromotionsSection } from "@/components/promotions-section"
import { CategorySection } from "@/components/category-section"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && (user.role === "livreur" || user.role === "admin" || user.role === "manager" || user.role === "artisan")) {
      // redirect restricted roles immediately
      router.push(`/dashboard/${user.role}`)
    }
  }, [user, router])

  // while auth state is resolving, show a blank loader
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // if logged in with a restricted role, render just the loader (prevents flash of content)
  if (user && ["livreur", "admin", "manager", "artisan"].includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProducts />
        <PromotionsSection />
        <CategorySection />
      </main>
      <Footer />
    </div>
  )
}
