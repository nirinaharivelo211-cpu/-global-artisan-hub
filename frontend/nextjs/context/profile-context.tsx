// @ts-nocheck
"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { profileApi } from "@/lib/api-client"
import { useAuth } from "./auth-context"

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatar?: string
  description?: string
  status: "active" | "inactive" | "pending"
  joinedAt: Date
  role: "artisan" | "client" | "admin" | "livreur"
  region?: string
}

export interface ChangePasswordData {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordResult {
  success: boolean
  errors?: Record<string, string>
}

export interface ProfileContextType {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  fetchProfile: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  uploadAvatar: (file: File) => Promise<boolean>
  changePassword: (data: ChangePasswordData) => Promise<ChangePasswordResult>
  logout: () => void
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  // Charger le profil au montage
  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Appel API au backend Django
      const result = await profileApi.fetchProfile()

      if (result.success && result.data) {
      // Map API response to UserProfile interface
        const apiData = result.data as any
        const profile: UserProfile = {
          id: apiData.id || "",
          firstName: apiData.firstName || apiData.prenom || "",
          lastName: apiData.lastName || apiData.nom || "",
          email: apiData.email || "",
          phone: apiData.phone || apiData.telephone || "",
          avatar: apiData.avatar || apiData.photo_de_profil || "",
          description: apiData.bio || apiData.description || "",
          status: (apiData.status || "active") as "active" | "inactive" | "pending",
          joinedAt: apiData.joinedAt ? new Date(apiData.joinedAt) : new Date(),
          role: (apiData.role || "client") as "artisan" | "client" | "admin" | "livreur",
          region: apiData.region || "",
        }
        setProfile(profile)
      } else {
        // Fallback: utiliser les données de l'utilisateur authentifié
        if (user) {
          const fallbackProfile: UserProfile = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar,
            description: "",
            status: "active",
            joinedAt: new Date(),
            role: user.role,
          }
          setProfile(fallbackProfile)
        }
        setError(result.error || "Impossible de charger le profil")
      }
    } catch (err) {
      setError("Erreur lors du chargement du profil")
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (data: Partial<UserProfile | any>) => {
    try {
      setLoading(true)
      setError(null)

      // Map frontend field names to backend field names
      const mappedData: Record<string, any> = {}
      
      if (data.firstName) mappedData.firstName = data.firstName
      if (data.lastName) mappedData.lastName = data.lastName
      if (data.phone !== undefined) mappedData.phone = data.phone
      // Handle both 'description' (from UserProfile interface) and 'bio' (from form submission)
      if (data.description !== undefined) mappedData.bio = data.description
      if (data.bio !== undefined) mappedData.bio = data.bio
      if (data.status) mappedData.status = data.status
      if (data.region !== undefined) mappedData.region = data.region

      // Appel API au backend Django
      const result = await profileApi.updateProfile(mappedData)

      if (result.success && result.data) {
        // Update local profile with the response data
        const data = result.data as any
        const updatedProfile: UserProfile = {
          ...profile!,
          firstName: data.firstName || profile?.firstName || "",
          lastName: data.lastName || profile?.lastName || "",
          email: data.email || profile?.email || "",
          phone: data.phone || profile?.phone,
          avatar: data.avatar || profile?.avatar,
          description: data.bio || profile?.description,
          status: (data.status || profile?.status || "active") as "active" | "inactive" | "pending",
          joinedAt: profile?.joinedAt || new Date(),
          role: profile?.role || "artisan",
          id: profile?.id || "",
          region: data.region || profile?.region || "",
        }
        setProfile(updatedProfile)

        toast({
          title: "Modification enregistrée",
          description: "Profil mis à jour avec succès",
        })
      } else {
        setError(result.error || "Erreur lors de la mise à jour")
        toast({
          title: "Erreur",
          description: result.error || "Impossible de mettre à jour le profil",
          variant: "destructive",
        })
      }
    } catch (err) {
      setError("Erreur lors de la mise à jour du profil")
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (file: File) => {
    try {
      setLoading(true)
      setError(null)

      // Valider le fichier
      if (!file.type.startsWith("image/")) {
        throw new Error("Le fichier doit être une image")
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("L'image ne doit pas dépasser 5MB")
      }

      // Créer une URL temporaire pour l'aperçu local immédiatement
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                avatar: dataUrl,
              }
            : null
        )
      }
      reader.readAsDataURL(file)

      // Appel API au backend Django
      const result = await profileApi.uploadAvatar(file)

      if (result.success && result.data) {
        // Update the avatar with the actual URL from the server
        const data = result.data as any
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                avatar: data.avatar || data.photo_de_profil || prev.avatar,
              }
            : null
        )
        toast({
          title: "Succès",
          description: "Avatar mis à jour avec succès",
        })
        return true
      } else {
        const errMsg = result.error || "Impossible de mettre à jour l'avatar"
        setError(errMsg)
        toast({
          title: "Erreur",
          description: errMsg,
          variant: "destructive",
        })
        return false
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de mettre à jour l'avatar"
      setError(message)
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (data: ChangePasswordData): Promise<ChangePasswordResult> => {
    try {
      setLoading(true)
      setError(null)

      // Valider les mots de passe
      if (data.newPassword !== data.confirmPassword) {
        return {
          success: false,
          errors: { confirmPassword: "Les nouveaux mots de passe ne correspondent pas" }
        }
      }

      if (data.newPassword.length < 8) {
        return {
          success: false,
          errors: { newPassword: "Le nouveau mot de passe doit contenir au moins 8 caractères" }
        }
      }

      // Appel API au backend Django
      console.log('Profile context - calling API with data:', data)
      const result = await profileApi.changePassword(data.oldPassword, data.newPassword, data.confirmPassword)
      console.log('Profile context - API result:', result)

      if (result.success) {
        // Remove toast here - it's handled in the modal
        return { success: true }
      } else {
        // Handle error responses from backend
        let fieldErrors: Record<string, string> = {}
        const data = result.data as any
        
        // Check if this is our custom error format
        if (data && typeof data === 'object' && data.success === false && data.errors) {
          console.log('Using custom error format:', data.errors)
          // Extract field-specific errors from our custom format
          Object.entries(data.errors).forEach(([key, value]) => {
            if (typeof value === 'string') {
              fieldErrors[key] = value
            }
          })
        } else {
          // Fallback to old error handling
          // Try to extract error from backend response
          if (data && typeof data === 'object') {
            // Check for errors object
            if (data.errors) {
              const errors = data.errors
              if (typeof errors === 'object') {
                // Extract field-specific errors
                Object.entries(errors).forEach(([key, value]) => {
                  if (typeof value === 'string') {
                    fieldErrors[key] = value
                  }
                })
              }
            }
            
            // Fallback error handling
            if (data.error) {
              fieldErrors.general = data.error
            }
            if (data.detail) {
              fieldErrors.general = data.detail
            }
          }
        }
        
        // If no field errors found, show general error
        if (Object.keys(fieldErrors).length === 0) {
          fieldErrors.general = "Impossible de changer le mot de passe"
        }
        
        console.log('Final field errors:', fieldErrors)
        return { success: false, errors: fieldErrors }
      }
    } catch (err) {
      console.error("Change password error:", err)
      return {
        success: false,
        errors: { general: "Erreur lors du changement de mot de passe" }
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setProfile(null)
    // La déconnexion réelle se ferait via le contexte Auth
    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
    })
  }

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        fetchProfile,
        updateProfile,
        uploadAvatar,
        changePassword,
        logout,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error("useProfile doit être utilisé dans ProfileProvider")
  }
  return context
}

