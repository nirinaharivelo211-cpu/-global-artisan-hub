// @ts-nocheck
"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { qrCodeApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"

export interface QRCode {
  id: string
  code: string
  artisanId: string
  artisanName: string
  profileUrl: string
  createdAt: Date
  expiresAt?: Date
  isActive: boolean
  scanCount?: number
}

export interface QRContextType {
  qrCode: QRCode | null
  loading: boolean
  error: string | null
  fetchQRCode: () => Promise<void>
  downloadQRCode: (qrCode: QRCode) => void
  generateNewQRCode: () => Promise<void>
  shareQRCode: (qrCode: QRCode) => void
}

const QRContext = createContext<QRContextType | undefined>(undefined)

export function QRProvider({ children }: { children: React.ReactNode }) {
  const [qrCode, setQRCode] = useState<QRCode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (user && user.role === "artisan") {
      fetchQRCode()
    } else {
      setQRCode(null)
      setLoading(false)
    }
  }, [user])

  const fetchQRCode = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await qrCodeApi.getQRCode()
      if (response.success && response.data) {
        const transformedQR = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          expiresAt: response.data.expiresAt ? new Date(response.data.expiresAt) : undefined,
        }
        setQRCode(transformedQR)
      } else {
        setQRCode(null)
      }
    } catch (err) {
      setError("Erreur lors du chargement du code QR")
      toast({
        title: "Erreur",
        description: "Impossible de charger le code QR",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateNewQRCode = async () => {
    if (qrCode && qrCode.isActive) {
      toast({
        title: "Code QR existant",
        description: "Un code QR a deja ete genere pour votre profil. Vous ne pouvez generer qu'un seul code QR.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await qrCodeApi.generateQRCode()
      if (response.success && response.data) {
        await fetchQRCode()
        toast({
          title: "Succes",
          description: "Nouveau code QR genere",
        })
      } else {
        setError(response.error || "Erreur lors de la generation du code QR")
        toast({
          title: "Erreur",
          description: response.error || "Impossible de generer un nouveau code QR",
          variant: "destructive",
        })
      }
    } catch (err) {
      setError("Erreur lors de la generation du code QR")
      toast({
        title: "Erreur",
        description: "Impossible de generer un nouveau code QR",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadQRCode = (qrCode: QRCode) => {
    if (!qrCode.code) return
    const link = document.createElement("a")
    link.href = qrCode.code
    link.download = `qr-code-${qrCode.artisanId || "artisan"}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const shareQRCode = (qrCode: QRCode) => {
    try {
      if (navigator.share) {
        navigator.share({
          title: `${qrCode.artisanName}'s Shop`,
          text: "Decouvrez mes produits artisanaux!",
          url: qrCode.profileUrl,
        })
      } else {
        navigator.clipboard.writeText(qrCode.profileUrl)
        toast({
          title: "Succes",
          description: "Lien copie dans le presse-papiers",
        })
      }
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de partager",
        variant: "destructive",
      })
    }
  }

  return (
    <QRContext.Provider
      value={{
        qrCode,
        loading,
        error,
        fetchQRCode,
        downloadQRCode,
        generateNewQRCode,
        shareQRCode,
      }}
    >
      {children}
    </QRContext.Provider>
  )
}

export function useQR() {
  const context = useContext(QRContext)
  if (context === undefined) {
    throw new Error("useQR doit etre utilise dans QRProvider")
  }
  return context
}
