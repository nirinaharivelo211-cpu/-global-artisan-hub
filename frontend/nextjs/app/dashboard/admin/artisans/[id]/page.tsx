"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Ban,
  AlertTriangle,
  Package,
  CreditCard,
  Eye
} from "lucide-react"

const statusColors = {
  "en attente": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "actif": "bg-green-100 text-green-800 border-green-200",
  "suspendu": "bg-orange-100 text-orange-800 border-orange-200",
  "banni": "bg-red-100 text-red-800 border-red-200",
}

const ITEMS_PER_PAGE = 5

export default function ArtisanProfilePage() {
  const params = useParams()
  const router = useRouter()
  const artisanId = params.id as string

  const [artisan, setArtisan] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("en attente")
  const [banReason, setBanReason] = useState("")
  const [suspendReason, setSuspendReason] = useState("")
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    if (!artisan) return []
    return artisan.products.filter((product: any) => statusFilter === "all" || product.status === statusFilter)
  }, [artisan, statusFilter])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentProducts = filteredProducts.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleValidate = () => {
    // TODO: Implement validation logic
  }

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

  if (!artisan) {
    return (
      <DashboardLayout role="admin">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Artisan non trouvé</h3>
          <p className="text-muted-foreground mb-4">L&apos;artisan demandé n&apos;existe pas.</p>
          <Button asChild>
            <Link href="/dashboard/admin/artisans">Retour à la liste</Link>
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
            <Link href="/dashboard/admin/artisans">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Profil de l&apos;artisan</h1>
            <p className="text-muted-foreground">Détails complets de {artisan.firstName} {artisan.lastName}</p>
          </div>
        </div>

        {/* Profile Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={artisan.avatar} alt={`${artisan.firstName} ${artisan.lastName}`} />
                <AvatarFallback className="text-lg">{artisan.firstName[0]}{artisan.lastName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nom complet</Label>
                    <p className="text-lg font-medium">{artisan.firstName} {artisan.lastName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {artisan.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Téléphone</Label>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {artisan.phone}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Date d&apos;inscription</Label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(artisan.registrationDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={`${statusColors[artisan.status as keyof typeof statusColors]}`}>
                      {artisan.status}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      {artisan.productsCount} produits
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      Ar {Math.round(artisan.totalSales * 5000).toLocaleString()} de ventes
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {artisan.status === "en attente" && (
                      <Button onClick={handleValidate}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Valider
                      </Button>
                    )}
                    <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <Ban className="h-4 w-4 mr-2" />
                          Bannir
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Bannir l&apos;artisan</DialogTitle>
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
                          <UserX className="h-4 w-4 mr-2" />
                          Suspendre
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Suspendre l&apos;artisan</DialogTitle>
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

        {/* Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif">Produits de l'artisan</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-45">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="en attente">En attente</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {currentProducts.length > 0 ? (
              <div className="space-y-4">
                {currentProducts.map((product: any) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">Ar {Math.round(product.price * 5000).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className={`${statusColors[product.status as keyof typeof statusColors]}`}>
                      {product.status}
                    </Badge>
                  </div>
                ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                      Affichage de {startIndex + 1} à {Math.min(endIndex, filteredProducts.length)} sur {filteredProducts.length} produits
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Précédent
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} sur {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun produit trouvé pour ce filtre.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}