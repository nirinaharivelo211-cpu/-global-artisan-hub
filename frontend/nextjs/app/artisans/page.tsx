// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usersApi } from "@/lib/api-client"
import { Search, Phone, Mail, MapPin } from "lucide-react"

interface Artisan {
  id: string | number
  prenom?: string
  nom?: string
  email?: string
  telephone?: string
  photo_de_profil?: string
  statut?: string
  region?: string
}

export default function ArtisansPage() {
  const [artisans, setArtisans] = useState<Artisan[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await usersApi.fetchArtisans()
        if (resp.success && resp.data) {
          setArtisans(resp.data)
        } else {
          setArtisans([])
        }
      } catch (e) {
        console.error("Failed to fetch artisans", e)
        setArtisans([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = artisans.filter(a => {
    const full = `${a.prenom || ""} ${a.nom || ""}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-bold">Nos artisans</h1>
          <p className="text-muted-foreground">
            Découvrez les artisans talentueux de Madagascar et leurs créations uniques.
          </p>
        </div>

        <div className="max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un artisan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            {filtered.map((artisan) => (
              <div
                key={artisan.id}
                className="flex flex-col sm:flex-row items-start gap-6 p-6 border rounded-lg shadow-sm hover:shadow-lg hover:scale-[1.02] hover:border-green-600 transition-all duration-300 bg-card cursor-pointer"
              >
                <Avatar className="h-20 w-20 shrink-0">
                  {artisan.photo_de_profil ? (
                    <AvatarImage
                      src={artisan.photo_de_profil}
                      alt={`${artisan.prenom || ""} ${artisan.nom || ""}`}
                    />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {artisan.prenom?.[0] || ""}
                      {artisan.nom?.[0] || ""}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold text-xl text-foreground">
                      {artisan.prenom} {artisan.nom}
                    </p>
                    <Badge
                      variant={artisan.statut === 'actif' ? 'default' : 'secondary'}
                      className={artisan.statut === 'actif' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                    >
                      {artisan.statut === 'actif' ? 'Actif' : artisan.statut || 'Inactif'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {artisan.telephone && (
                      <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <Phone className="h-4 w-4 text-green-600" />
                        <a
                          href={`tel:${artisan.telephone}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {artisan.telephone}
                        </a>
                      </div>
                    )}
                    {artisan.email && (
                      <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <Mail className="h-4 w-4 text-green-600" />
                        <a
                          href={`mailto:${artisan.email}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {artisan.email}
                        </a>
                      </div>
                    )}
                    {artisan.region && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span>{artisan.region}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  asChild
                  className="bg-green-700 hover:bg-green-800 text-white font-medium px-6 py-2 self-start sm:self-center"
                >
                  <Link href={`/artisans/${artisan.id}`}>
                    Voir le profil
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
