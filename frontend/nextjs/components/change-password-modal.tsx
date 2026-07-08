// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Lock } from "lucide-react"
import { useProfile } from "@/context/profile-context"
import { useAppToast } from "@/context/toast-context"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Optional callback executed after a successful password change.
   */
  onSuccess?: () => void
  /**
   * Optional URL to redirect to after a successful password change.
   */
  redirectOnSuccess?: string | null
  /**
   * When true (default), the old password field is shown and validated.
   * Set to false for forced first-login password changes.
   */
  requireOldPassword?: boolean
}

export function ChangePasswordModal({ open, onOpenChange, onSuccess, redirectOnSuccess, requireOldPassword = true }: ChangePasswordModalProps) {
  useEffect(() => {
    // no-op
  }, [open]);
  const router = useRouter()
  const { changePassword, loading } = useProfile()
  const { addToast } = useAppToast()
  const { user } = useAuth()
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Effacer l'erreur quand l'utilisateur modifie
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (requireOldPassword && !formData.oldPassword) {
      newErrors.oldPassword = "L'ancien mot de passe est requis"
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "Le nouveau mot de passe est requis"
    } else {
      if (formData.newPassword.length < 8) {
        newErrors.newPassword = "Le mot de passe doit contenir au moins 8 caractères"
      } else if (!/[A-Z]/.test(formData.newPassword)) {
        newErrors.newPassword = "Le mot de passe doit contenir au moins une majuscule"
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "La confirmation est requise"
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Password change submitted')
    console.log('User authenticated:', !!user)
    console.log('User data:', user)
    console.log('Form data:', formData)

    if (!validateForm()) {
      console.log('Validation failed')
      return
    }

    console.log('Calling changePassword API...')
    const payload = requireOldPassword
      ? formData
      : { newPassword: formData.newPassword, confirmPassword: formData.confirmPassword }
    const result = await changePassword(payload)
    console.log('API result:', result)
    
    if (result.success) {
      setFormData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setErrors({})
      addToast({
        title: "Succès",
        description: "Mot de passe modifié avec succès",
      })
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
      if (redirectOnSuccess) {
        router.push(redirectOnSuccess)
      }
    } else {
      // Display field-specific errors from backend
      if (result.errors) {
        setErrors(result.errors)
        if (result.errors.general) {
          addToast({ title: "Erreur", description: result.errors.general, variant: "error" })
        }
      } else {
        addToast({ title: "Erreur", description: "Impossible de changer le mot de passe", variant: "error" })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o || requireOldPassword) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={requireOldPassword ? undefined : (e) => e.preventDefault()} onEscapeKeyDown={requireOldPassword ? undefined : (e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Changer mon mot de passe</DialogTitle>
          <DialogDescription>
            {requireOldPassword
              ? "Entrez votre ancien mot de passe et le nouveau mot de passe"
              : "Choisissez un nouveau mot de passe pour votre compte"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errors.general}
            </div>
          )}
          {requireOldPassword && (
            /* Ancien mot de passe */
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Ancien mot de passe</Label>
              <div className="relative">
                <Input
                  id="oldPassword"
                  name="oldPassword"
                  type={showOldPassword ? "text" : "password"}
                  value={formData.oldPassword}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Entrez votre ancien mot de passe"
                  className={errors.oldPassword ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showOldPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.oldPassword && (
                <p className="text-xs text-destructive">{errors.oldPassword}</p>
              )}
            </div>
          )}

          {/* Nouveau mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={formData.newPassword}
                onChange={handleChange}
                disabled={loading}
                placeholder="Entrez votre nouveau mot de passe"
                className={errors.newPassword ? "border-destructive" : ""}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 8 caractères et au moins une majuscule
            </p>
          </div>

          {/* Confirmation du mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                placeholder="Confirmez votre nouveau mot de passe"
                className={errors.confirmPassword ? "border-destructive" : ""}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            {requireOldPassword && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1"
              >
                Annuler
              </Button>
            )}
            <Button type="submit" disabled={loading} className={requireOldPassword ? "flex-1 gap-2" : "w-full gap-2"}>
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Changement...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Changer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

