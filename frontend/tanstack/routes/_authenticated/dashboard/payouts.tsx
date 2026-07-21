import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getArtisanOrderStats, getArtisanBalance, getArtisanDemandesPaiement, getArtisanReversements, getHubs, createArtisanDemandePaiement } from "@/lib/api/db.server";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/payouts")({
  head: () => ({ meta: [{ title: "Paiements — TISSAGE" }] }),
  component: PayoutsPanel,
});

function PayoutsPanel() {
  const { user } = useAuth();
  const { data: stats } = useQuery({ enabled: !!user, queryKey: ["artisan-stats-payouts", user?.id], queryFn: async () => getArtisanOrderStats({ data: { artisanId: user!.id } }) });
  const { data: balance } = useQuery({ enabled: !!user, queryKey: ["artisan-balance", user?.id], queryFn: async () => getArtisanBalance({ data: { artisanId: user!.id } }) });
  const { data: demandes, refetch: refetchDemandes } = useQuery({ enabled: !!user, queryKey: ["artisan-demandes", user?.id], queryFn: async () => getArtisanDemandesPaiement({ data: { artisanId: user!.id } }) });
  const { data: reversements } = useQuery({ enabled: !!user, queryKey: ["artisan-reversements", user?.id], queryFn: async () => getArtisanReversements({ data: { artisanId: user!.id } }) });
  const { data: hubs } = useQuery({ queryKey: ["hubs-payouts"], queryFn: async () => getHubs({}) });
  const [montant, setMontant] = useState(0);
  const [hubId, setHubId] = useState("");
  const [modePaie, setModePaie] = useState("mvola");
  const [referenceMm, setReferenceMm] = useState("");
  const [titulaireMm, setTitulaireMm] = useState("");
  const [requesting, setRequesting] = useState(false);

  async function handleDemande(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setRequesting(true);
    try {
      const res = await createArtisanDemandePaiement({ data: { artisanId: user.id, montant, hubId: hubId || undefined, modePaiement: modePaie, referenceMm: referenceMm || undefined, titulaireMm: titulaireMm || undefined } });
      if ((res as any).error) { toast.error((res as any).error); return; }
      toast.success("Demande de paiement envoyée !");
      refetchDemandes();
    } catch { toast.error("Erreur lors de la demande"); }
    finally { setRequesting(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Paiements & reversements</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Chiffre d'affaires</div>
          <div className="mt-1 font-display text-2xl font-bold text-terre">{stats?.totalRevenue.toFixed(2) ?? "0.00"} €</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Solde disponible</div>
          <div className="mt-1 font-display text-2xl font-bold text-vert">{(balance as any)?.balance.toFixed(2) ?? "0.00"} €</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">En attente</div>
          <div className="mt-1 font-display text-2xl font-bold text-or">{stats?.pendingPayouts.toFixed(2) ?? "0.00"} €</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Demander un paiement</h3>
          <form onSubmit={handleDemande} className="mt-4 space-y-3">
            <label className="block"><span className="text-xs font-medium text-muted-foreground">Montant (max: {(balance as any)?.balance.toFixed(2) ?? "0"} €)</span>
              <input type="number" step="0.01" max={(balance as any)?.balance ?? 0} value={montant} onChange={(e) => setMontant(Number(e.target.value))} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="block"><span className="text-xs font-medium text-muted-foreground">Hub</span>
              <select value={hubId} onChange={(e) => setHubId(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">Sélectionner un hub</option>
                {(hubs ?? []).map((h: any) => <option key={h.id} value={h.id}>{h.nom}</option>)}
              </select>
            </label>
            <label className="block"><span className="text-xs font-medium text-muted-foreground">Mode de paiement</span>
              <select value={modePaie} onChange={(e) => setModePaie(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="mvola">MVola</option>
                <option value="orange_money">Orange Money</option>
                <option value="airtel_money">Airtel Money</option>
              </select>
            </label>
            <label className="block"><span className="text-xs font-medium text-muted-foreground">Référence Mobile Money</span>
              <input value={referenceMm} onChange={(e) => setReferenceMm(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="034 12 345 67" />
            </label>
            <label className="block"><span className="text-xs font-medium text-muted-foreground">Titulaire</span>
              <input value={titulaireMm} onChange={(e) => setTitulaireMm(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Nom du titulaire" />
            </label>
            <button type="submit" disabled={requesting || montant <= 0} className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {requesting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Demander le paiement"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Dernières demandes</h3>
          {(!demandes || (demandes as any[]).length === 0) ? (
            <p className="mt-4 text-sm text-muted-foreground">Aucune demande de paiement.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {(demandes as any[]).slice(0, 10).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <div className="font-semibold">{Number(d.montant).toFixed(2)} €</div>
                    <div className="text-xs text-muted-foreground">{new Date(d.date_demande).toLocaleDateString("fr-FR")}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.statut === "paid" ? "bg-vert/10 text-vert" : d.statut === "rejected" ? "bg-rouge/10 text-rouge" : "bg-muted text-muted-foreground"}`}>
                    {d.statut === "paid" ? "Payé" : d.statut === "rejected" ? "Rejeté" : "En attente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {(reversements as any[] ?? []).length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Reversements reçus</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr className="border-b border-border">
                <th className="py-2 text-left">Date</th><th className="text-left">Brut</th><th className="text-left">Commission</th><th className="text-left">Net</th>
              </tr></thead>
              <tbody>{(reversements as any[]).map((r: any) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-2 text-xs">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                  <td>{Number(r.montant_brut).toFixed(2)} €</td>
                  <td className="text-muted-foreground">-{Number(r.commission).toFixed(2)} €</td>
                  <td className="font-semibold text-vert">{Number(r.montant_net).toFixed(2)} €</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
