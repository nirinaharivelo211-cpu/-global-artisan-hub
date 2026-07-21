import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllDemandesPaiement, updateDemandePaiementStatus } from "../../../lib/api/db.server.ts";
import { Loader2, CreditCard, Check, X, Search, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportCsv } from "../../../lib/csv-export.ts";

export const Route = createFileRoute("/_authenticated/admin/paiements")({
  head: () => ({ meta: [{ title: "Paiements — Admin TISSAGE" }] }),
  component: AdminPaiements,
});

function AdminPaiements() {
  const qc = useQueryClient();
  const { data: demandes, isLoading } = useQuery({
    queryKey: ["admin-demandes-paiement"],
    queryFn: async () => getAllDemandesPaiement({}),
  });
  const [filter, setFilter] = useState("");

  const filtered = filter ? (demandes ?? []).filter((d: any) => d.statut === filter) : (demandes ?? []);

  async function handleUpdate(id: string, statut: string) {
    try {
      await updateDemandePaiementStatus({ data: { id, statut } });
      toast.success(`Demande ${statut === "paid" ? "approuvée" : "rejetée"}`);
      qc.invalidateQueries({ queryKey: ["admin-demandes-paiement"] });
    } catch { toast.error("Erreur"); }
  }

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrer par statut..." className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <div className="flex gap-2">
          {["", "pending", "paid", "rejected"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-md px-3 py-2 text-xs font-medium ${filter === s ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-muted"}`}>
              {s ? (s === "paid" ? "Payé" : s === "rejected" ? "Rejeté" : "En attente") : "Tous"}
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <button onClick={() => exportCsv(filtered, [
            { key: "artisan_nom", label: "Artisan" },
            { key: "montant", label: "Montant" },
            { key: "hub_nom", label: "Hub" },
            { key: "mode_paiement_artisan", label: "Mode" },
            { key: "statut", label: "Statut" },
            { key: "date_demande", label: "Date" },
          ], "demandes-paiement")} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Artisan</th>
              <th className="text-left">Montant</th>
              <th className="text-left">Hub</th>
              <th className="text-left">Mode</th>
              <th className="text-left">Date</th>
              <th className="text-left">Statut</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Aucune demande de paiement</td></tr>
            ) : (
              filtered.map((d: any) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="p-3 font-medium">{d.artisan_nom ?? d.artisan_id?.slice(0, 12)}</td>
                  <td className="font-semibold">{Number(d.montant).toFixed(2)} €</td>
                  <td className="text-xs">{d.hub_nom ?? "—"}</td>
                  <td className="text-xs">{d.mode_paiement_artisan ?? "—"}</td>
                  <td className="text-xs">{new Date(d.date_demande).toLocaleDateString("fr-FR")}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      d.statut === "paid" ? "bg-vert/10 text-vert" : d.statut === "rejected" ? "bg-rouge/10 text-rouge" : "bg-muted text-muted-foreground"
                    }`}>
                      {d.statut === "paid" ? "Payé" : d.statut === "rejected" ? "Rejeté" : "En attente"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {d.statut === "pending" ? (
                      <div className="inline-flex gap-1">
                        <button onClick={() => handleUpdate(d.id, "paid")} className="rounded p-2 hover:bg-muted text-vert" title="Approuver"><Check className="h-4 w-4" /></button>
                        <button onClick={() => handleUpdate(d.id, "rejected")} className="rounded p-2 hover:bg-muted text-destructive" title="Rejeter"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
