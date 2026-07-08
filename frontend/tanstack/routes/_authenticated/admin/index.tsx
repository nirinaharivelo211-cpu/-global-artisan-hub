import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats, getDashboardAlerts, getRecentActivity, getLowStockProducts } from "@/lib/api/db.server";
import {
  Users, Package, ShoppingCart, TrendingUp, MapPin, Loader2,
  AlertTriangle, Bell, DollarSign, Clock, LogIn, UserPlus, Activity,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => getAdminStats({}),
  });
  const { data: alerts } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => getDashboardAlerts({}),
  });
  const { data: activity } = useQuery({
    queryKey: ["admin-activity-dash"],
    queryFn: async () => getRecentActivity({}),
  });
  const { data: lowStock } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: async () => getLowStockProducts({}),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!stats) return null;

  const cards = [
    { icon: Users, label: "Utilisateurs", value: stats.users, color: "bg-terre/10 text-terre", link: "/admin/users" },
    { icon: Package, label: "Produits", value: stats.products, color: "bg-or/10 text-or", link: "/admin/products" },
    { icon: ShoppingCart, label: "Commandes", value: stats.orders, color: "bg-vert/10 text-vert", link: "/admin/orders" },
    { icon: TrendingUp, label: "Revenu total", value: `${stats.revenue.toFixed(2)} €`, color: "bg-primary/10 text-primary", link: "/admin/analytics" },
    { icon: Users, label: "Artisans", value: stats.artisans, color: "bg-rouge/10 text-rouge", link: "/admin/users" },
    { icon: MapPin, label: "Hubs", value: stats.hubs, color: "bg-info/10 text-info", link: "/admin/hubs" },
  ];

  return (
    <div className="space-y-6">
      {alerts && (alerts.pendingOrders > 0 || alerts.pendingPayments > 0 || alerts.lowStockItems > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Alertes</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {alerts.pendingOrders > 0 && (
              <Link to="/admin/orders" className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm hover:bg-amber-100">
                <ShoppingCart className="h-3.5 w-3.5" /> {alerts.pendingOrders} commandes en attente
              </Link>
            )}
            {alerts.pendingPayments > 0 && (
              <Link to="/admin/paiements" className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm hover:bg-amber-100">
                <DollarSign className="h-3.5 w-3.5" /> {alerts.pendingPayments} paiements en attente
              </Link>
            )}
            {alerts.lowStockItems > 0 && (
              <Link to="/admin/products" className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm hover:bg-amber-100">
                <Package className="h-3.5 w-3.5" /> {alerts.lowStockItems} produits en stock faible
              </Link>
            )}
            {alerts.unreadNotifications > 0 && (
              <Link to="/admin/notifications" className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm hover:bg-amber-100">
                <Bell className="h-3.5 w-3.5" /> {alerts.unreadNotifications} notifications non lues
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {cards.map((s, i) => (
          <Link key={i} to={s.link} className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition">
            <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div className="mt-4 font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Commandes par statut</h2>
          <div className="mt-4 space-y-2">
            {stats.ordersByStatus.map((s: any) => (
              <div key={s.status} className="flex items-center gap-3">
                <span className="w-32 text-xs font-medium capitalize">{s.status.replace(/_/g, " ")}</span>
                <div className="h-3 flex-1 rounded-full bg-muted">
                  <div className="h-3 rounded-full bg-primary" style={{ width: `${Math.min(100, (s.count / Math.max(1, stats.orders)) * 100)}%` }} />
                </div>
                <span className="w-8 text-right text-xs font-semibold">{s.count}</span>
              </div>
            ))}
            {stats.ordersByStatus.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune commande.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Stock faible</h2>
          <div className="mt-4 space-y-2">
            {(lowStock ?? []).length > 0 ? (
              (lowStock ?? []).slice(0, 8).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{item.product_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {[item.couleur, item.taille].filter(Boolean).join(" / ") || "—"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-bold text-rouge">{item.stock}</span>
                    <span className="text-[10px] text-muted-foreground"> / {item.seuil_alerte}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-sm text-vert">
                <Package className="h-4 w-4" /> Tous les stocks sont suffisants
              </div>
            )}
            {(lowStock ?? []).length > 8 && (
              <Link to="/admin/products" className="block text-center text-xs text-primary underline">Voir tout ({lowStock.length})</Link>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Activité récente</h2>
        </div>
        <div className="mt-4 space-y-2">
          {(activity ?? []).length > 0 ? (
            (activity ?? []).slice(0, 10).map((a: any) => {
              const Icon = a.type === "session" ? LogIn : a.type === "order" ? ShoppingCart : UserPlus;
              const color = a.type === "session" ? "text-info bg-info/10" : a.type === "order" ? "text-primary bg-primary/10" : "text-vert bg-vert/10";
              return (
                <div key={`${a.type}-${a.id}`} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${color}`}><Icon className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.description}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.user_name ?? a.user_email ?? "—"}</p>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune activité récente.</p>
          )}
          <Link to="/admin/logs" className="block text-center text-xs text-primary underline mt-2">Voir toute l'activité</Link>
        </div>
      </section>
    </div>
  );
}
