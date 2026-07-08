// @ts-nocheck
"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, ArrowLeft, Mail, MessageSquare, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context"
import { ChangePasswordModal } from "@/components/change-password-modal"

interface VerificationCodeInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

function VerificationCodeInput({ value, onChange, error }: VerificationCodeInputProps) {
  const inputs = Array.from({ length: 6 }, (_, i) => i)

  const handleInputChange = (index: number, inputValue: string) => {
    const digit = inputValue.replace(/\D/g, '')
    if (digit.length > 1) return

    const newCode = value.split('')
    newCode[index] = digit
    const fullCode = newCode.join('').slice(0, 6)
    onChange(fullCode)

    if (digit && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(paste)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 justify-center">
        {inputs.map((index) => (
          <input
            key={index}
            id={`code-input-${index}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`w-11 h-12 text-center text-lg font-bold border-2 rounded-xl bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-150 ${
              error ? 'border-destructive' : 'border-border'
            } ${value[index] ? 'border-primary/50 bg-primary/5' : ''}`}
          />
        ))}
      </div>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  )
}

function StepIndicator({ current, steps }: { current: string; steps: { id: string; label: string }[] }) {
  const currentIndex = steps.findIndex(s => s.id === current)
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
            i <= currentIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 rounded transition-all duration-300 ${
              i < currentIndex ? 'bg-primary' : 'bg-muted'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { login, getDashboardPath, user } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const forceChangePending = useRef(false)

  useEffect(() => {
    if (forceChangePending.current) return
    if (user && ["admin","manager","livreur","artisan"].includes(user.role)) {
      const dst = getDashboardPath()
      if (dst && dst.startsWith('/dashboard')) router.push(dst)
    }
  }, [user, router, getDashboardPath])

  const [passwordChangeModalOpen, setPasswordChangeModalOpen] = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)

  const [currentStep, setCurrentStep] = useState<'login' | 'forgotPassword' | 'verifyCode' | 'resetPassword' | 'confirmation'>('login')
  const [resetFormData, setResetFormData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [resetErrors, setResetErrors] = useState<{ email?: string; code?: string; newPassword?: string; confirmPassword?: string; general?: string }>({})
  const [resendCountdown, setResendCountdown] = useState(0)

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  useEffect(() => {
    if (currentStep === 'verifyCode') {
      setResendCountdown(60)
    }
  }, [currentStep])

  const forgotSteps = [
    { id: 'forgotPassword', label: 'Email' },
    { id: 'verifyCode', label: 'Code' },
    { id: 'resetPassword', label: 'Mot de passe' },
  ]

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {}
    if (!formData.email) newErrors.email = "L'email est requis"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Veuillez saisir un email valide"
    if (!formData.password) newErrors.password = "Le mot de passe est requis"
    else if (formData.password.length < 6) newErrors.password = "Le mot de passe doit contenir au moins 6 caractères"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    setErrors({})
    const result = await login(formData.email, formData.password)
    if (result.success) {
      if (result.forcePasswordChange) {
        forceChangePending.current = true
        const dst = getDashboardPath()
        setPendingRedirect(dst && dst.startsWith('/dashboard') ? dst : '/')
        setPasswordChangeModalOpen(true)
      } else {
        const dst = getDashboardPath()
        router.push(dst && dst.startsWith('/dashboard') ? dst : '/')
      }
    } else {
      setErrors({ general: result.error || "Échec de la connexion" })
    }
    setIsLoading(false)
  }

  const handleForgotPassword = () => {
    setCurrentStep('forgotPassword')
    setResetErrors({})
  }

  const handleSendCode = async () => {
    if (!resetFormData.email) { setResetErrors({ email: "L'email est requis" }); return }
    if (!/\S+@\S+\.\S+/.test(resetFormData.email)) { setResetErrors({ email: "Veuillez saisir un email valide" }); return }
    setIsLoading(true)
    setResetErrors({})
    try {
      const response = await fetch('http://localhost:8000/api/auth/send-reset-code/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetFormData.email }),
      })
      const data = await response.json()
      if (response.ok) { setCurrentStep('verifyCode'); setResendCountdown(60) }
      else { setResetErrors({ general: data.error || "Erreur lors de l'envoi du code" }) }
    } catch { setResetErrors({ general: "Erreur lors de l'envoi du code" }) }
    finally { setIsLoading(false) }
  }

  useEffect(() => {
    if (resetFormData.code.length === 6 && currentStep === 'verifyCode' && !isLoading) {
      const verify = async () => {
        setIsLoading(true)
        setResetErrors({})
        try {
          const response = await fetch('http://localhost:8000/api/auth/verify-reset-code/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetFormData.email, code: resetFormData.code }),
          })
          const data = await response.json()
          if (response.ok) setCurrentStep('resetPassword')
          else setResetErrors({ general: data.error || "Code de vérification invalide" })
        } catch { setResetErrors({ general: "Code de vérification invalide" }) }
        finally { setIsLoading(false) }
      }
      verify()
    }
  }, [resetFormData.code, currentStep])

  const handleResetPassword = async () => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {}
    if (!resetFormData.newPassword) newErrors.newPassword = "Le nouveau mot de passe est requis"
    else if (resetFormData.newPassword.length < 8) newErrors.newPassword = "Le mot de passe doit contenir au moins 8 caractères"
    else if (!/[A-Z]/.test(resetFormData.newPassword)) newErrors.newPassword = "Le mot de passe doit contenir au moins une majuscule"
    else if (!/[0-9]/.test(resetFormData.newPassword)) newErrors.newPassword = "Le mot de passe doit contenir au moins un chiffre"
    if (!resetFormData.confirmPassword) newErrors.confirmPassword = "La confirmation du mot de passe est requise"
    else if (resetFormData.newPassword !== resetFormData.confirmPassword) newErrors.confirmPassword = "Les mots de passe ne correspondent pas"
    if (Object.keys(newErrors).length > 0) { setResetErrors(newErrors); return }
    setIsLoading(true)
    setResetErrors({})
    try {
      const response = await fetch('http://localhost:8000/api/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetFormData.email, code: resetFormData.code, new_password: resetFormData.newPassword }),
      })
      const data = await response.json()
      if (response.ok) setCurrentStep('confirmation')
      else setResetErrors({ general: data.error || "Erreur lors de la réinitialisation" })
    } catch { setResetErrors({ general: "Erreur lors de la réinitialisation" }) }
    finally { setIsLoading(false) }
  }

  const handleResendCode = async () => {
    if (resendCountdown > 0) return
    setIsLoading(true)
    setResetErrors({})
    try {
      const response = await fetch('http://localhost:8000/api/auth/send-reset-code/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetFormData.email }),
      })
      const data = await response.json()
      if (response.ok) setResendCountdown(60)
      else setResetErrors({ general: data.error || "Erreur lors du renvoi" })
    } catch { setResetErrors({ general: "Erreur lors du renvoi" }) }
    finally { setIsLoading(false) }
  }

  const handleBackToLogin = () => {
    setCurrentStep('login')
    setResetFormData({ email: "", code: "", newPassword: "", confirmPassword: "" })
    setResetErrors({})
    setResendCountdown(0)
  }

  const isForgotStep = ['forgotPassword', 'verifyCode', 'resetPassword'].includes(currentStep)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8">
        <span className="font-serif text-3xl font-bold text-foreground">E-artisan</span>
      </Link>

      <Card className="w-full max-w-md border-border/50 bg-card shadow-lg">
        {currentStep === 'login' && (
          <>
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-serif text-2xl">Bienvenue</CardTitle>
              <CardDescription>Connectez-vous à votre compte pour continuer</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.general && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.general}</div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
                  </Label>
                  <Input id="email" type="email" placeholder="rakotopaul@gmail.com"
                    value={formData.email}
                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors({ ...errors, email: undefined }) }}
                    className={`h-11 bg-background ${errors.email ? "border-destructive" : ""}`} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Mot de passe
                    </Label>
                    <button type="button" onClick={handleForgotPassword}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Entrez votre mot de passe"
                      value={formData.password}
                      onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: undefined }) }}
                      className={`h-11 bg-background pr-10 ${errors.password ? "border-destructive" : ""}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion en cours...</> : "Se connecter"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Vous n&apos;avez pas de compte ?{" "}
                <Link href="/register" className="font-semibold text-primary hover:underline">Créer un compte</Link>
              </p>
            </CardContent>
          </>
        )}

        {isForgotStep && (
          <div className="px-6 pt-6">
            <StepIndicator current={currentStep} steps={forgotSteps} />
          </div>
        )}

        {currentStep === 'forgotPassword' && (
          <>
            <CardHeader className="text-center pb-2 pt-0">
              <CardTitle className="font-serif text-xl">Mot de passe oublié</CardTitle>
              <CardDescription>Entrez votre email pour recevoir un code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resetErrors.general && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{resetErrors.general}</div>}
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-xs font-semibold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Adresse email
                </Label>
                <Input id="reset-email" type="email" placeholder="rakotopaul@gmail.com"
                  value={resetFormData.email}
                  onChange={(e) => setResetFormData({ ...resetFormData, email: e.target.value })}
                  className={`h-11 bg-background ${resetErrors.email ? "border-destructive" : ""}`} />
                {resetErrors.email && <p className="text-xs text-destructive">{resetErrors.email}</p>}
              </div>
              <Button onClick={handleSendCode} className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi en cours...</>
                  : <><MessageSquare className="mr-2 h-4 w-4" /> Envoyer le code</>}
              </Button>
              <Button variant="ghost" onClick={handleBackToLogin} className="w-full h-10 text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la connexion
              </Button>
            </CardContent>
          </>
        )}

        {currentStep === 'verifyCode' && (
          <>
            <CardHeader className="text-center pb-2 pt-0">
              <CardTitle className="font-serif text-xl">Vérification</CardTitle>
              <CardDescription>Entrez le code à 6 chiffres reçu par email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resetErrors.general && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{resetErrors.general}</div>}
              <VerificationCodeInput value={resetFormData.code}
                onChange={(value) => setResetFormData({ ...resetFormData, code: value })}
                error={resetErrors.code} />
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Vérification...
                </div>
              )}
              <div className="text-center">
                <button onClick={handleResendCode} disabled={resendCountdown > 0 || isLoading}
                  className={`text-sm transition-colors ${resendCountdown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:text-primary/80 cursor-pointer'}`}>
                  {resendCountdown > 0 ? `Renvoyer dans ${resendCountdown}s` : 'Renvoyer le code'}
                </button>
              </div>
              <Button variant="ghost" onClick={() => setCurrentStep('forgotPassword')} className="w-full h-10 text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Changer d'email
              </Button>
            </CardContent>
          </>
        )}

        {currentStep === 'resetPassword' && (
          <>
            <CardHeader className="text-center pb-2 pt-0">
              <CardTitle className="font-serif text-xl">Nouveau mot de passe</CardTitle>
              <CardDescription>Choisissez un mot de passe sécurisé</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resetErrors.general && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{resetErrors.general}</div>}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs font-semibold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Nouveau mot de passe
                </Label>
                <Input id="new-password" type="password" placeholder="Entrez votre nouveau mot de passe"
                  value={resetFormData.newPassword}
                  onChange={(e) => setResetFormData({ ...resetFormData, newPassword: e.target.value })}
                  className={`h-11 bg-background ${resetErrors.newPassword ? "border-destructive" : ""}`} />
                {resetErrors.newPassword && <p className="text-xs text-destructive">{resetErrors.newPassword}</p>}
                <p className="text-xs text-muted-foreground">8 caractères minimum, 1 majuscule, 1 chiffre</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs font-semibold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Confirmer le mot de passe
                </Label>
                <Input id="confirm-password" type="password" placeholder="Confirmez votre nouveau mot de passe"
                  value={resetFormData.confirmPassword}
                  onChange={(e) => setResetFormData({ ...resetFormData, confirmPassword: e.target.value })}
                  className={`h-11 bg-background ${resetErrors.confirmPassword ? "border-destructive" : ""}`} />
                {resetErrors.confirmPassword && <p className="text-xs text-destructive">{resetErrors.confirmPassword}</p>}
              </div>
              <Button onClick={handleResetPassword} className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Réinitialisation...</>
                  : "Réinitialiser le mot de passe"}
              </Button>
              <Button variant="ghost" onClick={() => setCurrentStep('verifyCode')} className="w-full h-10 text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
            </CardContent>
          </>
        )}

        {currentStep === 'confirmation' && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-xl">Mot de passe réinitialisé</CardTitle>
              <CardDescription>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleBackToLogin} className="w-full h-11 text-sm font-semibold">Se connecter</Button>
            </CardContent>
          </>
        )}
      </Card>

      <ChangePasswordModal
        open={passwordChangeModalOpen}
        onOpenChange={setPasswordChangeModalOpen}
        redirectOnSuccess={pendingRedirect}
        requireOldPassword={false}
      />
    </div>
  )
}
