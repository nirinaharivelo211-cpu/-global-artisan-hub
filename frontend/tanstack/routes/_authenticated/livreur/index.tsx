import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "../../../hooks/use-auth.ts";
import { useQuery } from "@tanstack/react-query";
import { getLivraisons, getLivreurDashboardStats } from "../../../lib/api/db.server.ts";
import { Loader2, Package, Truck, MapPin, CheckCircle2, DollarSign, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/livreur/")({
  component: LivreurDashboard,
});

function LivreurDashboard() {
  const { user } = useAuth();
  const userId = user!.id;
  const { data: stats, isLoading } = useQuery({ queryKey: ["livreur-stats", userId], queryFn: async () => getLivreurDashboardStats({ data: { livreurId: userId } }) });
  const { data: livraisons } = useQuery({ queryKey: ["livreur-livraisons", userId], queryFn: async () => getLivraisons({ data: { livreurId: userId } }) });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { i: Package, l: "Assignées aujourd'hui", v: stats?.assignedToday ?? 0, c: "bg-or/10 text-or" },
          { i: Truck, l: "En livraison", v: stats?.inDelivery ?? 0, c: "bg-terre/10 text-terre" },
          { i: MapPin, l: "À récupérer", v: stats?.toCollect ?? 0, c: "bg-info/10 text-info" },
          { i: CheckCircle2, l: "Livrées aujourd'hui", v: stats?.completedToday ?? 0, c: "bg-vert/10 text-vert" },
          { i: DollarSign, l: "Encaissé ce mois", v: `${(stats?.collectedThisMonth ?? 0).toFixed(2)} €`, c: "bg-vert/10 text-vert" },
          { i: TrendingUp, l: "Taux de succès", v: `${stats?.successRate ?? 0}%`, c: "bg-primary/10 text-primary" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-border bg-card p-5">
            <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.c}`}><s.i className="h-5 w-5" /></div>
            <div className="mt-4 font-display text-2xl font-bold">{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Livraisons récentes</h2>
        {(!livraisons || livraisons.length === 0) ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucune livraison assignée.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 text-left">N° commande</th>
                  <th className="text-left">Statut</th>
                  <th className="text-left">Date prévue</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {(livraisons as any[]).map((l: any) => (
                  <tr key={l.id} className="border-b border-border/50">
                    <td className="py-2 font-mono text-xs">{l.order_number ?? l.order_id?.slice(0, 8)}</td>
                    <td><span className="rounded bg-muted px-2 py-0.5 text-xs">{l.statut_paiement ?? l.order_status}</span></td>
                    <td className="text-xs">{new Date(l.date_prevue).toLocaleDateString("fr-FR")}</td>
                    <td className="py-2 text-right font-semibold">{Number(l.montant_du).toFixed(2)} €</td>
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
