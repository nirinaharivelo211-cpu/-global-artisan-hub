// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { facturesApi } from "@/lib/api-client"
import { useAuth } from "@/context/auth-context"
import { ChevronLeft, Download, Printer, Package } from "lucide-react"

function parseQR(rawQR) {
  if (!rawQR) return null
  try {
    const parsed = typeof rawQR === "string" ? JSON.parse(rawQR) : rawQR
    if (parsed.data) return `data:image/png;base64,${parsed.data}`
  } catch {}
  return null
}

function formatDate(d) {
  if (!d) return "--"
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
}

function formatDateTime(d) {
  if (!d) return "--"
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function ClientFacturePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const [facture, setFacture] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const validationId = params?.validationId as string

  useEffect(() => {
    if (!validationId || !user) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await facturesApi.fetchByValidation(Number(validationId))
        if (res.success && res.data && res.data.length > 0) {
          setFacture(res.data[0])
        } else {
          setError("Facture introuvable")
        }
      } catch {
        setError("Erreur lors du chargement de la facture")
      } finally {
        setLoading(false)
      }
    })()
  }, [validationId, user])

  const qrSrc = parseQR(facture?.qr_code)
  const produits = facture?.produits || []

  const formatPrice = (p) =>
    p === null || p === undefined ? "Ar 0,00" : `Ar ${Number(p).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`

  const handlePrint = () => {
    const origTitle = document.title
    document.title = ""
    window.onafterprint = () => { document.title = origTitle; window.onafterprint = null }
    window.print()
  }

  const handleDownloadQR = () => {
    if (!qrSrc) return
    const link = document.createElement("a")
    link.href = qrSrc
    link.download = `facture-${facture?.numero_facture || "facture"}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <DashboardLayout role="client">
        <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
          <div className="mx-auto max-w-4xl animate-pulse space-y-6">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="h-64 rounded-lg bg-gray-200" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !facture) {
    return (
      <DashboardLayout role="client">
        <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
          <div className="mx-auto max-w-4xl text-center py-20">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-700 font-medium mb-2">Facture introuvable</p>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <Button variant="outline" onClick={() => router.back()}>Retour</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  function InvoiceContent() {
    return (
      <div className="rounded-lg border bg-white p-8 shadow-sm print:border-0 print:shadow-none print:p-4">
            {/* Header row: left (invoice info) | right (QR) */}
            <div className="flex items-start justify-between">
              <div className="space-y-2 print:space-y-1">
                <h1 className="text-lg font-bold text-gray-900 print:text-base">
                  FAC-{facture.numero_facture?.split("-")[1]}-{facture.validation_id} <span className="font-normal text-sm text-gray-500 ml-2">| {facture.date_emission ? formatDate(facture.date_emission) : "--"}</span>
                </h1>
                <p className="text-sm font-semibold text-gray-700">
                  {facture.numero_commande}
                </p>
                <p className="text-xs text-gray-400">
                  {facture.validation_date_creation ? formatDateTime(facture.validation_date_creation) : "--"}
                </p>
                <p className="text-xs text-gray-500">
                  {facture.mode_paiement === "mobile_money"
                    ? `Paiement via Mobile Money${facture.mobile_money_provider ? ` (${facture.mobile_money_provider})` : ""}`
                    : facture.mode_paiement === "cod"
                      ? "Paiement à la livraison"
                      : facture.mobile_money_provider
                        ? `Paiement via ${facture.mobile_money_provider}`
                        : ""}
                </p>
              </div>
              {qrSrc && (
                <div className="shrink-0 print:-mt-4">
                  <div className="flex items-center justify-center rounded-lg bg-gray-50 p-2">
                    <Image src={qrSrc} alt="QR facture" width={100} height={100} className="h-[100px] w-[100px] print:h-32 print:w-32" />
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mt-6 print:mt-3 border-t border-gray-200" />

            {/* Middle section: left (client) | right (expedition/livraison) */}
            <div className="mt-6 print:mt-3 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Client info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Client</h3>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-medium text-gray-900">{facture.client_name || "N/A"}</p>
                    <p className="text-gray-600">{facture.client_email || "N/A"}</p>
                    {facture.client_telephone && (
                      <p className="text-gray-600">{facture.client_telephone}</p>
                    )}
                    {facture.adresse_livraison && (
                      <p className="text-gray-500">{facture.adresse_livraison}</p>
                    )}
                  </div>
              </div>

              {/* Right: expedition info or delivery info */}
              <div className="space-y-3 sm:text-right">
                {facture.cooperative_nom ? (
                  <>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expédition</h3>
                    <div className="space-y-1.5 text-sm">
                      {facture.livreur_name && (
                        <p className="text-gray-600">
                          {facture.livreur_name}{facture.livreur_phone ? ` — ${facture.livreur_phone}` : ""}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <p className="font-medium text-gray-700">{facture.cooperative_nom}</p>
                        {facture.cooperative_numero_suivi && (
                          <p className="text-gray-600">— N° suivi : {facture.cooperative_numero_suivi}</p>
                        )}
                      </div>
                      {facture.shipped_at && (
                        <p className="text-gray-600">Expédition le {formatDateTime(facture.shipped_at)}</p>
                      )}
                      {facture.hub_source_nom && (
                        <p className="text-gray-600">
                          {facture.hub_source_nom}{facture.hub_source_telephone ? ` — ${facture.hub_source_telephone}` : ""}
                        </p>
                      )}
                    </div>
                  </>
                ) : facture.livreur_name || facture.date_prevue || facture.hub_destination_nom ? (
                  <>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Livraison</h3>
                    <div className="space-y-1.5 text-sm">
                      {facture.livreur_name && (
                        <p className="font-medium text-gray-700">{facture.livreur_name}</p>
                      )}
                      {facture.date_prevue && (
                        <p className="text-gray-600">Prévue le {formatDate(facture.date_prevue)}</p>
                      )}
                      {facture.hub_destination_nom && (
                        <p className="text-gray-600">Hub : {facture.hub_destination_nom}</p>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Divider */}
            <div className="mt-6 print:mt-3 border-t border-gray-200" />

            {/* Products table */}
            <div className="mt-6 print:mt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Produits commandés</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2.5 text-left font-medium min-w-[120px]">Produit</th>
                    <th className="py-2.5 text-left font-medium min-w-[90px]">Artisan</th>
                    <th className="py-2.5 text-center font-medium w-14">Qté</th>
                    <th className="py-2.5 text-right font-medium w-36">Prix unitaire</th>
                    <th className="py-2.5 text-right font-medium w-36">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {produits.map((p, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-3 pr-3 text-gray-900 print:py-1.5">
                        <p className="font-medium">{p.nom}</p>
                        {p.variation_label && (
                          <p className="text-xs text-gray-500 mt-0.5">{p.variation_label}</p>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-gray-600 text-sm">{p.artisan}</td>
                      <td className="py-3 text-center text-gray-700">{p.quantite}</td>
                      <td className="py-3 text-right text-gray-700">{formatPrice(p.prix_unitaire)}</td>
                      <td className="py-3 text-right font-semibold text-gray-900">{formatPrice(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 print:mt-3 border-t border-gray-200 pt-4 print:pt-2">
              <div className="ml-auto space-y-1.5 text-sm sm:w-72">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice((facture.montant_total || 0) - (facture.frais_livraison || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{facture.cooperative_nom ? "Frais d'expédition" : "Frais de livraison"}</span>
                  <span className="font-medium text-gray-900">{formatPrice(facture.frais_livraison)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5">
                  <span className="font-semibold text-gray-900">Montant total</span>
                  <span className="font-bold text-gray-900">{formatPrice(facture.montant_total)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 print:mt-4 border-t border-gray-200 pt-4 print:pt-2 flex items-center justify-between text-sm">
              <p className="text-gray-500">Merci pour votre confiance</p>
              <p className="font-semibold text-gray-700">E-artisan Madagascar</p>
            </div>
          </div>
    )
  }

  return (
    <>
    {/* Print CSS: hide layout chrome + browser header/footer */}
    <style>{`
      @media print {
        @page { margin: 0; }
        html, body { height: auto !important; overflow: visible !important; }
        body > *:not(.print-invoice-wrapper) { display: none !important; }
      }
    `}</style>

    {/* Print-only: invoice without layout */}
    <div className="hidden print:block print-invoice-wrapper">
      <div className="max-w-4xl mx-auto p-4">
        <InvoiceContent />
      </div>
    </div>

    {/* Screen: invoice with layout (hidden in print) */}
    <div className="print:hidden">
      <DashboardLayout role="client">
        <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Breadcrumb + actions */}
          <div className="flex items-center justify-between">
            <Link
              href={`/dashboard/client/orders/${validationId}`}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour a la commande
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
              {qrSrc && (
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadQR}>
                  <Download className="h-4 w-4" />
                  QR
                </Button>
              )}
            </div>
          </div>

          <InvoiceContent />
        </div>
        </div>
      </DashboardLayout>
    </div>
    </>
  )
}
