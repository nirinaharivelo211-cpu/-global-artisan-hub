// @ts-nocheck
import Link from "next/link"
import Image from "next/image"
import { Metadata } from 'next'
import { ArrowRight, Palette, Handshake, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Page metadata for SEO */}
        {/* Note: App Router metadata can also be exported as `export const metadata` if preferred */}
        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-linear-to-r from-primary/10 to-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl md:text-6xl font-extrabold text-balance leading-tight">
                Notre histoire
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed prose mx-auto">
                E-artisan valorise l&apos;artisanat traditionnel en connectant des artisans talentueux avec des amoureux du fait main et de l&apos;authenticité.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg">
                <Image
                  src="/ourstory.jpg"
                  alt="our story"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-6">
                <h2 className="font-serif text-3xl md:text-4xl font-semibold">Notre mission</h2>
                <p className="text-muted-foreground leading-relaxed prose">
                  Chaque création artisanale est le reflet d&apos;un savoir faire unique. Notre
                  mission est de bâtir un pont entre l&apos;artisan d&apos;excellence et une consommation
                  responsable, au sein d&apos;une plateforme alliant héritage et modernité.
                </p>
                <p className="text-muted-foreground leading-relaxed prose">
                  Nous sélectionnons chaque création avec soin afin d&apos;honorer à la fois la qualité
                  des pièces et le travail équitable des artisans qui leur donnent vie.
                </p>
                <p className="text-muted-foreground leading-relaxed prose">
                  Comment ça marche — en bref :
                </p>
                <ul className="list-disc list-inside text-muted-foreground prose">
                  <li>Les artisans créent et publient leurs pièces.</li>
                  <li>Nous vérifions l'authenticité et présentons les fiches produit.</li>
                  <li>Les acheteurs commandent en toute confiance via notre plateforme sécurisée.</li>
                  <li>Livraison et suivi : nous aidons pour un acheminement fiable et responsable.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="font-serif text-3xl font-semibold text-center mb-12">Nos valeurs</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="">
                <div className="bg-background/50 rounded-2xl shadow-lg hover:shadow-2xl transition p-6 h-full flex flex-col justify-between">
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Palette className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-medium text-xl">Authenticité</h3>
                    <p className="text-muted-foreground">
                      Chaque produit naît du geste précis d’un artisan, héritier de techniques ancestrales.
                    </p>
                  </div>
                </div>
              </div>
              <div className="">
                <div className="bg-background/50 rounded-2xl shadow-lg hover:shadow-2xl transition p-6 h-full flex flex-col justify-between">
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Handshake className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-medium text-xl">Commerce équitable</h3>
                    <p className="text-muted-foreground">
                      Parce que leur travail a une valeur, les artisans décident eux-mêmes du prix de leurs créations.
                    </p>
                  </div>
                </div>
              </div>
              <div className="">
                <div className="bg-background/50 rounded-2xl shadow-lg hover:shadow-2xl transition p-6 h-full flex flex-col justify-between">
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Leaf className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-medium text-xl">Durabilité</h3>
                    <p className="text-muted-foreground">
                      Soutenir l’artisanat, c’est soutenir une production durable, à faible impact environnemental.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-linear-to-r from-primary/20 to-secondary/20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4">Rejoignez-nous</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 prose">
              Créateurs comme collectionneurs, E-artisan est un lieu de rencontre pour celles et
              ceux qui aiment l’authenticité.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/products">
                  Acheter maintenant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/register">Devenez artisan</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/contact">Nous contacter</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export const metadata: Metadata = {
  title: 'À propos — E-artisan',
  description: "E-artisan met en valeur l'artisanat local: découvrez notre mission, nos valeurs et comment nous soutenons les créateurs.",
  openGraph: {
    title: 'À propos — E-artisan',
    description: "E-artisan met en valeur l'artisanat local: découvrez notre mission, nos valeurs et comment nous soutenons les créateurs.",
    url: '/about',
  },
}

