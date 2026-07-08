"use client"

import React, { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { colisApi } from "@/lib/api-client"
import { useAuth } from "@/context/auth-context"
import { Download, Truck, ArrowRight } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

export default function ShipmentsPage() {
  const { user } = useAuth()
  const [colis, setColis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await colisApi.list({ artisan: user?.id })
        if (res.success) setColis(res.data || [])
        else setColis([])
      } catch (err) {
        console.error(err)
        setColis([])
      } finally {
        setLoading(false)
      }
    }
    if (user) load()
  }, [user])

  async function download(url?: string, filename?: string) {
    if (!url) return
    try {
      const r = await fetch(url)
      const blob = await r.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename || 'file'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      console.error(e)
      addToast({ title: 'Erreur', description: 'Téléchargement impossible', variant: 'destructive' })
    }
  }

  return (
    <DashboardLayout role="artisan">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Expéditions</h1>
          <p className="mt-1 text-muted-foreground">Suivez et gérez vos colis</p>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement des colis...</div>
          ) : colis.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">Aucun colis trouvé pour le moment.</CardContent>
            </Card>
          ) : (
            colis.map((c) => (
              <Card key={c.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-md bg-gray-50">
                    {c.qr_code ? (
                      <Image src={c.qr_code} alt={`QR ${c.id}`} width={120} height={120} className="object-contain" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">No QR</div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Colis #{c.numero_colis || c.id}</div>
                    <div className="text-sm text-muted-foreground">Statut: {c.statut}</div>
                    <div className="text-sm text-muted-foreground">Articles: {c.items_count || 0}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.qr_code && (
                    <Button size="sm" variant="outline" onClick={() => download(c.qr_code, `colis-${c.id}-qr.png`)}>
                      <Download className="mr-2 h-4 w-4" />Télécharger QR
                    </Button>
                  )}
                  <Button size="sm" onClick={async () => {
                    try {
                      const res = await colisApi.dispatcher(c.id, { mode: c.mode || 'depot' })
                      if (res.success) {
                        addToast({ title: 'OK', description: 'Colis mis à jour' })
                        setColis(prev => prev.map(p => p.id === c.id ? (res.data || p) : p))
                      } else {
                        addToast({ title: 'Erreur', description: res.error || 'Action impossible', variant: 'destructive' })
                      }
                    } catch (e) {
                      console.error(e)
                      addToast({ title: 'Erreur', description: 'Action échouée', variant: 'destructive' })
                    }
                  }}>
                    <Truck className="mr-2 h-4 w-4" />Déclarer envoyé
                  </Button>
                  <Button size="sm" asChild>
                    <a href={`/dashboard/artisan/orders/${c.id_validation}`}>
                      <ArrowRight className="mr-2 h-4 w-4" />Voir commande
                    </a>
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
