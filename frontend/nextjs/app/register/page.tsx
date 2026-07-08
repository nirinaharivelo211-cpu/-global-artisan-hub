// @ts-nocheck
"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Check, User, Mail, Lock, ShoppingBag, UserCircle, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth, type UserRole } from "@/context/auth-context"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "" as UserRole | "",
    region: "",
  })

  const passwordRequirements = [
    { label: "Au moins 8 caractères", met: formData.password.length >= 8 },
    { label: "Contient un chiffre", met: /\d/.test(formData.password) },
    { label: "Contient une majuscule", met: /[A-Z]/.test(formData.password) },
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.firstName) newErrors.firstName = "Le prénom est requis"
    if (!formData.lastName) newErrors.lastName = "Le nom est requis"
    if (!formData.email) newErrors.email = "L'email est requis"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Veuillez saisir un email valide"
    if (!formData.phone) newErrors.phone = "Le numéro de téléphone est requis"
    if (!formData.password) newErrors.password = "Le mot de passe est requis"
    else if (!passwordRequirements.every((r) => r.met)) newErrors.password = "Le mot de passe ne respecte pas les exigences"
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Les mots de passe ne correspondent pas"
    if (!formData.role) newErrors.role = "Veuillez sélectionner un rôle"
    if (formData.role === "artisan") {
      if (!formData.region) newErrors.region = "La région est requise"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: formData.role as UserRole,
      region: formData.region,
    })
    if (result.success) {
      router.push(`/dashboard/${formData.role}`)
    } else {
      setErrors({ general: result.error || "Échec de l'inscription" })
    }
    setIsLoading(false)
  }

  const roles = [
    { id: "client", label: "Client", icon: ShoppingBag, desc: "Achetez des produits artisanaux" },
    { id: "artisan", label: "Artisan", icon: UserCircle, desc: "Vendez vos créations" },
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8">
        <span className="font-serif text-3xl font-bold text-foreground">E-artisan</span>
      </Link>

      <Card className="w-full max-w-md border-border/50 bg-card shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="font-serif text-2xl">Créer un compte</CardTitle>
          <CardDescription>Rejoignez notre communauté d&apos;artisanat malagasy</CardDescription>
        </CardHeader>
        <CardContent>
          {errors.general && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.general}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Type de compte</Label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => {
                  const Icon = r.icon
                  const selected = formData.role === r.id
                  return (
                    <button key={r.id} type="button" onClick={() => setFormData({ ...formData, role: r.id as UserRole })}
                      className={`relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200 ${
                        selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-muted-foreground/30'
                      }`}>
                      <Icon className={`h-5 w-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>{r.label}</span>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{r.desc}</span>
                    </button>
                  )
                })}
              </div>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> Prénom
                </Label>
                <Input id="firstName" placeholder="Paul"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={`h-11 bg-background ${errors.firstName ? "border-destructive" : ""}`} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> Nom
                </Label>
                <Input id="lastName" placeholder="Rakoto"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={`h-11 bg-background ${errors.lastName ? "border-destructive" : ""}`} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
              </Label>
              <Input id="email" type="email" placeholder="rakotopaul@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`h-11 bg-background ${errors.email ? "border-destructive" : ""}`} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground">Téléphone</Label>
              <PhoneInput id="phone" value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
                className={`h-11 bg-background ${errors.phone ? "border-destructive" : ""}`} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            {formData.role === "artisan" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="region" className="text-xs font-semibold text-muted-foreground">Région</Label>
                  <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
                    <SelectTrigger className={`h-11 bg-background ${errors.region ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Sélectionnez votre région" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Alaotra-Mangoro","Amoron'i Mania","Analamanga","Analanjirofo","Androy","Anosy","Atsimo-Andrefana","Atsimo-Atsinanana","Betsiboka","Boeny","Bongolava","Diana","Ihorombe","Itasy","Melaky","Menabe","Morondava","Sofia","Toliara","Vakinankaratra","Vatovavy","Fitovinany"].map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.region && <p className="text-xs text-destructive">{errors.region}</p>}
                </div>

              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Mot de passe
              </Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Créez un mot de passe"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`h-11 bg-background pr-10 ${errors.password ? "border-destructive" : ""}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && (
                <ul className="mt-2 space-y-1.5">
                  {passwordRequirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs">
                      <div className={`flex items-center justify-center w-4 h-4 rounded-full ${req.met ? 'bg-green-100' : 'bg-muted'}`}>
                        <Check className={`h-2.5 w-2.5 ${req.met ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </div>
                      <span className={req.met ? "text-green-700 font-medium" : "text-muted-foreground"}>{req.label}</span>
                    </li>
                  ))}
                </ul>
              )}
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Confirmer le mot de passe
              </Label>
              <Input id="confirmPassword" type="password" placeholder="Confirmez votre mot de passe"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`h-11 bg-background ${errors.confirmPassword ? "border-destructive" : ""}`} />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création du compte...</>
                : "Créer un compte"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">Se connecter</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
