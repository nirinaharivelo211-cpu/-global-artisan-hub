// @ts-nocheck
"use client"

import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import {
  Download, Share2,
  QrCode as QrCodeIcon,
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useQR } from "@/context/qr-context"
import { useState } from "react"
import { QRCodeSkeleton } from "@/components/qr-code-skeletons"

export default function ArtisanQRCodePage() {
  const { user } = useAuth()
  const { qrCode, loading, downloadQRCode, shareQRCode, generateNewQRCode, fetchQRCode } = useQR()
  const [isGenerating, setIsGenerating] = useState(false)

  const artisanName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Artisan" : "Artisan"

  const handleGenerateQR = async () => {
    setIsGenerating(true)
    try {
      await generateNewQRCode()
      await fetchQRCode()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <DashboardLayout role="artisan">
      <div className="flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border-0 bg-white shadow-md">
            <div className="bg-gradient-to-r from-[#78350f]/[0.04] to-transparent border-b px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                  <QrCodeIcon className="h-5 w-5 text-amber-800" />
                </div>
                <div>
                  <h1 className="font-serif text-base font-bold text-gray-900">Code QR</h1>
                  <p className="text-xs text-gray-500">{artisanName}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 flex flex-col items-center">
              {loading ? (
                <QRCodeSkeleton />
              ) : qrCode && qrCode.code ? (
                <>
                  <div className="relative w-full max-w-[240px] aspect-square overflow-hidden rounded-lg border bg-gray-50 p-4 shadow-sm">
                    <Image
                      src={qrCode.code}
                      alt="Votre code QR artisan"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>

                  <div className="mt-4 flex gap-3 w-full max-w-[260px]">
                    <Button
                      variant="outline"
                      className="flex-1 gap-1.5 h-9 text-xs"
                      onClick={() => downloadQRCode(qrCode)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Télécharger
                    </Button>
                    <Button
                      className="flex-1 gap-1.5 h-9 text-xs"
                      onClick={() => shareQRCode(qrCode)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Partager
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-6 w-full">
                  <QrCodeIcon className="h-14 w-14 text-gray-200 mb-3" />
                  <p className="font-medium text-gray-700 text-center text-sm mb-1">
                    Aucun code QR
                  </p>
                  <p className="text-xs text-gray-400 text-center mb-4">
                    Générez votre code QR unique
                  </p>
                  <Button onClick={handleGenerateQR} disabled={isGenerating} size="sm">
                    {isGenerating ? "Génération..." : "Générer"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
