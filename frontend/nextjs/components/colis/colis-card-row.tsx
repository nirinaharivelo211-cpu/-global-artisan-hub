"use client"

import { useState } from "react"
import { Package, Truck, Building2, Clock, User, QrCode } from "lucide-react"
import type { Colis } from "@/lib/api-client"

export function ColisAvatar({ colis }: { colis: Colis }) {
  const [imgErr, setImgErr] = useState(false)

  if (colis.artisan_photo_url && !imgErr) {
    return (
      <img
        src={colis.artisan_photo_url}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-gray-100"
        onError={() => setImgErr(true)}
      />
    )
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
      <User className="h-5 w-5 text-gray-500" />
    </div>
  )
}

export function ColisCardRow({
  colis,
  highlighted,
  onSelect,
  onScan,
  scanStatuts,
}: {
  colis: Colis
  highlighted: boolean
  onSelect: (colis: Colis) => void
  onScan?: () => void
  scanStatuts?: string[]
}) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

  const dateStr = colis.submitted_at ? fmt(colis.submitted_at) : null
  const collectedStr = colis.collected_at ? fmt(colis.collected_at) : null

  const isScannable = (scanStatuts || ["preparing"]).includes(colis.statut)
  const showScanBtn = onScan && isScannable
  const showQr = !showScanBtn && colis.statut !== "preparing"

  return (
    <div
      onClick={() => onSelect(colis)}
      className={`rounded-lg border px-4 py-3.5 shadow-sm transition-all cursor-pointer ${
        highlighted
          ? "border-emerald-400 bg-emerald-50 shadow-md ring-1 ring-emerald-200"
          : "border-gray-200 bg-white hover:shadow-md hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-3">
        <ColisAvatar colis={colis} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{colis.artisan_nom}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
            <Package className="h-3.5 w-3.5 shrink-0" />
            {colis.items_count} article{colis.items_count > 1 ? "s" : ""}
            {colis.items_weight > 0 && (
              <span className="text-gray-400">· {colis.items_weight} kg</span>
            )}
          </div>
        </div>
        {showQr ? (
          colis.qr_code ? (
            <div className="hidden md:flex flex-col self-center justify-center shrink-0">
              <img src={colis.qr_code} alt="QR Colis" className="h-24 w-24 rounded border border-gray-200" style={{ marginTop: "-9px", marginBottom: "-42px" }} />
            </div>
          ) : (
            <div className="hidden md:flex flex-col self-center justify-center shrink-0 h-24 w-24 items-center justify-center rounded border border-gray-200 bg-gray-50">
              <Package className="h-8 w-8 text-gray-300" />
            </div>
          )
        ) : showScanBtn ? (
          <button
            onClick={(e) => { e.stopPropagation(); onScan(); }}
            className="hidden md:flex items-center gap-1.5 mt-5 bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-sm hover:from-amber-800 hover:to-amber-950 hover:shadow-md text-xs h-9 px-4 rounded-lg transition-all shrink-0 cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5" />
            Scanner
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-700">
        {colis.statut === "preparing" ? (
          <>
            {colis.mode === "envoi" ? <Truck className="h-3.5 w-3.5 shrink-0 text-gray-400" /> : <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
            <span className="font-medium whitespace-nowrap">{colis.mode === "envoi" ? "Envoi via" : "Dépôt au"}</span>
            {colis.cooperative_nom ? (
              <span className="text-gray-600 truncate max-w-[200px]">{colis.cooperative_nom}</span>
            ) : (
              <span className="text-gray-500 whitespace-nowrap">{colis.mode === "envoi" ? "transporteur" : "hub"}</span>
            )}
            {colis.numero_colis && <><span className="inline-flex items-center text-gray-400">·</span><span className="text-gray-500 font-mono truncate max-w-[200px]">{colis.numero_colis}</span></>}
          </>
        ) : colis.statut === "deposited" || (colis.statut === "collected" && colis.mode === "depot") ? (
          <>
            <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="font-medium text-gray-800">Déposé</span>
            {dateStr && <><span className="inline-flex items-center text-gray-300">·</span><span className="text-gray-500">{dateStr}</span></>}
            {colis.statut === "collected" && collectedStr && (
              <><span className="inline-flex items-center text-gray-300">·</span>
                <span className="flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">Collecté</span>
                  <span className="text-emerald-500">{collectedStr}</span>
                </span>
              </>
            )}
          </>
        ) : colis.statut === "dispatched" || (colis.statut === "collected" && colis.mode === "envoi") ? (
          <>
            <Truck className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="font-medium text-gray-800">Expédié</span>
            {dateStr && <><span className="inline-flex items-center text-gray-300">·</span><span className="text-gray-500">{dateStr}</span></>}
            {colis.cooperative_nom && <><span className="inline-flex items-center text-gray-300">·</span><span className="text-gray-600 truncate max-w-[200px]">{colis.cooperative_nom}</span></>}
            {colis.numero_colis && <><span className="inline-flex items-center text-gray-300">·</span><span className="text-gray-500 font-mono truncate max-w-[200px]">{colis.numero_colis}</span></>}
            {colis.statut === "collected" && collectedStr && (
              <><span className="inline-flex items-center text-gray-300">·</span>
                <span className="flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">Collecté</span>
                  <span className="text-emerald-500">{collectedStr}</span>
                </span>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
