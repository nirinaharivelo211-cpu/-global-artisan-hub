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
import {
  Camera,
  User,
  UserCircle,
  Mail,
  Phone,
  Calendar,
  Lock,
  Edit2,
  Check,
  X,
  RefreshCw,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useProfile } from "@/context/profile-context"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProfileSettingsSkeleton } from "@/components/dashboard-skeletons"
import { ChangePasswordModal } from "@/components/change-password-modal"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function ClientProfilePage() {
  const { user, logout: authLogout } = useAuth()
  const { profile, loading, updateProfile, uploadAvatar, fetchProfile } = useProfile()
  const router = useRouter()
  const { toast } = useToast()
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

  useEffect(() => {
    setFormData({
      firstName: profile?.firstName || user?.firstName || "",
      lastName: profile?.lastName || user?.lastName || "",
      phone: profile?.phone || "",
    })
  }, [profile, user])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      })
      setIsEditing(false)
      await fetchProfile()
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la sauvegarde de votre profil.",
        variant: "destructive",
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "La taille maximale autorisée est de 5MB.", variant: "destructive" })
      return
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: "Type de fichier invalide", description: "Veuillez sélectionner une image.", variant: "destructive" })
      return
    }
    try {
      await uploadAvatar(file)
      toast({ title: "Photo de profil mise à jour", description: "Votre photo de profil a été changée avec succès." })
      await fetchProfile()
    } catch (error) {
      toast({ title: "Erreur", description: "Une erreur s'est produite lors du téléchargement.", variant: "destructive" })
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchProfile()
    setIsRefreshing(false)
    toast({ title: "Profil actualisé", description: "Vos informations ont été rechargées." })
  }

  const handleLogout = () => {
    authLogout()
    router.replace("/")
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
      <div className="space-y-6 max-w-3xl mx-auto">
        <nav className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/client" className="transition hover:text-foreground">Accueil</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Profil</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Profil</h1>
            <p className="mt-1 text-muted-foreground">Gérez vos informations personnelles et paramètres de sécurité.</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} size="icon" className="h-9 w-9">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid gap-6">
          <Card className="border-0 shadow-md bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Informations du profil
              </CardTitle>
              <CardDescription>Mettez à jour vos informations personnelles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="h-20 w-20 ring-2 ring-primary/10">
                    <AvatarImage
                      src={profile?.avatar || user?.avatar}
                      alt={`${profile?.firstName || user?.firstName} ${profile?.lastName || user?.lastName}`}
                    />
                    <AvatarFallback>
                      {profile ? `${profile.firstName[0]}${profile.lastName[0]}` : user ? `${user.firstName[0]}${user.lastName[0]}` : "CL"}
                    </AvatarFallback>
                  </Avatar>
                  <Button size="icon" variant="secondary"
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md"
                    onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5" />
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {profile ? `${profile.firstName} ${profile.lastName}` : user ? `${user.firstName} ${user.lastName}` : "Client"}
                  </h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">Client</Badge>
                    <Badge
                      variant={
                        profile?.status === "active" ? "default"
                        : profile?.status === "pending" ? "secondary"
                        : "destructive"
                      }
                      className="text-xs"
                    >
                      {profile?.status === "active" ? "Actif"
                        : profile?.status === "pending" ? "En attente"
                        : "Inactif"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-bold flex items-center gap-1.5">
                    <UserCircle className="h-3.5 w-3.5" /> Prénom
                  </Label>
                  {isEditing ? (
                    <Input id="firstName" value={formData.firstName} className="h-9"
                      onChange={(e) => handleInputChange("firstName", e.target.value)} placeholder="Votre prénom" />
                  ) : (
                    <div className="flex items-center rounded-md bg-muted/20 px-3 py-2 min-h-9">
                      <p className="text-sm text-foreground">{profile?.firstName || user?.firstName || "Non défini"}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-bold flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Nom
                  </Label>
                  {isEditing ? (
                    <Input id="lastName" value={formData.lastName} className="h-9"
                      onChange={(e) => handleInputChange("lastName", e.target.value)} placeholder="Votre nom" />
                  ) : (
                    <div className="flex items-center rounded-md bg-muted/20 px-3 py-2 min-h-9">
                      <p className="text-sm text-foreground">{profile?.lastName || user?.lastName || "Non défini"}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-bold flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Label>
                  <div className="flex items-center rounded-md bg-muted/20 px-3 py-2 min-h-9">
                    <p className="text-sm text-foreground">{profile?.email || user?.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-bold flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Téléphone
                  </Label>
                  {isEditing ? (
                    <PhoneInput id="phone" value={formData.phone} className="h-9"
                      onChange={(value) => handleInputChange("phone", value)} />
                  ) : (
                    <div className="flex items-center rounded-md bg-muted/20 px-3 py-2 min-h-9">
                      <p className="text-sm text-foreground">{profile?.phone || "Non défini"}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-bold flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Rôle
                  </Label>
                  <div className="flex items-center rounded-md bg-muted/20 px-3 py-2 min-h-9">
                    <p className="text-sm text-foreground">Client</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-bold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Date de création
                  </Label>
                  <div className="flex items-center rounded-md bg-muted/20 px-3 py-2 min-h-9">
                    <p className="text-sm text-foreground">
                      {profile?.joinedAt
                        ? format(new Date(profile.joinedAt), "dd MMMM yyyy", { locale: fr })
                        : "Non disponible"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} disabled={isSaving} className="h-9 text-sm">
                      {isSaving ? (
                        <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> Sauvegarde...</>
                      ) : (
                        <><Check className="h-4 w-4 mr-1.5" /> Sauvegarder</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="h-9 text-sm">
                      <X className="h-4 w-4 mr-1.5" /> Annuler
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} className="h-9 text-sm">
                    <Edit2 className="h-4 w-4 mr-1.5" /> Modifier
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-primary" />
                Sécurité
              </CardTitle>
              <CardDescription>Gérez votre mot de passe et la sécurité de votre compte.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl bg-accent/5">
                <div>
                  <h4 className="font-medium text-sm">Changer mon mot de passe</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Mettez à jour votre mot de passe pour sécuriser votre compte.</p>
                </div>
                <Button variant="outline" onClick={() => setPasswordModalOpen(true)} className="h-9 text-sm shrink-0 ml-4">
                  Changer le mot de passe
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <ChangePasswordModal
          open={passwordModalOpen}
          onOpenChange={setPasswordModalOpen}
          onSuccess={() => {
            toast({
              title: "Mot de passe modifié",
              description: "Votre mot de passe a été mis à jour.",
            })
          }}
        />
      </div>
    </DashboardLayout>
  )
}
