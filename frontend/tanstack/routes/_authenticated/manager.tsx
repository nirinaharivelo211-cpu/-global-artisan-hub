import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth, useRoles } from "../../hooks/use-auth.ts";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats, getHubs } from "../../lib/api/db.server.ts";
import { ShieldAlert, Loader2, Users, MapPin, Package, ShoppingCart, TrendingUp, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/manager")({
  head: () => ({ meta: [{ title: "Manager — TISSAGE" }] }),
  component: ManagerDashboard,
});

function ManagerDashboard() {
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles(user);
  const isManager = roles?.includes("manager") || roles?.includes("admin");

  const { data: stats, isLoading } = useQuery({
    enabled: isManager,
    queryKey: ["manager-stats"],
    queryFn: async () => getAdminStats({}),
  });

  const { data: hubs } = useQuery({
    enabled: isManager,
    queryKey: ["manager-hubs"],
    queryFn: async () => getHubs({}),
  });

  if (rolesLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!isManager) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mt-8 rounded-2xl border border-rouge/30 bg-rouge/5 p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-rouge" />
          <p className="mt-4 font-semibold">Accès réservé aux managers.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="font-display text-3xl font-bold">Tableau de bord Manager</h1>
        <p className="mt-1 text-muted-foreground">Vue d'ensemble des opérations TISSAGE.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BarChart3, label: "Revenu total", value: `${stats?.revenue.toFixed(2) ?? "0"} €`, color: "bg-vert/10 text-vert" },
            { icon: ShoppingCart, label: "Commandes", value: stats?.orders ?? 0, color: "bg-primary/10 text-primary" },
            { icon: Package, label: "Produits", value: stats?.products ?? 0, color: "bg-or/10 text-or" },
            { icon: Users, label: "Artisans", value: stats?.artisans ?? 0, color: "bg-terre/10 text-terre" },
            { icon: MapPin, label: "Hubs actifs", value: hubs?.length ?? 0, color: "bg-info/10 text-info" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div className="mt-4 font-display text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {stats?.ordersByStatus && (
          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold">Commandes par statut</h2>
            <div className="mt-4 space-y-2">
              {stats.ordersByStatus.map((s: any) => (
                <div key={s.status} className="flex items-center gap-3">
                  <span className="w-32 text-xs font-medium capitalize">{s.status}</span>
                  <div className="h-3 flex-1 rounded-full bg-muted">
                    <div className="h-3 rounded-full bg-primary" style={{ width: `${Math.min(100, (s.count / Math.max(1, stats.orders)) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold">{s.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 flex gap-4">
          <Link to="/admin" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Console Admin</Link>
          <Link to="/admin/hubs" className="rounded-md border border-border px-4 py-2 text-sm">Gérer les hubs</Link>
        </div>
      </div>
  );
}
