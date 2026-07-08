import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSalesAnalytics, getTopProducts, getRevenueChart } from "@/lib/api/db.server";
import { Loader2, TrendingUp, ShoppingCart, DollarSign, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytiques — Admin TISSAGE" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: analytics, isLoading: loadingA } = useQuery({
    queryKey: ["admin-sales-analytics"],
    queryFn: async () => getSalesAnalytics({}),
  });
  const { data: topProducts, isLoading: loadingP } = useQuery({
    queryKey: ["admin-top-products"],
    queryFn: async () => getTopProducts({}),
  });
  const { data: revenueChart, isLoading: loadingR } = useQuery({
    queryKey: ["admin-revenue-chart"],
    queryFn: async () => getRevenueChart({}),
  });

  if (loadingA || loadingP || loadingR) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const daily = analytics?.daily ?? [];
  const weekly = analytics?.weekly ?? [];
  const monthly = analytics?.monthly ?? [];

  const totalRevenue30d = daily.reduce((s, d) => s + Number(d.revenue), 0);
  const totalOrders30d = daily.reduce((s, d) => s + Number(d.orders), 0);
  const topProduct = topProducts?.[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></div>
          <div className="mt-4 font-display text-2xl font-bold">{totalRevenue30d.toFixed(2)} €</div>
          <div className="text-xs text-muted-foreground">Revenu (30 jours)</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-vert/10 text-vert"><ShoppingCart className="h-5 w-5" /></div>
          <div className="mt-4 font-display text-2xl font-bold">{totalOrders30d}</div>
          <div className="text-xs text-muted-foreground">Commandes (30 jours)</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-or/10 text-or"><Package className="h-5 w-5" /></div>
          <div className="mt-4 font-display text-2xl font-bold">{topProduct?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">Top produit {topProduct ? `(${topProduct.total_sold} vendus)` : ""}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-terre/10 text-terre"><DollarSign className="h-5 w-5" /></div>
          <div className="mt-4 font-display text-2xl font-bold">{topProduct ? `${Number(topProduct.total_revenue).toFixed(0)} €` : "—"}</div>
          <div className="text-xs text-muted-foreground">Revenu top produit</div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Revenu mensuel</h2>
        <div className="mt-4 space-y-2">
          {(revenueChart ?? []).map((p: any) => {
            const max = Math.max(...(revenueChart ?? []).map((r: any) => Number(r.revenue)), 1);
            return (
              <div key={p.month} className="flex items-center gap-3">
                <span className="w-16 text-xs font-medium">{p.month}</span>
                <div className="h-5 flex-1 rounded bg-muted">
                  <div className="h-5 rounded bg-primary" style={{ width: `${(Number(p.revenue) / max) * 100}%` }} />
                </div>
                <span className="w-24 text-right text-xs font-semibold">{Number(p.revenue).toFixed(0)} €</span>
                <span className="w-12 text-right text-xs text-muted-foreground">{p.orders} cmd</span>
              </div>
            );
          })}
          {(!revenueChart || revenueChart.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucune donnée de revenu disponible.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Top produits vendus</h2>
        {topProducts && topProducts.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr><th className="p-3 text-left">Produit</th><th className="text-right">Quantité vendue</th><th className="text-right">Revenu</th></tr>
              </thead>
              <tbody>
                {topProducts.map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">{p.name}</td>
                    <td className="text-right font-semibold">{p.total_sold}</td>
                    <td className="text-right font-semibold">{Number(p.total_revenue).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Aucune vente enregistrée.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Ventes quotidiennes (30j)</h2>
          <div className="mt-4 space-y-1.5">
            {daily.map((d: any) => {
              const max = Math.max(...daily.map((x: any) => Number(x.orders)), 1);
              return (
                <div key={d.date} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0">{new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  <div className="h-2.5 flex-1 rounded bg-muted">
                    <div className="h-2.5 rounded bg-vert" style={{ width: `${(Number(d.orders) / max) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right">{d.orders} cmd</span>
                  <span className="w-16 text-right text-muted-foreground">{Number(d.revenue).toFixed(0)} €</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Ventes hebdomadaires (12 sem.)</h2>
          <div className="mt-4 space-y-1.5">
            {weekly.map((w: any) => {
              const max = Math.max(...weekly.map((x: any) => Number(x.orders)), 1);
              return (
                <div key={w.week} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0">S{new Date(w.week).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  <div className="h-2.5 flex-1 rounded bg-muted">
                    <div className="h-2.5 rounded bg-or" style={{ width: `${(Number(w.orders) / max) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right">{w.orders} cmd</span>
                  <span className="w-16 text-right text-muted-foreground">{Number(w.revenue).toFixed(0)} €</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
