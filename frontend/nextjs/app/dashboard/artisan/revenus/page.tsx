"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OrderCardList } from "@/components/orders/order-card-row"
import { useState, useEffect, useCallback } from "react"
import { TrendingUp, CreditCard, Wallet, Loader2, CheckCircle, XCircle, Clock, Smartphone, User, Lock, ShieldCheck, AlertTriangle, ChevronUp } from "lucide-react"
import { useAppToast } from "@/context/toast-context"
import { reversementsApi, demandesPaiementApi } from "@/lib/api-client"
import { StatCard } from "@/components/ui/stat-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

type Tab = "revenus" | "demandes"

export default function ArtisanRevenusPage() {
  const { addToast } = useAppToast()
  const [solde, setSolde] = useState<any>(null)
  const [reversements, setReversements] = useState<any[]>([])
  const [demandes, setDemandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDemande, setShowDemande] = useState(false)
  const [montant, setMontant] = useState("")
  const [modePaiement, setModePaiement] = useState("mvola")
  const [referenceMm, setReferenceMm] = useState("")
  const [titulaireMm, setTitulaireMm] = useState("")
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("revenus")
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordValue, setPasswordValue] = useState("")


  const mmOperators = [
    { value: "mvola", label: "MVola", color: "text-yellow-600" },
    { value: "airtel", label: "Airtel Money", color: "text-red-600" },
    { value: "orange", label: "Orange Money", color: "text-orange-600" },
  ]

  const OPERATOR_PREFIXES: Record<string, string[]> = {
    mvola: ["34", "38"],
    airtel: ["33"],
    orange: ["32", "37"],
  }

  const phonePlaceholder = (() => {
    const prefixes = modePaiement ? OPERATOR_PREFIXES[modePaiement] : null
    if (!prefixes) return "34 00 000 00"
    return prefixes.map(p => `${p} 00 000 00`).join(" / ")
  })()

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 9)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    const [soldeRes, revRes, demRes] = await Promise.all([
      reversementsApi.solde(),
      reversementsApi.list(),
      demandesPaiementApi.list(),
    ])
    if (soldeRes.success) setSolde(soldeRes.data)
    if (revRes.success) setReversements(revRes.data)
    if (demRes.success) setDemandes(demRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    const onFocus = () => loadData()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [loadData])

  const validateForm = (): { general: string | null; phone: string | null } => {
    const mt = parseFloat(montant)
    let general: string | null = null
    let phone: string | null = null
    if (!mt || mt <= 0) {
      general = "Montant invalide"
    } else if (mt > (solde?.disponible || 0)) {
      general = "Montant supérieur au solde disponible"
    } else if (!modePaiement) {
      general = "Sélectionnez un opérateur Mobile Money"
    }
    if (!general) {
      const rawDigits = referenceMm.replace(/\D/g, "")
      if (!rawDigits) {
        phone = "Numéro Mobile Money requis"
      } else if (rawDigits.length < 9) {
        general = "Le numéro doit faire 9 chiffres"
      } else {
        const prefix = rawDigits.slice(0, 2)
        const allowed = OPERATOR_PREFIXES[modePaiement]
        if (allowed && !allowed.includes(prefix)) {
          const opLabel = mmOperators.find(o => o.value === modePaiement)?.label || modePaiement
          phone = `Pour ${opLabel}, le numéro doit commencer par ${allowed.join(" ou ")}`
        }
      }
      if (!phone && !titulaireMm.trim()) {
        general = "Titulaire du compte requis"
      }
    }
    setPhoneError(phone)
    return { general, phone }
  }

  const handleConfirmDemande = async () => {
    if (!passwordValue) {
      addToast({ title: "Erreur", description: "Mot de passe requis", variant: "error" })
      return
    }
    setSubmitting(true)
    const res = await demandesPaiementApi.creer({
      montant: parseFloat(montant),
      mode_paiement_artisan: modePaiement,
      reference_mm: referenceMm.trim(),
      titulaire_mm: titulaireMm.trim(),
      mot_de_passe: passwordValue,
    })
    setSubmitting(false)
    setShowPasswordModal(false)
    setPasswordValue("")
    if (res.success) {
      addToast({ title: "Demande envoyée", description: "En attente de validation par l'administration.", variant: "success" })
      setShowDemande(false)
      setMontant("")
      setReferenceMm("")
      setTitulaireMm("")
      loadData()
    } else {
      addToast({ title: "Erreur", description: res.error || "Erreur lors de la demande", variant: "error" })
    }
  }

  const openPasswordModal = () => {
    const { general, phone } = validateForm()
    if (general || phone) {
      if (general) addToast({ title: "Erreur", description: general, variant: "error" })
      return
    }
    setPasswordValue("")
    setShowPasswordModal(true)
  }

  if (loading) return (
    <DashboardLayout role="artisan">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout role="artisan">
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">Mes revenus</h1>

        {/* Stats cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <StatCard
            icon={TrendingUp}
            label="Total gagné"
            value={parseFloat(solde?.total_gagne || "0")}
            prefix="Ar "
            decimals={2}
            subtitle="Revenu brut avant commission"
          />
          <StatCard
            icon={Wallet}
            label="Disponible"
            value={parseFloat(solde?.disponible || "0")}
            prefix="Ar "
            decimals={2}
            subtitle="Montant pouvant être demandé"
          />
          <StatCard
            icon={CreditCard}
            label="Déjà payé"
            value={parseFloat(solde?.deja_paye || "0")}
            prefix="Ar "
            decimals={2}
            subtitle="Total des paiements reçus"
          />
        </div>

        {/* Demander un paiement */}
        {!showDemande ? (
          <Button
            onClick={() => setShowDemande(true)}
            disabled={(solde?.disponible || 0) <= 0}
            className="w-full sm:w-auto"
          >
            <Wallet className="mr-2 h-4 w-4" />
            Demander un paiement
          </Button>
        ) : (
          <Card className="overflow-hidden border shadow-md shadow-black/10">
            <CardHeader className="bg-primary/10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-foreground">Nouvelle demande de paiement</CardTitle>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors p-1" onClick={() => setShowDemande(false)}>
                  <ChevronUp className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="flex items-center gap-1.5 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Les frais d'envoi seront déduits du montant demandé.</p>
              {/* Row 1: Montant + Opérateur */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Montant</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={montant}
                      onChange={(e) => {
                        const val = e.target.value
                        const maxVal = solde?.disponible || 0
                        if (val !== "" && parseFloat(val) > maxVal) {
                          setMontant(String(maxVal))
                        } else {
                          setMontant(val)
                        }
                      }}
                      placeholder="Ex: 50000"
                      max={solde?.disponible || 0}
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      max {parseFloat(solde?.disponible || "0").toLocaleString("fr-FR")} Ar
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Opérateur Mobile Money</Label>
                  <Select value={modePaiement} onValueChange={(val) => {
                    setModePaiement(val)
                    const raw = referenceMm.replace(/\D/g, "")
                    if (raw.length === 9) {
                      const prefix = raw.slice(0, 2)
                      const allowed = OPERATOR_PREFIXES[val]
                      if (allowed && !allowed.includes(prefix)) {
                        const opLabel = mmOperators.find(o => o.value === val)?.label || val
                        setPhoneError(`Pour ${opLabel}, le numéro doit commencer par ${allowed.join(" ou ")}`)
                        return
                      }
                    }
                    setPhoneError(null)
                  }}>
                    <SelectTrigger className="w-full bg-background">
                      <span className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 shrink-0" />
                        <span className={mmOperators.find(o => o.value === modePaiement)?.color || ""}>
                          {mmOperators.find(o => o.value === modePaiement)?.label || "Sélectionner"}
                        </span>
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {mmOperators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          <span className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 shrink-0" />
                            <span className={op.color}>{op.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Numéro + Titulaire */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Numéro Mobile Money</Label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm font-medium text-muted-foreground select-none shadow-sm h-9">
                      +261
                    </span>
                    <Input
                      value={referenceMm}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value)
                        setReferenceMm(formatted)
                        const raw = formatted.replace(/\D/g, "")
                        if (raw.length >= 2) {
                          const prefix = raw.slice(0, 2)
                          const allowed = OPERATOR_PREFIXES[modePaiement]
                          if (allowed && !allowed.includes(prefix)) {
                            const opLabel = mmOperators.find(o => o.value === modePaiement)?.label || modePaiement
                            setPhoneError(`Pour ${opLabel}, le numéro doit commencer par ${allowed.join(" ou ")}`)
                          } else {
                            setPhoneError(null)
                          }
                        } else {
                          setPhoneError(null)
                        }
                      }}
                      placeholder={phonePlaceholder}
                      className={`rounded-l-none ${phoneError ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30" : ""}`}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-xs text-red-500 mt-1">{phoneError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Titulaire du compte</Label>
                  <Input
                    value={titulaireMm}
                    onChange={(e) => setTitulaireMm(e.target.value)}
                    placeholder="Nom complet du titulaire"
                    className="bg-background"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Votre demande sera traitée par le hub de votre région. Une demande par semaine maximum.
              </p>

              <div className="flex gap-3 pt-2">
                <Button onClick={openPasswordModal}>
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  Confirmer la demande
                </Button>
                <Button variant="outline" onClick={() => setShowDemande(false)}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Password popup */}
        <Dialog open={showPasswordModal} onOpenChange={(open) => { if (!submitting) setShowPasswordModal(open) }}>
          <DialogContent className="sm:max-w-[400px] shadow-lg shadow-black/10">
            <DialogHeader>
              <DialogTitle className="text-foreground font-bold flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Confirmez votre identité
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-semibold text-foreground">{parseFloat(montant).toLocaleString("fr-FR")} Ar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opérateur</span>
                    <span className={"font-medium " + (mmOperators.find(o => o.value === modePaiement)?.color || "")}>{mmOperators.find(o => o.value === modePaiement)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Numéro</span>
                    <span className="font-medium text-foreground">+261 {referenceMm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Titulaire</span>
                  <span className="font-medium text-foreground">{titulaireMm}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mdp-confirm" className="text-sm text-foreground">Mot de passe</Label>
                <Input
                  id="mdp-confirm"
                  type="password"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="Votre mot de passe"
                  className="bg-background"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter" && !submitting) handleConfirmDemande() }}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowPasswordModal(false); setPasswordValue("") }} disabled={submitting}>
                Annuler
              </Button>
              <Button onClick={handleConfirmDemande} disabled={submitting}>
                {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
                {submitting ? "Envoi..." : "Confirmer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toggle + table */}
        {reversements.length > 0 || demandes.length > 0 ? (
          <Card className="overflow-hidden border shadow-md shadow-black/10">
            <div className="flex items-center justify-center gap-4 border-b bg-muted/50 px-5 py-3.5">
              <span
                className={`text-sm font-medium transition-colors cursor-pointer ${activeTab === "revenus" ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"}`}
                onClick={() => setActiveTab("revenus")}
              >
                Revenus par commande
              </span>

              <button
                onClick={() => setActiveTab(activeTab === "revenus" ? "demandes" : "revenus")}
                className="relative h-7 w-14 shrink-0 rounded-full bg-gradient-to-r from-amber-700 to-amber-900 p-0.5 transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-background shadow-md transition-transform duration-200 ${activeTab === "demandes" ? "translate-x-7" : "translate-x-0.5"}`}
                />
              </button>

              <span
                className={`text-sm font-medium transition-colors cursor-pointer ${activeTab === "demandes" ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"}`}
                onClick={() => setActiveTab("demandes")}
              >
                Demandes de paiement
              </span>
            </div>

            <CardContent className="p-0">
              {activeTab === "revenus" && (
                <OrderCardList
                  columns={[
                    { key: "cmd", header: "Commande", desktop: "1.2fr", render: (r: any) => <span className="ml-2">{r.commande_numero}</span> },
                    { key: "brut", header: "Brut", desktop: "1fr", render: (r: any) => `${parseFloat(r.montant_brut).toLocaleString("fr-FR")} Ar` },
                    { key: "comm", header: "Commission", desktop: "1fr", render: (r: any) => `-${parseFloat(r.commission).toLocaleString("fr-FR")} Ar` },
                    { key: "net", header: "Net", desktop: "1fr", render: (r: any) => `${parseFloat(r.montant_net).toLocaleString("fr-FR")} Ar` },
                    { key: "date", header: "Date", desktop: "1fr", render: (r: any) => new Date(r.date_creation).toLocaleDateString("fr-FR") },
                  ]}
                  data={reversements}
                  rowKey="id"
                  maxHeight="500px"
                />
              )}
              {activeTab === "demandes" && (
                <OrderCardList
                  columns={[
                    { key: "date", header: "Date", desktop: "1fr", render: (d: any) => <span className="ml-2">{new Date(d.date_demande).toLocaleDateString("fr-FR")}</span> },
                    { key: "montant", header: "Montant", desktop: "1fr", render: (d: any) => `${parseFloat(d.montant).toLocaleString("fr-FR")} Ar` },
                    { key: "ref", header: "Référence", desktop: "1.2fr", render: (d: any) => d.reference_paiement ? d.reference_paiement : <span className="text-muted-foreground">-----</span> },
                    { key: "statut", header: "Statut", desktop: "1fr", render: (d: any) => (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${
                          d.statut === "paid" ? "bg-emerald-500" :
                          d.statut === "rejected" ? "bg-red-500" :
                          "bg-gray-400"
                        }`} />
                        {d.statut === "paid" ? "Payé" :
                         d.statut === "rejected" ? "Refusé" :
                         "En attente"}
                      </span>
                    )},
                  ]}
                  data={demandes}
                  rowKey="id"
                  maxHeight="500px"
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border shadow-md shadow-black/10">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p>Aucun revenu pour le moment. Ils apparaîtront quand vos commandes seront confirmées.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
