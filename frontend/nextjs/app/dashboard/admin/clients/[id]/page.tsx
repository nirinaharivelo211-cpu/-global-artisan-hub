"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getStatusStyle } from "@/lib/statusStyles"
import {
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  Ban,
  AlertTriangle,
  ShoppingCart,
  CreditCard
} from "lucide-react"

const statusColors = {
  "actif": "bg-green-100 text-green-800 border-green-200",
  "suspendu": "bg-orange-100 text-orange-800 border-orange-200",
  "banni": "bg-red-100 text-red-800 border-red-200",
}

const orderStatusColors = {
  "en attente": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "en préparation": "bg-blue-100 text-blue-800 border-blue-200",
  "prête": "bg-green-100 text-green-800 border-green-200",
  "en livraison": "bg-purple-100 text-purple-800 border-purple-200",
  "livrée": "bg-gray-100 text-gray-800 border-gray-200",
  "annulée": "bg-red-100 text-red-800 border-red-200",
}

const getStatusBadge = (status: string) => {
  const style = getStatusStyle(status, 'admin');
  
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${style.color}`} />
      <span className="text-base font-semibold text-gray-900">{style.label}</span>
    </div>
  );
}

export default function ClientProfilePage() {
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<any>(null)
  const [banReason, setBanReason] = useState("")
  const [suspendReason, setSuspendReason] = useState("")
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false)

  const handleBan = () => {
    if (!banReason.trim()) return
    // TODO: Implement ban logic
    setIsBanDialogOpen(false)
    setBanReason("")
  }

  const handleSuspend = () => {
    if (!suspendReason.trim()) return
    // TODO: Implement suspend logic
    setIsSuspendDialogOpen(false)
    setSuspendReason("")
  }

  if (!client) {
    return (
      <DashboardLayout role="admin">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Client non trouvé</h3>
          <p className="text-muted-foreground">Le client demandé n&apos;existe pas.</p>
          <Button asChild>
            <Link href="/dashboard/admin/clients">Retour à la liste</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/admin/clients">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Profil du client</h1>
            <p className="text-muted-foreground">Détails complets de {client.firstName} {client.lastName}</p>
          </div>
        </div>

        {/* Profile Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={client.avatar} alt={`${client.firstName} ${client.lastName}`} />
                <AvatarFallback className="text-lg">{client.firstName[0]}{client.lastName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nom complet</Label>
                    <p className="text-lg font-medium">{client.firstName} {client.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {client.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Téléphone</Label>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {client.phone}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Date d&apos;inscription</Label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(client.registrationDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={`${statusColors[client.status as keyof typeof statusColors]}`}>
                      {client.status}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShoppingCart className="h-4 w-4" />
                      {client.ordersCount} commandes
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      Ar {Math.round(client.totalSpent * 5000).toLocaleString()} dépensés
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <Ban className="h-4 w-4 mr-2" />
                          Bannir
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Bannir le client</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Label htmlFor="ban-reason">Motif du bannissement (obligatoire)</Label>
                          <Textarea
                            id="ban-reason"
                            placeholder="Expliquez la raison du bannissement..."
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsBanDialogOpen(false)}>
                              Annuler
                            </Button>
                            <Button variant="destructive" onClick={handleBan} disabled={!banReason.trim()}>
                              Bannir
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          Suspendre
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Suspendre le client</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Label htmlFor="suspend-reason">Motif de la suspension (obligatoire)</Label>
                          <Textarea
                            id="suspend-reason"
                            placeholder="Expliquez la raison de la suspension..."
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>
                              Annuler
                            </Button>
                            <Button onClick={handleSuspend} disabled={!suspendReason.trim()}>
                              Suspendre
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders History */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Historique des commandes</CardTitle>
          </CardHeader>
          <CardContent>
            {client.orders.length > 0 ? (
              <div className="space-y-4">
                {client.orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-medium">Ar {Math.round(order.amount * 5000).toLocaleString()}</p>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune commande trouvée pour ce client.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}