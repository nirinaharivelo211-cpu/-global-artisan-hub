// @ts-nocheck
"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, MapPin, Phone, User, Globe, Building2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Wallet, Tag } from "lucide-react"
import { useAppToast } from "@/context/toast-context"
import { hubsApi, zonesApi } from "@/lib/api-client"
import { REGIONS, CITIES_BY_REGION } from "@/lib/madagascar-data"
import { MultiSelect } from "@/components/ui/multi-select"

const ITEMS_PER_PAGE = 9

export default function HubsManagementPage() {
  const { addToast } = useAppToast()
  const [hubs, setHubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedHubId, setExpandedHubId] = useState<string | null>(null)

  // Modal states
  const [hubModalOpen, setHubModalOpen] = useState(false)
  const [editingHub, setEditingHub] = useState<any | null>(null)
  const [zoneModalOpen, setZoneModalOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<any | null>(null)
  const [zoneParentHubId, setZoneParentHubId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<{ type: 'hub' | 'zone'; id: string; name: string } | null>(null)
  const [mmErrors, setMmErrors] = useState({ mvola_number: "", airtel_money_number: "", orange_money_number: "" })

  const MM_PREFIXES: Record<string, string[]> = {
    mvola_number: ["034", "038"],
    airtel_money_number: ["033"],
    orange_money_number: ["032", "037"],
  }

  const formatMmDisplay = (num: string) => {
    if (!num) return ""
    const d = num.replace(/\D/g, "")
    if (d.length >= 5) return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`
    if (d.length >= 3) return `${d.slice(0, 3)} ${d.slice(3)}`
    return d
  }

  const validateMmPrefix = (field: string, value: string): string => {
    const digits = value.replace(/\D/g, "")
    const allowed = MM_PREFIXES[field] || []
    const hasValidPrefix = allowed.some(p => digits.startsWith(p))
    if (digits.length > 0 && !hasValidPrefix) {
      return `Doit commencer par ${allowed.join(" ou ")}`
    }
    return ""
  }

  // Form states
  const [hubForm, setHubForm] = useState({
    nom: "",
    region: "",
    ville: "",
    adresse: "",
    contact: "",
    telephone: "",
    regions_servees: [] as string[],
    actif: true,
    mm_account_holder: "",
    mvola_number: "",
    airtel_money_number: "",
    orange_money_number: "",
    prix_par_km: "200",
    prix_par_kg: "150",
  })

  const [zoneForm, setZoneForm] = useState({
    nom: "",
    hub: "",
    actif: true,
    distance_km: "",
    delai_estime_jours: "3",
    ville: "",
  })

  const loadHubs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await hubsApi.fetchHubs()
      if (res.success && res.data) setHubs(res.data)
    } catch {
      addToast({ title: "Erreur", description: "Impossible de charger les hubs", variant: "error" })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { loadHubs() }, [loadHubs])

  const filteredHubs = useMemo(() => {
    return hubs.filter(h =>
      h.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.ville?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.region?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [hubs, searchQuery])

  const zoneHubRegion = useMemo(() => {
    if (!zoneParentHubId) return ""
    const hub = hubs.find(h => String(h.id) === String(zoneParentHubId))
    return hub?.region || ""
  }, [zoneParentHubId, hubs])

  const totalPages = Math.ceil(filteredHubs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentHubs = filteredHubs.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // HUB CRUD
  const openAddHub = () => {
    setEditingHub(null)
    setHubForm({ nom: "", region: "", ville: "", adresse: "", contact: "", telephone: "", regions_servees: [], actif: true, mm_account_holder: "", mvola_number: "", airtel_money_number: "", orange_money_number: "", prix_par_km: "200", prix_par_kg: "150" })
    setMmErrors({ mvola_number: "", airtel_money_number: "", orange_money_number: "" })
    setHubModalOpen(true)
  }

  const openEditHub = (hub: any) => {
    setEditingHub(hub)
    setHubForm({
      nom: hub.nom || "",
      region: hub.region || "",
      ville: hub.ville || "",
      adresse: hub.adresse || "",
      contact: hub.contact || "",
      telephone: hub.telephone || "",
      regions_servees: Array.isArray(hub.regions_servees) ? hub.regions_servees : [],
      actif: hub.actif !== false,
      mm_account_holder: hub.mm_account_holder || "",
      mvola_number: hub.mvola_number || "",
      airtel_money_number: hub.airtel_money_number || "",
      orange_money_number: hub.orange_money_number || "",
      prix_par_km: String(hub.prix_par_km ?? 200),
      prix_par_kg: String(hub.prix_par_kg ?? 150),
    })
    setHubModalOpen(true)
  }

  const handleSaveHub = async () => {
    if (!hubForm.nom || !hubForm.region || !hubForm.ville) {
      addToast({ title: "Erreur", description: "Nom, région et ville sont requis", variant: "error" })
      return
    }
    const newErrors = {
      mvola_number: validateMmPrefix("mvola_number", hubForm.mvola_number),
      airtel_money_number: validateMmPrefix("airtel_money_number", hubForm.airtel_money_number),
      orange_money_number: validateMmPrefix("orange_money_number", hubForm.orange_money_number),
    }
    setMmErrors(newErrors)
    if (newErrors.mvola_number || newErrors.airtel_money_number || newErrors.orange_money_number) {
      addToast({ title: "Erreur", description: "Corrigez les numéros Mobile Money", variant: "error" })
      return
    }
    const payload: Record<string, any> = { ...hubForm }
    try {
      let res
      if (editingHub) {
        res = await hubsApi.updateHub(editingHub.id, payload)
      } else {
        res = await hubsApi.createHub(payload)
      }
      if (res.success) {
        await loadHubs()
        setHubModalOpen(false)
        addToast({ title: "Succès", description: editingHub ? "Hub modifié" : "Hub créé", variant: "success" })
      } else {
        addToast({ title: "Erreur", description: res.error || "Échec", variant: "error" })
      }
    } catch {
      addToast({ title: "Erreur", description: "Erreur lors de l'enregistrement", variant: "error" })
    }
  }

  const handleDeleteHub = async () => {
    if (!deleteConfirmOpen || deleteConfirmOpen.type !== 'hub') return
    try {
      const res = await hubsApi.deleteHub(deleteConfirmOpen.id)
      if (res.success) {
        await loadHubs()
        setDeleteConfirmOpen(null)
        addToast({ title: "Succès", description: "Hub supprimé", variant: "success" })
      } else {
        addToast({ title: "Erreur", description: res.error || "Échec", variant: "error" })
      }
    } catch {
      addToast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "error" })
    }
  }

  const toggleHubActive = async (hub: any) => {
    try {
      const res = await hubsApi.updateHub(hub.id, { actif: !hub.actif })
      if (res.success) await loadHubs()
    } catch {}
  }

  // ZONE CRUD
  const openAddZone = (hubId: string) => {
    setEditingZone(null)
    setZoneParentHubId(hubId)
    setZoneForm({ nom: "", hub: hubId, actif: true, distance_km: "", delai_estime_jours: "3", ville: "" })
    setZoneModalOpen(true)
  }

  const openEditZone = (zone: any, hubId: string) => {
    setEditingZone(zone)
    setZoneParentHubId(hubId)
    setZoneForm({
      nom: zone.nom || "",
      hub: hubId,
      actif: zone.actif !== false,
      distance_km: String(zone.distance_km ?? ""),
      delai_estime_jours: String(zone.delai_estime_jours ?? 3),
      ville: zone.ville || "",
    })
    setZoneModalOpen(true)
  }

  const handleSaveZone = async () => {
    if (!zoneForm.nom) {
      addToast({ title: "Erreur", description: "Le nom de la zone est requis", variant: "error" })
      return
    }
    try {
      let res
      const payload = {
        nom: zoneForm.nom,
        actif: zoneForm.actif,
        ville: zoneForm.ville || "",
        distance_km: zoneForm.distance_km ? parseFloat(zoneForm.distance_km) : null,
        delai_estime_jours: zoneForm.delai_estime_jours ? parseInt(zoneForm.delai_estime_jours, 10) : 3,
      }
      if (editingZone) {
        res = await zonesApi.updateZone(editingZone.id, payload)
      } else {
        res = await zonesApi.createZone({ ...payload, hub: parseInt(zoneForm.hub) })
      }
      if (res.success) {
        await loadHubs()
        setZoneModalOpen(false)
        addToast({ title: "Succès", description: editingZone ? "Zone modifiée" : "Zone créée", variant: "success" })
      } else {
        addToast({ title: "Erreur", description: res.error || "Échec", variant: "error" })
      }
    } catch {
      addToast({ title: "Erreur", description: "Erreur lors de l'enregistrement", variant: "error" })
    }
  }

  const handleDeleteZone = async () => {
    if (!deleteConfirmOpen || deleteConfirmOpen.type !== 'zone') return
    try {
      const res = await zonesApi.deleteZone(deleteConfirmOpen.id)
      if (res.success) {
        await loadHubs()
        setDeleteConfirmOpen(null)
        addToast({ title: "Succès", description: "Zone supprimée", variant: "success" })
      } else {
        addToast({ title: "Erreur", description: res.error || "Échec", variant: "error" })
      }
    } catch {
      addToast({ title: "Erreur", description: "Erreur lors de la suppression", variant: "error" })
    }
  }

  const toggleZoneActive = async (zone: any) => {
    try {
      const res = await zonesApi.updateZone(zone.id, { actif: !zone.actif })
      if (res.success) await loadHubs()
    } catch {}
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Hubs de livraison</h1>
            <p className="mt-1 text-muted-foreground">Gérer les hubs régionaux et leurs zones de livraison</p>
          </div>
          <Button onClick={openAddHub}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un hub
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Chercher par nom, ville ou région..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="h-10 pl-9 bg-background border-border/60 focus-visible:border-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Hubs Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : currentHubs.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun hub trouvé</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentHubs.map((hub) => (
              <Card key={hub.id} className={`border-border/50 bg-card ${hub.actif === false ? 'opacity-60' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">{hub.nom}</h3>
                        <Badge className={hub.actif !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {hub.actif !== false ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-amber-700" />
                          <span className="w-32 shrink-0 text-xs font-bold text-amber-800">ADRESSE :</span>
                          <span className="text-foreground">{hub.region}, {hub.ville}{hub.adresse ? `, ${hub.adresse}` : ""}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 shrink-0 text-amber-700" />
                          <span className="w-32 shrink-0 text-xs font-bold text-amber-800">RÉGIONS :</span>
                          <span className="text-foreground">
                            {Array.isArray(hub.regions_servees) && hub.regions_servees.length > 0
                              ? hub.regions_servees.join(", ")
                              : "Aucune"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-amber-700" />
                          <span className="w-32 shrink-0 text-xs font-bold text-amber-800">ZONES :</span>
                          <span className="text-foreground">{hub.zones_count || 0} zone{(hub.zones_count || 0) !== 1 ? 's' : ''}</span>
                        </div>
                        {(hub.prix_par_km != null || hub.prix_par_kg != null) && (
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 shrink-0 text-amber-700" />
                            <span className="w-32 shrink-0 text-xs font-bold text-amber-800">TARIFS :</span>
                            <span className="text-foreground">
                              {hub.prix_par_km != null && <span className="text-xs text-amber-700">km: Ar {Number(hub.prix_par_km).toLocaleString()}</span>}
                              {hub.prix_par_km != null && hub.prix_par_kg != null && <span className="text-muted-foreground mx-1">·</span>}
                              {hub.prix_par_kg != null && <span className="text-xs text-amber-700">kg: Ar {Number(hub.prix_par_kg).toLocaleString()}</span>}
                            </span>
                          </div>
                        )}
                        {hub.contact && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 shrink-0 text-amber-700" />
                            <span className="w-32 shrink-0 text-xs font-bold text-amber-800">RESPONSABLE :</span>
                            <span className="text-foreground">{hub.contact}</span>
                          </div>
                        )}
                        {hub.telephone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0 text-amber-700" />
                            <span className="w-32 shrink-0 text-xs font-bold text-amber-800">TÉL. :</span>
                            <span className="text-foreground">{hub.telephone}</span>
                          </div>
                        )}
                        {hub.mm_account_holder && (
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 shrink-0 text-amber-700" />
                            <span className="text-xs text-foreground">
                              {[
                                hub.mvola_number && { num: formatMmDisplay(hub.mvola_number), label: "MVola", cls: "text-yellow-600" },
                                hub.airtel_money_number && { num: formatMmDisplay(hub.airtel_money_number), label: "Airtel", cls: "text-red-600" },
                                hub.orange_money_number && { num: formatMmDisplay(hub.orange_money_number), label: "Orange", cls: "text-orange-600" },
                              ].filter(Boolean).map((item: any, i: number, arr: any[]) => (
                                <span key={item.label}>
                                  {i === 0 && <span className="font-medium">{hub.mm_account_holder}</span>}
                                  {i === 0 && <span className="text-muted-foreground mx-2">—</span>}
                                  <span className={`font-semibold ${item.cls}`}>{item.num}</span>
                                  <span className="text-muted-foreground"> {item.label}</span>
                                  {i < arr.length - 1 && <span className="text-muted-foreground mx-2">·</span>}
                                </span>
                              ))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleHubActive(hub)}>
                        {hub.actif !== false ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditHub(hub)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteConfirmOpen({ type: 'hub', id: hub.id, name: hub.nom })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExpandedHubId(expandedHubId === hub.id ? null : hub.id)}>
                        {expandedHubId === hub.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded zone list */}
                  {expandedHubId === hub.id && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">Zones de livraison</h4>
                        <Button size="sm" variant="outline" onClick={() => openAddZone(hub.id)}>
                          <Plus className="h-4 w-4 mr-1.5" />
                          Ajouter une zone
                        </Button>
                      </div>
                      {(!hub.zones || hub.zones.length === 0) ? (
                        <p className="text-sm text-muted-foreground">Aucune zone définie pour ce hub</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {hub.zones.map((zone: any) => (
                            <div key={zone.id} className={`flex items-center justify-between p-2 rounded-md border border-border/50 ${zone.actif === false ? 'opacity-50' : ''}`}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-sm truncate">{zone.nom}</span>
                                {zone.ville && <span className="text-xs text-muted-foreground shrink-0">({zone.ville})</span>}
                                {zone.distance_km != null && <span className="text-xs text-amber-700 shrink-0">{zone.distance_km} km</span>}
                                <span className="text-xs text-blue-600 shrink-0">{zone.delai_estime_jours ?? 3} jour(s)</span>
                                <Badge variant="outline" className="text-xs shrink-0">{zone.actif !== false ? 'Actif' : 'Inactif'}</Badge>
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toggleZoneActive(zone)}>
                                  {zone.actif !== false ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditZone(zone, hub.id)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteConfirmOpen({ type: 'zone', id: zone.id, name: zone.nom })}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Précédent
            </Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} sur {totalPages}</span>
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Suivant
            </Button>
          </div>
        )}

        {/* Hub Add/Edit Modal */}
        <Dialog open={hubModalOpen} onOpenChange={setHubModalOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingHub ? "Modifier le hub" : "Ajouter un hub"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du hub</Label>
                  <Input value={hubForm.nom} onChange={e => setHubForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: Antananarivo" />
                </div>
                <div className="space-y-2">
                  <Label>Région</Label>
                  <Select value={hubForm.region} onValueChange={v => setHubForm(p => ({ ...p, region: v, ville: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner une région" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Select value={hubForm.ville} onValueChange={v => setHubForm(p => ({ ...p, ville: v }))} disabled={!hubForm.region}>
                    <SelectTrigger><SelectValue placeholder={hubForm.region ? "Sélectionner une ville" : "Choisissez d'abord une région"} /></SelectTrigger>
                    <SelectContent>
                      {(CITIES_BY_REGION[hubForm.region] || []).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Actif</Label>
                  <Select value={hubForm.actif ? "true" : "false"} onValueChange={v => setHubForm(p => ({ ...p, actif: v === "true" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Actif</SelectItem>
                      <SelectItem value="false">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contact (personne responsable)</Label>
                  <Input value={hubForm.contact} onChange={e => setHubForm(p => ({ ...p, contact: e.target.value }))} placeholder="Nom du responsable" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={hubForm.telephone} onChange={e => setHubForm(p => ({ ...p, telephone: e.target.value }))} placeholder="+261 34 00 000 00" className="h-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Textarea value={hubForm.adresse} onChange={e => setHubForm(p => ({ ...p, adresse: e.target.value }))} placeholder="Adresse physique du hub" />
              </div>
              <div className="space-y-2">
                <Label>Régions desservies</Label>
                <MultiSelect
                  options={REGIONS.map(r => ({ id: r, nom: r }))}
                  selected={hubForm.regions_servees}
                  onChange={vals => setHubForm(p => ({ ...p, regions_servees: vals }))}
                  placeholder="Sélectionner les régions desservies"
                />
              </div>
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-4 shadow-sm">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  Mobile Money
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Titulaire du compte</Label>
                    <Input value={hubForm.mm_account_holder} onChange={e => setHubForm(p => ({ ...p, mm_account_holder: e.target.value }))} placeholder="Ex: E-artisan Tana" className="h-9" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 ring-1 ring-yellow-300" />
                        MVola
                      </Label>
                      <Input
                        value={hubForm.mvola_number}
                        onChange={e => {
                          const v = e.target.value
                          setHubForm(p => ({ ...p, mvola_number: v }))
                          setMmErrors(prev => ({ ...prev, mvola_number: validateMmPrefix("mvola_number", v) }))
                        }}
                        placeholder="034 00 000 00"
                        className={`h-9 ${mmErrors.mvola_number ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {mmErrors.mvola_number && <p className="text-xs text-red-500">{mmErrors.mvola_number}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500 ring-1 ring-red-300" />
                        Airtel Money
                      </Label>
                      <Input
                        value={hubForm.airtel_money_number}
                        onChange={e => {
                          const v = e.target.value
                          setHubForm(p => ({ ...p, airtel_money_number: v }))
                          setMmErrors(prev => ({ ...prev, airtel_money_number: validateMmPrefix("airtel_money_number", v) }))
                        }}
                        placeholder="033 00 000 00"
                        className={`h-9 ${mmErrors.airtel_money_number ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {mmErrors.airtel_money_number && <p className="text-xs text-red-500">{mmErrors.airtel_money_number}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <span className="inline-block h-2 w-2 rounded-full bg-orange-500 ring-1 ring-orange-300" />
                        Orange Money
                      </Label>
                      <Input
                        value={hubForm.orange_money_number}
                        onChange={e => {
                          const v = e.target.value
                          setHubForm(p => ({ ...p, orange_money_number: v }))
                          setMmErrors(prev => ({ ...prev, orange_money_number: validateMmPrefix("orange_money_number", v) }))
                        }}
                        placeholder="032 00 000 00"
                        className={`h-9 ${mmErrors.orange_money_number ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {mmErrors.orange_money_number && <p className="text-xs text-red-500">{mmErrors.orange_money_number}</p>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3 shadow-sm">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Tarifs livraison
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Par kilomètre (Ar)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={hubForm.prix_par_km}
                      onChange={e => setHubForm(p => ({ ...p, prix_par_km: e.target.value }))}
                      placeholder="200"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Par kilogramme (Ar)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={hubForm.prix_par_kg}
                      onChange={e => setHubForm(p => ({ ...p, prix_par_kg: e.target.value }))}
                      placeholder="150"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHubModalOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveHub}>{editingHub ? "Modifier" : "Créer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Zone Add/Edit Modal */}
        <Dialog open={zoneModalOpen} onOpenChange={setZoneModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingZone ? "Modifier la zone" : "Ajouter une zone"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nom de la zone</Label>
                  <Input value={zoneForm.nom} onChange={e => setZoneForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: Centre-ville" />
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Select value={zoneForm.ville} onValueChange={v => setZoneForm(p => ({ ...p, ville: v }))}>
                    <SelectTrigger><SelectValue placeholder={zoneHubRegion ? "Sélectionner une ville" : "Aucune région"} /></SelectTrigger>
                    <SelectContent>
                      {(CITIES_BY_REGION[zoneHubRegion] || []).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Distance du hub (km)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={zoneForm.distance_km}
                  onChange={e => setZoneForm(p => ({ ...p, distance_km: e.target.value }))}
                  placeholder="Ex: 5"
                />
              </div>
              <div className="space-y-2">
                <Label>Délai estimé (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={zoneForm.delai_estime_jours}
                  onChange={e => setZoneForm(p => ({ ...p, delai_estime_jours: e.target.value }))}
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label>Actif</Label>
                <Select value={zoneForm.actif ? "true" : "false"} onValueChange={v => setZoneForm(p => ({ ...p, actif: v === "true" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Actif</SelectItem>
                    <SelectItem value="false">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setZoneModalOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveZone}>{editingZone ? "Modifier" : "Créer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteConfirmOpen !== null} onOpenChange={() => setDeleteConfirmOpen(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer {deleteConfirmOpen?.type === 'hub' ? 'le hub' : 'la zone'} <strong>{deleteConfirmOpen?.name}</strong> ?
              Cette action est irréversible.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(null)}>Annuler</Button>
              <Button variant="destructive" onClick={deleteConfirmOpen?.type === 'hub' ? handleDeleteHub : handleDeleteZone}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
