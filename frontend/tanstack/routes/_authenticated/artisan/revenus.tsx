import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useRoles } from "../../../hooks/use-auth.ts";
import { useQuery } from "@tanstack/react-query";
import { getArtisanOrderStats, getArtisanBalance, getArtisanReversements, getArtisanDemandesPaiement } from "../../../lib/api/db.server.ts";
import { Loader2, ShieldAlert, TrendingUp, Wallet, CreditCard, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/artisan/revenus")({
  head: () => ({ meta: [{ title: "Revenus — TISSAGE" }] }),
  component: ArtisanRevenus,
});

function ArtisanRevenus() {
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles(user);
  const isArtisan = roles?.includes("artisan");

  const { data: stats } = useQuery({
    enabled: !!user && isArtisan,
    queryKey: ["artisan-revenus-stats", user?.id],
    queryFn: async () => getArtisanOrderStats({ data: { artisanId: user!.id } }),
  });

  const { data: balance } = useQuery({
    enabled: !!user && isArtisan,
    queryKey: ["artisan-revenus-balance", user?.id],
    queryFn: async () => getArtisanBalance({ data: { artisanId: user!.id } }),
  });

  const { data: reversements } = useQuery({
    enabled: !!user && isArtisan,
    queryKey: ["artisan-revenus-reversements", user?.id],
    queryFn: async () => getArtisanReversements({ data: { artisanId: user!.id } }),
  });

  const { data: demandes } = useQuery({
    enabled: !!user && isArtisan,
    queryKey: ["artisan-revenus-demandes", user?.id],
    queryFn: async () => getArtisanDemandesPaiement({ data: { artisanId: user!.id } }),
  });

  if (rolesLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!isArtisan) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-rouge" />
        <p className="mt-4 font-semibold">Accès réservé aux artisans.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold">Mes revenus</h1>
      <p className="mt-1 text-muted-foreground">Suivez vos gains, commissions et reversements.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-vert/10 text-vert"><TrendingUp className="h-5 w-5" /></div>
          <div className="mt-4 font-display text-2xl font-bold">{stats?.totalRevenue.toFixed(2) ?? "0.00"} €</div>
          <div className="text-xs text-muted-foreground">Chiffre d'affaires total</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Wallet className="h-5 w-5" /></div>
          <div className="mt-4 font-display text-2xl font-bold">{balance?.balance?.toFixed(2) ?? "0.00"} €</div>
          <div className="text-xs text-muted-foreground">Solde disponible</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-or/10 text-or"><CreditCard className="h-5 w-5" /></div>
          <div className="mt-4 font-display text-2xl font-bold">{stats?.pendingPayouts.toFixed(2) ?? "0.00"} €</div>
          <div className="text-xs text-muted-foreground">En attente de paiement</div>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Reversements reçus</h2>
        {(!reversements || reversements.length === 0) ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucun reversement pour le moment.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 text-left">Date</th>
                  <th className="text-left">Commande</th>
                  <th className="text-left">Brut</th>
                  <th className="text-left">Commission</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {(reversements as any[]).map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-2 text-xs">{new Date(r.date_creation ?? r.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="text-xs font-mono">{r.order_number ?? r.order_id?.slice(0, 8)}</td>
                    <td>{Number(r.montant_brut).toFixed(2)} €</td>
                    <td className="text-muted-foreground">-{Number(r.commission).toFixed(2)} €</td>
                    <td className="py-2 text-right font-semibold text-vert">{Number(r.montant_net).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Demandes de paiement</h2>
        {(!demandes || demandes.length === 0) ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucune demande de paiement.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 text-left">Date</th>
                  <th className="text-left">Montant</th>
                  <th className="text-left">Mode</th>
                  <th className="text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {(demandes as any[]).map((d: any) => (
                  <tr key={d.id} className="border-b border-border/50">
                    <td className="py-2 text-xs">{new Date(d.date_demande).toLocaleDateString("fr-FR")}</td>
                    <td className="font-semibold">{Number(d.montant).toFixed(2)} €</td>
                    <td className="text-xs">{d.mode_paiement_artisan ?? "—"}</td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.statut === "paid" ? "bg-vert/10 text-vert" : d.statut === "rejected" ? "bg-rouge/10 text-rouge" : "bg-muted text-muted-foreground"
                      }`}>
                        {d.statut === "paid" ? "Payé" : d.statut === "rejected" ? "Rejeté" : "En attente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
