// @ts-nocheck
"use client"

import React, { useState, useRef, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { STATUS_COLORS } from "@/lib/user-badge-colors"
import {
  Camera,
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  Edit2,
  Check,
  X,
  RefreshCw,
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useProfile } from "@/context/profile-context"
import { useRouter } from "next/navigation"
import { ProfileSettingsSkeleton } from "@/components/dashboard-skeletons"
import { ChangePasswordModal } from "@/components/change-password-modal"
import { useAppToast } from "@/context/toast-context"
import { format } from "date-fns"

export default function ClientSettingsPage() {
  const { user, logout: authLogout } = useAuth()
  const { profile, loading, updateProfile, uploadAvatar, fetchProfile } = useProfile()
  const router = useRouter()
  const { addToast } = useAppToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || user?.firstName || "",
    lastName: profile?.lastName || user?.lastName || "",
    phone: profile?.phone || "",
  })

  // Synchroniser formData quand profile ou user change
  useEffect(() => {
    setFormData({
      firstName: profile?.firstName || user?.firstName || "",
      lastName: profile?.lastName || user?.lastName || "",
      phone: profile?.phone || "",
    })
  }, [profile, user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation basique
    if (file.size > 5 * 1024 * 1024) { // 5MB
      addToast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5MB",
        variant: "error",
      })
      return
    }

    if (!file.type.startsWith('image/')) {
      addToast({
        title: "Erreur",
        description: "Veuillez sélectionner une image valide",
        variant: "error",
      })
      return
    }

    try {
      await uploadAvatar(file)
      addToast({
        title: "Succès",
        description: "Photo de profil mise à jour",
        variant: "success",
      })
      // Rafraîchir le profil
      await fetchProfile()
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors du téléchargement",
        variant: "error",
      })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateProfile(formData)
      setIsEditing(false)
      addToast({
        title: "Succès",
        description: "Informations mises à jour",
        variant: "success",
      })
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      firstName: profile?.firstName || user?.firstName || "",
      lastName: profile?.lastName || user?.lastName || "",
      phone: profile?.phone || "",
    })
    setIsEditing(false)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchProfile()
      addToast({
        title: "Succès",
        description: "Profil rafraîchi",
        variant: "success",
      })
    } catch (error) {
      addToast({
        title: "Erreur",
        description: "Erreur lors du rafraîchissement",
        variant: "error",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleLogout = () => {
    authLogout()
    router.replace("/")
  }

  // Données utilisateur réelles
  const userData = {
    email: profile?.email || user?.email || "client@example.com",
    status: profile?.status === "active" ? "Actif" : profile?.status === "inactive" ? "Inactif" : "Suspendu",
    registrationDate: profile?.joinedAt || new Date("2024-01-01"),
    phone: profile?.phone || user?.phone || "+261 34 12 345 67",
  }

  const statusColors: Record<string, string> = {
    "Actif": STATUS_COLORS.actif,
    "Inactif": STATUS_COLORS.inactif,
    "Suspendu": STATUS_COLORS.suspendu,
  }

  if (loading) {
    return (
      <DashboardLayout role="client">
        <ProfileSettingsSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="client">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Paramètres</h1>
          <p className="mt-1 text-muted-foreground">Gérez vos informations personnelles et paramètres de compte.</p>
        </div>

        {/* Informations personnelles */}
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Mettez à jour vos informations personnelles et photo de profil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo de profil */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 cursor-pointer ring-2 ring-border ring-offset-2" onClick={handleAvatarClick}>
                  <AvatarImage src={profile?.avatar || user?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-700 to-amber-950 text-white text-xl">
                    {(profile?.firstName || user?.firstName || "U")[0]}
                    {(profile?.lastName || user?.lastName || "")[0]}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  onClick={handleAvatarClick}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">Photo de profil</h3>
                <p className="text-sm text-muted-foreground">
                  Cliquez pour changer votre photo de profil
                </p>
                <p className="text-xs text-muted-foreground">
                  Formats acceptés: JPG, PNG, GIF. Max 5MB.
                </p>
              </div>
            </div>

            {/* Formulaire d'informations */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={userData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  L'email ne peut pas être modifié
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </Label>
                <PhoneInput
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={(v) => setFormData(prev => ({ ...prev, phone: v }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Informations du compte */}
            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Statut du compte
                </Label>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[userData.status] || "bg-gray-100 text-gray-700"}>
                    {userData.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date d'inscription
                </Label>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(userData.registrationDate), "dd MMMM yyyy")}
                </p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center gap-2 pt-4">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4" />
                  Modifier
                </Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    {isSaving ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="icon"
                className="ml-auto"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Sécurité
            </CardTitle>
            <CardDescription>
              Gérez la sécurité de votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Mot de passe</h4>
                <p className="text-sm text-muted-foreground">
                  Dernière modification il y a 30 jours
                </p>
              </div>
              <Button variant="outline" onClick={() => setPasswordModalOpen(true)}>
                Modifier le mot de passe
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal de changement de mot de passe */}
        <ChangePasswordModal
          open={passwordModalOpen}
          onOpenChange={setPasswordModalOpen}
        />
      </div>
    </DashboardLayout>
  )
}
