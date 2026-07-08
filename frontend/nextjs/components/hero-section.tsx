// @ts-nocheck
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"

const CAROUSEL_IMAGES = [
  {
    src: "/couverture.jpg",
    alt: "Artisan workshop with handcrafted ceramics",
  },
  {
    src: "/couverture1.jpg",
    alt: "Traditional Madagascan craftsmanship",
  },
  {
    src: "/couverture2.jpg",
    alt: "Artisan creations and handmade products",
  },
]

export function HeroSection() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const goToImage = (index: number) => {
    setCurrentImageIndex(index)
  }

  const goToPrevious = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length
    )
  }

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length)
  }

  const currentImage = CAROUSEL_IMAGES[currentImageIndex]

  return (
    <section className="relative overflow-hidden bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-xl">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
              Savoir-faire malagasy raffinée
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Chaque pièce raconte une histoire. Connectez-vous à des talentieux artisans malagasy et faites entrer chez vous
              des créations uniques, faconnées avec passion et savoir faire.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/products">
                  Découvrir la collection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/artisans">Nos artisans</Link>
              </Button>
            </div>
          </div>
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl lg:aspect-square">
            {/* Carousel Container */}
            <div className="relative h-full w-full">
              {/* Track: images in a horizontal flex row, translated by index */}
              <div
                className="flex h-full w-full transition-transform duration-700"
                style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
              >
                {CAROUSEL_IMAGES.map((img, i) => (
                  <div key={i} className="shrink-0 h-full w-full">
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Previous Button */}
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                aria-label="Image précédente"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Next Button */}
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                aria-label="Image suivante"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Dots Navigation */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {CAROUSEL_IMAGES.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToImage(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? "bg-white w-8"
                        : "bg-white/50 w-2 hover:bg-white/70"
                    }`}
                    aria-label={`Aller à l'image ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

