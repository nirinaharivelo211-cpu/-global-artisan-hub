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
import { Search, Users, Eye, Mail, Phone, SlidersHorizontal } from "lucide-react"
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

interface ClientData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatar?: string
  status: string
  role: string
}

export default function ClientsManagementPage() {
  const [clients, setClients] = useState<ClientData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<"suspend" | "ban" | "reactivate" | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedClientName, setSelectedClientName] = useState<string>("")
  const [reason, setReason] = useState("")

  // Load clients on mount
  useEffect(() => {
    const loadClients = async () => {
      setIsLoading(true)
      try {
        const response = await usersApi.fetchClients()
        if (response.success && response.data) {
          const rawData = response.data as any
          const normalized = (Array.isArray(rawData) ? rawData : rawData.results || [])
            .filter((user: any) => (user.role || user.role_utilisateur || "").toLowerCase() === "client")
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
                status: user.statut || user.status || "actif",
                role: (user.role || user.role_utilisateur || "client").toLowerCase(),
              }
            })
          setClients(normalized)
        }
      } catch (error) {
        console.error("Error loading clients:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadClients()
  }, [])

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery)
      const matchesStatus = statusFilter === "all" || client.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [clients, searchQuery, statusFilter])

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentClients = filteredClients.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const openSuspendModal = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClientId(clientId)
    setSelectedClientName(client ? `${client.firstName} ${client.lastName}` : "")
    setModalAction("suspend")
    setReason("")
    setModalOpen(true)
  }

  const openBanModal = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClientId(clientId)
    setSelectedClientName(client ? `${client.firstName} ${client.lastName}` : "")
    setModalAction("ban")
    setReason("")
    setModalOpen(true)
  }

  const openReactivateModal = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClientId(clientId)
    setSelectedClientName(client ? `${client.firstName} ${client.lastName}` : "")
    setModalAction("reactivate")
    setReason("Réactivation du compte")
    setModalOpen(true)
  }

  const confirmAction = async () => {
    if (!selectedClientId || !modalAction) return
    
    if (!reason.trim() && modalAction !== "reactivate") {
      alert("Veuillez entrer une raison")
      return
    }

    setActionLoading(selectedClientId)
    try {
      let response
      if (modalAction === "suspend") {
        response = await usersApi.suspendreUser(selectedClientId, reason)
      } else if (modalAction === "ban") {
        response = await usersApi.bannirUser(selectedClientId, reason)
      } else {
        response = await usersApi.reactiverUser(selectedClientId)
      }
      if (response.success) {
        const newStatus = modalAction === "suspend" ? "suspendu" : modalAction === "ban" ? "banni" : "actif"
        setClients(clients.map(c => c.id === selectedClientId ? { ...c, status: newStatus } : c))
      } else {
        alert(response.error || "Erreur lors de l'opération")
      }
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setActionLoading(null)
      setModalOpen(false)
      setReason("")
      setSelectedClientId(null)
      setSelectedClientName("")
      setModalAction(null)
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setReason("")
    setSelectedClientId(null)
    setSelectedClientName("")
    setModalAction(null)
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Gestion des clients</h1>
          <p className="mt-1 text-muted-foreground">Gérez tous les clients de la plateforme</p>
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

        {/* Clients Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {currentClients.length > 0 ? (
            currentClients.map((client) => (
              <Card key={client.id} className="border-0 shadow-md bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={client.avatar} alt={`${client.firstName} ${client.lastName}`} />
                      <AvatarFallback className="text-xs">{client.firstName[0]}{client.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground">
                        {client.firstName} {client.lastName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className={`${getRoleColor(client.role)} text-[12px] h-6 px-2 whitespace-nowrap`}>
                          {client.role}
                        </Badge>
                        <Badge variant="outline" className={`${statusColors[client.status as keyof typeof statusColors]} text-[12px] h-6 px-2 whitespace-nowrap`}>
                          {client.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                        {client.status === "actif" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-3 flex-1 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                              onClick={() => openSuspendModal(client.id)}
                              disabled={actionLoading === client.id}
                            >
                              Suspendre
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-3 flex-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 transition-colors"
                              onClick={() => openBanModal(client.id)}
                              disabled={actionLoading === client.id}
                            >
                              Bannir
                            </Button>
                          </>
                        )}
                        {client.status === "suspendu" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-3 flex-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                            onClick={() => openReactivateModal(client.id)}
                            disabled={actionLoading === client.id}
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
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aucun client pour le moment</h3>
              <p className="text-muted-foreground">Les nouveaux clients apparaîtront ici une fois inscrits.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredClients.length)} sur {filteredClients.length} clients
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
                  ? `Suspendre ${selectedClientName}`
                  : modalAction === "ban"
                    ? `Bannir ${selectedClientName}`
                    : `Réactiver ${selectedClientName}`}
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
