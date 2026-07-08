// @ts-nocheck
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MultiSelect } from "@/components/ui/multi-select"
import { PhoneInput } from "@/components/ui/phone-input"
import { UserPlus, Search, Edit, UserX, UserCheck, Mail, Phone, Shield, MapPin, Building2, Users, SlidersHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAppToast } from "@/context/toast-context"
import { useAuth } from "@/context/auth-context"
import { authApi, hubsApi, zonesApi } from "@/lib/api-client"
import { API_BASE_URL, getAuthToken } from "@/lib/api-config"
import { getRoleColor, getStatusColor } from "@/lib/user-badge-colors"

// Types
interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatar?: string
  role: "manager" | "livreur"
  status: "actif" | "inactif"
  deliveryZone?: string
  hub?: number | null
  hub_nom?: string | null
  zone_livraison?: number | null
  zone_livraison_nom?: string | null
  zones_livraison?: number[]
  zones_livraison_noms?: string[]
  region?: string
  createdAt: string
  quota_quotidien?: number
  charge_aujourdhui?: number | null
}

const ITEMS_PER_PAGE = 9

export default function UsersManagementPage() {
  const { addToast } = useAppToast()
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [generatedCreds, setGeneratedCreds] = useState<{ email: string; password: string }>({ email: "", password: "" })

  // Check if user is manager and redirect to admin dashboard
  useEffect(() => {
    if (user?.role === "manager") {
      router.replace("/dashboard/admin")
    }
  }, [user, router])

  // load existing managers and livreurs
  const loadUsers = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/utilisateurs/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) {
        console.error('failed to fetch users', response.status)
        return
      }
      const data = await response.json()
      // data is array of users
      const mapped: User[] = data.map((u: any) => ({
        id: u.id,
        firstName: u.prenom || u.firstName || "",
        lastName: u.nom || u.lastName || "",
        email: u.email,
        phone: u.telephone || u.phone || "",
        avatar: (() => { const a = u.avatar || u.photo_de_profil || u.photo || ""; return a ? (a.startsWith("http") ? a : `${API_BASE_URL}${a}`) : "" })(),
        role: u.role,
        status: u.statut || 'actif',
        deliveryZone: u.zone_livraison_nom || '',
        hub: u.hub ? String(u.hub) : "",
        hub_nom: u.hub_nom || null,
        zone_livraison: u.zone_livraison || null,
        zone_livraison_nom: u.zone_livraison_nom || null,
        zones_livraison: u.zones_livraison?.map(String) || [],
        zones_livraison_noms: u.zones_livraison_noms || [],
        quota_quotidien: u.quota_quotidien ?? 15,
        charge_aujourdhui: u.charge_aujourdhui ?? 0,
        createdAt: u.date_inscription || new Date().toISOString(),
      })).filter((u: any) => u.role === 'manager' || u.role === 'livreur')
      setUsers(mapped)
    } catch (err) {
      console.error('fetch users error', err)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const generatePassword = () => {
    // simple random 12-character string
    return Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6)
  }

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "+261 ",
    role: "livreur" as "manager" | "livreur",
    email: "",
    password: "",
    confirmPassword: "",
    status: "actif" as "actif" | "inactif",
    deliveryZone: "",
    autoGeneratePassword: true,
    hub: "",
    zones_livraison: [] as string[],
    quota_quotidien: 15,
    region: "",
  })

  const [hubs, setHubs] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])

  const openAddModal = () => {
    setFormData({
      firstName: "", lastName: "", phone: "+261 ", role: "livreur" as "manager" | "livreur",
      email: "", password: "", confirmPassword: "", status: "actif" as "actif" | "inactif",
      deliveryZone: "", autoGeneratePassword: true, hub: "",
      zones_livraison: [] as string[], quota_quotidien: 15, region: "",
    })
    setAddModalOpen(true)
  }

  // Load hubs for dropdowns
  useEffect(() => {
    const loadHubs = async () => {
      try {
        const res = await hubsApi.fetchHubs()
        if (res.success && res.data) setHubs(res.data)
      } catch {}
    }
    loadHubs()
  }, [])

  // Load zones when hub changes
  useEffect(() => {
    const loadZones = async () => {
      if (!formData.hub) { setZones([]); return }
      try {
        const res = await zonesApi.fetchZones(formData.hub)
        if (res.success && res.data) setZones(res.data)
      } catch {}
    }
    loadZones()
  }, [formData.hub])

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone.includes(searchQuery)
      const matchesRole = roleFilter === "all" || user.role === roleFilter
      const matchesStatus = statusFilter === "all" || user.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentUsers = filteredUsers.slice(startIndex, endIndex)

  const handleRoleChange = (role: "manager" | "livreur") => {
    setFormData(prev => ({
      ...prev,
      role,
    }))
  }

  const handleNameChange = (field: "firstName" | "lastName", value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAddUser = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
      addToast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "error",
      })
      return
    }

    if (!formData.autoGeneratePassword && formData.password !== formData.confirmPassword) {
      addToast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "error",
      })
      return
    }

    const password = formData.autoGeneratePassword ? generatePassword() : formData.password

    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: password,
        role: formData.role,
        force_password_change: formData.autoGeneratePassword,
      }
      if (formData.role === 'livreur' || formData.role === 'manager') {
        if (formData.hub) payload.hub = parseInt(formData.hub)
      }
      if (formData.role === 'livreur') {
        payload.quota_quotidien = formData.quota_quotidien
        if (formData.zones_livraison.length > 0) {
          payload.zones_livraison = formData.zones_livraison.map(Number)
          payload.zone_livraison = payload.zones_livraison[0]
        }
      }
      const result = await authApi.createUser(payload)
      if (!result.success) {
        addToast({ title: "Erreur", description: result.error || "Création échouée", variant: "error" })
        return
      }
      await loadUsers()
      if (formData.autoGeneratePassword) {
        setGeneratedCreds({ email: formData.email, password })
        setSuccessModalOpen(true)
      }
      setAddModalOpen(false)
      setFormData({
        firstName: "",
        lastName: "",
        phone: "+261 ",
        role: "livreur",
        email: "",
        password: "",
        confirmPassword: "",
        status: "actif",
        deliveryZone: "",
        autoGeneratePassword: true,
        hub: "",
        zones_livraison: [],
        quota_quotidien: 15,
        region: "",
      })
      addToast({
        title: "Succès",
        description: "Utilisateur créé avec succès",
        variant: "success",
      })
    } catch (err) {
      console.error(err)
      addToast({ title: "Erreur", description: "Erreur lors de la création", variant: "error" })
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      const token = getAuthToken()
      const payload: any = {
        prenom: formData.firstName,
        nom: formData.lastName,
        telephone: formData.phone,
        statut: formData.status,
      }
      if (selectedUser.role === 'livreur' || selectedUser.role === 'manager') {
        if (formData.hub) payload.hub = parseInt(formData.hub)
      }
      if (selectedUser.role === 'livreur') {
        payload.quota_quotidien = formData.quota_quotidien
        if (formData.zones_livraison.length > 0) {
          payload.zones_livraison = formData.zones_livraison.map(Number)
          payload.zone_livraison = payload.zones_livraison[0]
        } else {
          payload.zones_livraison = []
          payload.zone_livraison = null
        }
      }

      const resp = await fetch(`${API_BASE_URL}/utilisateurs/${selectedUser.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        const errBody = await resp.text()
        throw new Error(`Update failed (${resp.status}): ${errBody}`)
      }

      await loadUsers()
      setEditModalOpen(false)
      setSelectedUser(null)

      addToast({
        title: "Succès",
        description: "Modifications enregistrées",
        variant: "success",
      })
    } catch (err) {
      console.error(err)
      addToast({ title: "Erreur", description: "Erreur lors de la modification", variant: "error" })
    }
  }

  const handleDeactivateUser = async () => {
    if (!selectedUser) return

    const newStatus = selectedUser.status === "actif" ? "inactif" : "actif"
    const res = await usersApi.updateUserStatus(selectedUser.id, newStatus)
    if (res.success) {
      setUsers(prev => prev.map(user =>
        user.id === selectedUser.id
          ? { ...user, status: newStatus }
          : user
      ))
      setDeactivateModalOpen(false)
      setSelectedUser(null)
      addToast({
        title: "Succès",
        description: newStatus === "inactif" ? "Utilisateur désactivé" : "Utilisateur réactivé",
        variant: "success",
      })
    } else {
      addToast({
        title: "Erreur",
        description: res.error || "Impossible de modifier le statut",
        variant: "error",
      })
    }
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    // Fetch zones for the user's hub if available
    if (user.hub) {
      zonesApi.fetchZones(String(user.hub)).then(res => {
        if (res.success && res.data) setZones(res.data)
      }).catch(() => {})
    }
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      email: user.email,
      password: "",
      confirmPassword: "",
      status: user.status,
      deliveryZone: user.deliveryZone || "",
      autoGeneratePassword: true,
      hub: user.hub ? String(user.hub) : "",
      zones_livraison: user.zones_livraison?.map(String) || [],
      quota_quotidien: user.quota_quotidien ?? 15,
      region: user.region || "",
    })
    setEditModalOpen(true)
  }

  const openDeactivateModal = (user: User) => {
    setSelectedUser(user)
    setDeactivateModalOpen(true)
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Managers / Livreurs</h1>
            <p className="mt-1 text-muted-foreground">Créer un compte manager ou livreur</p>
          </div>
          <Button onClick={openAddModal}>
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Nom, email ou téléphone"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 bg-background border-border/60 focus-visible:border-primary"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-[140px] bg-background border-border/60 focus:ring-primary/20">
                    <SelectValue placeholder="Rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="livreur">Livreur</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-[130px] bg-background border-border/60 focus:ring-primary/20">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {currentUsers.map((user) => (
            <Card key={user.id} className={`border-0 shadow-md bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${user.status === 'inactif' ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                    <AvatarFallback className="text-xs">{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{user.firstName} {user.lastName}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge className={`text-[12px] h-6 px-2 ${getRoleColor(user.role)}`}>
                        {user.role === 'manager' ? 'Manager' : 'Livreur'}
                      </Badge>
                      <Badge className={`text-[12px] h-6 px-2 ${getStatusColor(user.status)}`}>
                        {user.status === 'actif' ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                  {user.hub_nom && (
                    <div className="flex items-center gap-2 text-xs">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>Hub: {user.hub_nom}</span>
                    </div>
                  )}
                  {(user.zone_livraison_nom || user.zones_livraison_noms?.length > 0) && (
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[12px] text-violet-600">
                        {(user.zones_livraison_noms?.length > 0 ? user.zones_livraison_noms : [user.zone_livraison_nom]).join(", ")}
                      </span>
                    </div>
                  )}
                  {user.role === 'livreur' && user.quota_quotidien != null && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[12px] text-muted-foreground mb-0.5">
                        <span>Charge du jour</span>
                        <span className="font-medium tabular-nums">{user.charge_aujourdhui ?? 0}/{user.quota_quotidien}</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (user.charge_aujourdhui ?? 0) >= user.quota_quotidien
                              ? 'bg-red-500'
                              : (user.charge_aujourdhui ?? 0) >= user.quota_quotidien * 0.8
                              ? 'bg-amber-400'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, ((user.charge_aujourdhui ?? 0) / user.quota_quotidien) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(user)}
                    className="h-7 text-xs px-2 flex-1"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant={user.status === 'actif' ? 'destructive' : 'default'}
                    onClick={() => openDeactivateModal(user)}
                    className="h-7 text-xs px-2 flex-1"
                  >
                    {user.status === 'actif' ? (
                      <>
                        <UserX className="h-3.5 w-3.5 mr-1" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                        Réactiver
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        )}

        {/* Add User Modal */}
        {/* Success Modal */}
        <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Utilisateur créé</DialogTitle>
            </DialogHeader>
            <div>
              <p>Email: <strong>{generatedCreds.email}</strong></p>
              <p>Mot de passe: <strong>{generatedCreds.password}</strong></p>
              <p className="mt-2 text-sm text-muted-foreground">
                L&apos;utilisateur devra changer son mot de passe à la première connexion.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setSuccessModalOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un utilisateur</DialogTitle>
            </DialogHeader>

      <div className="space-y-6">
              {/* Bloc 1: Informations de base */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Informations de base</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleNameChange("firstName", e.target.value)}
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleNameChange("lastName", e.target.value)}
                      placeholder="Nom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <PhoneInput
                      id="phone"
                      value={formData.phone}
                      onChange={(v) => setFormData(prev => ({ ...prev, phone: v }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rôle</Label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="livreur">Livreur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ex: rakotopaul@gmail.com"
                    />
                  </div>
                </div>

                {/* Password section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoGenerate"
                      checked={formData.autoGeneratePassword}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, autoGeneratePassword: checked as boolean }))
                      }
                    />
                    <Label htmlFor="autoGenerate" className="text-sm">Générer automatiquement le mot de passe</Label>
                  </div>

                  {!formData.autoGeneratePassword && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Mot de passe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirmer le mot de passe"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloc 2: Informations spécifiques au rôle */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  Informations {formData.role === 'livreur' ? 'livreur' : 'administrateur'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <Select value={formData.status} onValueChange={(value: "actif" | "inactif") => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="inactif">Inactif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(formData.role === 'livreur' || formData.role === 'manager') && (
                    <div className="space-y-2">
                      <Label htmlFor="hub">Hub de rattachement</Label>
                      <Select value={formData.hub} onValueChange={(value) => setFormData(prev => ({ ...prev, hub: value, zones_livraison: [] }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un hub" />
                        </SelectTrigger>
                        <SelectContent>
                          {hubs.filter(h => h.actif !== false && (formData.role !== 'manager' || !h.gestionnaire)).map((hub: any) => (
                            <SelectItem key={hub.id} value={String(hub.id)}>{hub.nom} ({hub.ville})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.role === 'livreur' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="addQuota">Quota quotidien</Label>
                        <Input
                          id="addQuota"
                          type="number"
                          min={1}
                          max={99}
                          value={formData.quota_quotidien}
                          onChange={(e) => setFormData(prev => ({ ...prev, quota_quotidien: Math.max(1, Math.min(99, parseInt(e.target.value) || 15)) }))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Zones de livraison</Label>
                        {!formData.hub ? (
                          <p className="text-sm text-muted-foreground">D'abord choisir un hub</p>
                        ) : (
                          <MultiSelect
                            options={zones.filter(z => z.actif !== false)}
                            selected={formData.zones_livraison}
                            onChange={(ids) => setFormData(prev => ({ ...prev, zones_livraison: ids }))}
                            placeholder="Sélectionner des zones"
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddUser}>
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">Prénom</Label>
                  <Input
                    id="editFirstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Nom</Label>
                  <Input
                    id="editLastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Téléphone</Label>
                  <PhoneInput
                    id="editPhone"
                    value={formData.phone}
                    onChange={(v) => setFormData(prev => ({ ...prev, phone: v }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStatus">Statut</Label>
                  <Select value={formData.status} onValueChange={(value: "actif" | "inactif") => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="editEmail">Email (non modifiable)</Label>
                  <Input
                    id="editEmail"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {(selectedUser?.role === 'livreur' || selectedUser?.role === 'manager') && (
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{selectedUser?.role === 'manager' ? 'Informations manager' : 'Informations livreur'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editHub">Hub de rattachement</Label>
                      <Select value={formData.hub} onValueChange={(value) => setFormData(prev => ({ ...prev, hub: value, zones_livraison: [] }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un hub" />
                        </SelectTrigger>
                        <SelectContent>
                          {hubs.filter(h => h.actif !== false && (selectedUser?.role !== 'manager' || !h.gestionnaire || h.gestionnaire === selectedUser.id)).map((hub: any) => (
                            <SelectItem key={hub.id} value={String(hub.id)}>{hub.nom} ({hub.ville})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedUser?.role === 'livreur' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="editQuota">Quota quotidien</Label>
                          <Input
                            id="editQuota"
                            type="number"
                            min={1}
                            max={99}
                            value={formData.quota_quotidien}
                            onChange={(e) => setFormData(prev => ({ ...prev, quota_quotidien: Math.max(1, Math.min(99, parseInt(e.target.value) || 15)) }))}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Zones de livraison</Label>
                          {!formData.hub ? (
                            <p className="text-sm text-muted-foreground">D'abord choisir un hub</p>
                          ) : (
                            <MultiSelect
                              options={zones.filter(z => z.actif !== false)}
                              selected={formData.zones_livraison}
                              onChange={(ids) => setFormData(prev => ({ ...prev, zones_livraison: ids }))}
                              placeholder="Sélectionner des zones"
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditUser}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate User Modal */}
        <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedUser?.status === 'actif' ? 'Désactiver' : 'Réactiver'} l&apos;utilisateur
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-muted-foreground">
                {selectedUser?.status === 'actif'
                  ? "Cet utilisateur ne pourra plus se connecter à la plateforme."
                  : "Cet utilisateur pourra à nouveau se connecter à la plateforme."
                }
              </p>
              {selectedUser && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeactivateModalOpen(false)}>
                Annuler
              </Button>
              <Button
                variant={selectedUser?.status === 'actif' ? 'destructive' : 'default'}
                onClick={handleDeactivateUser}
              >
                {selectedUser?.status === 'actif' ? 'Désactiver' : 'Réactiver'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
