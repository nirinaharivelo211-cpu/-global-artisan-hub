// @ts-nocheck
"use client"

import React, { useState, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  User,
  Mail,
  Phone,
  FileText,
  Lock,
  LogOut,
  Calendar,
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

export default function ArtisanSettingsPage() {
  const { logout: authLogout } = useAuth()
  const { profile, loading, updateProfile, uploadAvatar, fetchProfile } = useProfile()
  const router = useRouter()
  const { addToast } = useAppToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    phone: profile?.phone || "",
    description: profile?.description || "",
  })

  // Synchroniser formData quand profile change
  React.useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone || "",
        description: profile.description || "",
      })
    }
  }, [profile])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchProfile()
      addToast({
        title: "Succès",
        description: "Profil rafraîchi",
        variant: "success",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        await uploadAvatar(file)
      } catch (error) {
        addToast({
          title: "Erreur",
          description: "Impossible de charger l'avatar",
          variant: "error",
        })
      }
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateProfile(formData)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone || "",
        description: profile.description || "",
      })
    }
    setIsEditing(false)
  }

  const handleLogout = () => {
    authLogout()
    router.replace("/")
    addToast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
      variant: "info",
    })
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-amber-100 text-amber-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "active":
        return "Actif"
      case "pending":
        return "En attente"
      case "inactive":
        return "Inactif"
      default:
        return "Inconnu"
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="artisan">
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
              Paramètres
            </h1>
          </div>
          <Card className="border-border/50 bg-card">
            <CardContent className="pt-6">
              <ProfileSettingsSkeleton />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!profile) {
    return (
      <DashboardLayout role="artisan">
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
              Paramètres
            </h1>
          </div>
          <Card className="border-destructive bg-card">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">
                Erreur: Impossible de charger le profil
              </p>
              <Button onClick={handleRefresh} className="mt-4" variant="outline">
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="artisan">
      <div className="space-y-6">
        {/* Header avec refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
              Paramètres
            </h1>
            <p className="mt-1 text-muted-foreground">
              Gérez vos informations et préférences de compte
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:bg-secondary transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Profile Section */}
        <Card className="border-border/50 bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif">Profil</CardTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Modifier
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-end gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-2 border-primary/20 hover:border-primary/40 transition-colors">
                  <AvatarImage src={profile.avatar} alt={profile.firstName} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-700 to-amber-950 text-white text-lg font-bold">
                    {profile.firstName.charAt(0)}
                    {profile.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <button
                    onClick={handleAvatarClick}
                    className="absolute bottom-0 right-0 bg-gradient-to-br from-amber-700 to-amber-950 text-white p-2 rounded-full hover:from-amber-800 hover:to-amber-950 shadow-md transition-all duration-200"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={!isEditing}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">
                  {formData.firstName} {formData.lastName}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Membre depuis {new Date(profile.joinedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="text-right">
                <Badge className={getStatusColor(profile.status)}>
                  {getStatusLabel(profile.status)}
                </Badge>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Prénom
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-secondary/50" : ""}
                />
              </div>

              {/* Prénom */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nom
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-secondary/50" : ""}
                />
              </div>

              {/* Email - Non modifiable */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-secondary/50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  L&apos;email ne peut pas être modifié
                </p>
              </div>

              {/* Téléphone */}
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
                  className={!isEditing ? "bg-secondary/50" : ""}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Décrivez votre activité artisanale..."
                  rows={4}
                  className={!isEditing ? "bg-secondary/50 resize-none" : "resize-none"}
                />
              </div>

              {/* Info - Statut et Date */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Statut du compte
                  </p>
                  <Badge className={getStatusColor(profile.status)}>
                    {getStatusLabel(profile.status)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Membre depuis
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(profile.joinedAt).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            {isEditing && (
              <div className="flex items-center gap-2 pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="border-border/50 bg-card hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Mot de passe
            </CardTitle>
            <CardDescription>Changez votre mot de passe en toute sécurité</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setPasswordModalOpen(true)}
              variant="outline"
              className="w-full gap-2 hover:bg-secondary"
            >
              <Lock className="h-4 w-4" />
              Changer mon mot de passe
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Assurez-vous d&apos;utiliser un mot de passe fort et unique
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal open={passwordModalOpen} onOpenChange={setPasswordModalOpen} />
    </DashboardLayout>
  )
}

