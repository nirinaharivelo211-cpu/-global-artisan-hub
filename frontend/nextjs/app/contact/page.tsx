// @ts-nocheck
"use client"

import { useState } from "react"
import { Mail, MapPin, Phone, Send, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { API_BASE_URL } from "@/lib/api-config"

export default function ContactPage() {
  const [form, setForm] = useState({ nom: "", email: "", sujet: "", message: "" })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)
    try {
      const res = await fetch(`${API_BASE_URL}/contact/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.")
        return
      }
      setSuccess(true)
      setForm({ nom: "", email: "", sujet: "", message: "" })
    } catch {
      setError("Impossible de contacter le serveur. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 md:py-28 bg-linear-to-r from-primary/10 to-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h1 className="font-serif text-5xl md:text-6xl font-extrabold text-balance leading-tight">
                Contactez-nous
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Une question, une suggestion ou une collaboration&nbsp;? Nous sommes à votre écoute.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-5 gap-12 max-w-5xl mx-auto">
              {/* Left: Contact info */}
              <div className="md:col-span-2 space-y-8">
                <div>
                  <h2 className="font-serif text-2xl font-semibold mb-6">Nos coordonnées</h2>
                  <div className="space-y-5">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Adresse</p>
                        <p className="text-muted-foreground text-sm">23, Rue Fernand Kasanga<br />Tsimbazaza, Antananarivo<br />Madagascar</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Email</p>
                        <a href="mailto:raoelisonhariliva@gmail.com" className="text-muted-foreground text-sm hover:text-primary transition-colors">
                          raoelisonhariliva@gmail.com
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Téléphone</p>
                        <p className="text-muted-foreground text-sm">261 34 66 363 21</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Form */}
              <div className="md:col-span-3">
                <div className="rounded-2xl shadow-lg bg-background p-8">
                  <h2 className="font-serif text-2xl font-semibold mb-6">Envoyez-nous un message</h2>

                  {success ? (
                    <div className="flex flex-col items-center text-center py-12 space-y-4">
                      <CheckCircle2 className="h-16 w-16 text-green-500" />
                      <h3 className="text-xl font-semibold">Message envoyé !</h3>
                      <p className="text-muted-foreground max-w-sm">
                        Merci de nous avoir contactés. Nous vous répondrons dans les plus brefs délais.
                      </p>
                      <Button variant="outline" onClick={() => setSuccess(false)}>
                        Envoyer un autre message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="nom">Nom complet</Label>
                        <Input id="nom" name="nom" value={form.nom} onChange={handleChange} placeholder="Votre nom" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="votre@email.com" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sujet">Sujet</Label>
                        <Input id="sujet" name="sujet" value={form.sujet} onChange={handleChange} placeholder="Objet de votre message" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" name="message" value={form.message} onChange={handleChange} placeholder="Votre message..." rows={5} required />
                      </div>

                      {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {error}
                        </div>
                      )}

                      <Button type="submit" className="w-full gap-2" disabled={loading}>
                        {loading ? (
                          <>
                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Envoyer
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
