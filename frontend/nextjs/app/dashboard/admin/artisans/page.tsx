// @ts-nocheck
"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, UserCheck, UserX, Eye, Mail, Phone, SlidersHorizontal } from "lucide-react"
import { usersApi } from "@/lib/api-client"
import { API_BASE_URL } from "@/lib/api-config"
import { STATUS_COLORS, getRoleColor } from "@/lib/user-badge-colors"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

const statusColors = STATUS_COLORS

const ITEMS_PER_PAGE = 9

interface ArtisanData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatar?: string
  status: string
  role: string
}

export default function ArtisansManagementPage() {
  const [artisans, setArtisans] = useState<ArtisanData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<"suspend" | "ban" | "reactivate" | null>(null)
  const [selectedArtisanId, setSelectedArtisanId] = useState<string | null>(null)
  const [selectedArtisanName, setSelectedArtisanName] = useState<string>("")
  const [reason, setReason] = useState("")

  // Load artisans on mount
  useEffect(() => {
    const loadArtisans = async () => {
      setIsLoading(true)
      try {
        const response = await usersApi.fetchArtisans()
        if (response.success && response.data) {
          const normalized = (Array.isArray(response.data) ? response.data : (response.data as any)?.results || [])
            .filter((user: any) => (user.role || user.role_utilisateur || "").toLowerCase() === "artisan")
            .map((user: any) => {
              const rawAvatar = user.avatar || user.photo_de_profil || user.photo || ""
              const avatar = rawAvatar ? (rawAvatar.startsWith("http") ? rawAvatar : `${API_BASE_URL}${rawAvatar}`) : ""
              return {
                id: String(user.id),
                firstName: user.prenom || user.first_name || "",
                lastName: user.nom || user.last_name || "",
                email: user.email || "",
                phone: user.telephone || user.phone || "",
                avatar,
                status: user.statut || user.status || "en attente",
                role: (user.role || user.role_utilisateur || "artisan").toLowerCase(),
              }
            })
          setArtisans(normalized)
        }
      } catch (error) {
        console.error("Error loading artisans:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadArtisans()
  }, [])

  const filteredArtisans = useMemo(() => {
    return artisans.filter((artisan) => {
      const matchesSearch =
        artisan.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.phone.includes(searchQuery)
      const matchesStatus = statusFilter === "all" || artisan.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [artisans, searchQuery, statusFilter])

  const totalPages = Math.ceil(filteredArtisans.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentArtisans = filteredArtisans.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const openSuspendModal = (artisanId: string) => {
    const artisan = artisans.find(a => a.id === artisanId)
    setSelectedArtisanId(artisanId)
    setSelectedArtisanName(artisan ? `${artisan.firstName} ${artisan.lastName}` : "")
    setModalAction("suspend")
    setReason("")
    setModalOpen(true)
  }

  const openBanModal = (artisanId: string) => {
    const artisan = artisans.find(a => a.id === artisanId)
    setSelectedArtisanId(artisanId)
    setSelectedArtisanName(artisan ? `${artisan.firstName} ${artisan.lastName}` : "")
    setModalAction("ban")
    setReason("")
    setModalOpen(true)
  }

  const confirmAction = async () => {
    if (!selectedArtisanId || !modalAction) return
    
    if (!reason.trim() && modalAction !== "reactivate") {
      alert("Veuillez entrer une raison")
      return
    }

    setActionLoading(selectedArtisanId)
    try {
      let response
      if (modalAction === "suspend") {
        response = await usersApi.suspendreUser(selectedArtisanId, reason)
      } else if (modalAction === "ban") {
        response = await usersApi.bannirUser(selectedArtisanId, reason)
      } else {
        response = await usersApi.reactiverUser(selectedArtisanId)
      }
      if (response.success) {
        const newStatus = modalAction === "suspend" ? "suspendu" : modalAction === "ban" ? "banni" : "actif"
        setArtisans(artisans.map(a => a.id === selectedArtisanId ? { ...a, status: newStatus } : a))
      } else {
        alert(response.error || "Erreur lors de l'opération")
      }
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setActionLoading(null)
      setModalOpen(false)
      setReason("")
      setSelectedArtisanId(null)
      setSelectedArtisanName("")
      setModalAction(null)
    }
  }

  const openReactivateModal = (artisanId: string) => {
    const artisan = artisans.find(a => a.id === artisanId)
    setSelectedArtisanId(artisanId)
    setSelectedArtisanName(artisan ? `${artisan.firstName} ${artisan.lastName}` : "")
    setModalAction("reactivate")
    setReason("Réactivation du compte")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setReason("")
    setSelectedArtisanId(null)
    setSelectedArtisanName("")
    setModalAction(null)
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Gestion des artisans</h1>
          <p className="mt-1 text-muted-foreground">Gérez tous les artisans de la plateforme</p>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Nom, email, téléphone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 bg-background border-border/60 focus-visible:border-primary"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background border-border/60 focus:ring-primary/20">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                    <SelectItem value="banni">Banni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Artisans Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {currentArtisans.length > 0 ? (
            currentArtisans.map((artisan) => (
              <Card key={artisan.id} className="border-0 shadow-md bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={artisan.avatar} alt={`${artisan.firstName} ${artisan.lastName}`} />
                      <AvatarFallback className="text-xs">{artisan.firstName[0]}{artisan.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground">
                        {artisan.firstName} {artisan.lastName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className={`${getRoleColor(artisan.role)} text-[12px] h-6 px-2 whitespace-nowrap`}>
                          {artisan.role}
                        </Badge>
                        <Badge variant="outline" className={`${statusColors[artisan.status as keyof typeof statusColors]} text-[12px] h-6 px-2 whitespace-nowrap`}>
                          {artisan.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{artisan.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{artisan.phone}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                        {artisan.status === "actif" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-3 flex-1 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                              onClick={() => openSuspendModal(artisan.id)}
                              disabled={actionLoading === artisan.id}
                            >
                              Suspendre
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-3 flex-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 transition-colors"
                              onClick={() => openBanModal(artisan.id)}
                              disabled={actionLoading === artisan.id}
                            >
                              Bannir
                            </Button>
                          </>
                        )}
                        {artisan.status === "suspendu" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-3 flex-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                            onClick={() => openReactivateModal(artisan.id)}
                            disabled={actionLoading === artisan.id}
                          >
                            Réactiver
                          </Button>
                        )}
                      </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucun artisan pour le moment</h3>
              <p className="text-muted-foreground">Les nouveaux artisans apparaîtront ici une fois inscrits.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredArtisans.length)} sur {filteredArtisans.length} artisans
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

        {/* Reason Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {modalAction === "suspend"
                  ? `Suspendre ${selectedArtisanName}`
                  : modalAction === "ban"
                    ? `Bannir ${selectedArtisanName}`
                    : `Réactiver ${selectedArtisanName}`}
              </DialogTitle>
              <DialogDescription>
                {modalAction === "reactivate" ? "Réactivation du compte" : "Veuillez entrer la raison de cette action"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {modalAction !== "reactivate" && (
                <Textarea
                  placeholder="Entrez la raison (violation de politique, comportement abusif, etc.)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-24"
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModal}>
                Annuler
              </Button>
              <Button
                onClick={confirmAction}
                disabled={actionLoading !== null}
                className={
                  modalAction === "suspend"
                    ? "bg-orange-600"
                    : modalAction === "ban"
                      ? "bg-red-600"
                      : "bg-green-600"
                }
              >
                {actionLoading ? "Traitement..." : "Confirmer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
