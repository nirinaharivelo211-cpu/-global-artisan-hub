import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth, useRoles } from "../../../hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getUserOrders, getArtisanOrderStats, getUserUnreadCount, getDashboardAlerts } from "../../../lib/api/db.server";
import { checkDbMode } from "../../../lib/api/auth.server";
import { supabase } from "../../../integrations/supabase/client";
import { Package, Wallet, TrendingUp, Star, Loader2, AlertTriangle, Bell, DollarSign, ShoppingCart, Activity, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Overview,
});

function Overview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: roles } = useRoles(user);
  const isArtisan = roles?.includes("artisan");

  const { data: orders, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["dashboard-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const mode = (await checkDbMode()).dbMode;
      if (mode === "local") return (await getUserOrders({ data: { userId: user.id } })) as any[];
      const { data, error } = await supabase.from("orders").select("id, order_number, total, status, created_at, payment_method").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: artisanStats } = useQuery({
    enabled: !!user && isArtisan,
    queryKey: ["artisan-stats-overview", user?.id],
    queryFn: async () => getArtisanOrderStats({ data: { artisanId: user!.id } }),
  });

  const { data: unreadNotifs } = useQuery({
    enabled: !!user,
    queryKey: ["unread-count-dash", user?.id],
    queryFn: async () => getUserUnreadCount({ data: { userId: user!.id } }),
  });

  const { data: alerts } = useQuery({
    enabled: !!user && isArtisan,
    queryKey: ["dashboard-alerts"],
    queryFn: async () => getDashboardAlerts({}),
  });

  const totalRevenue = orders?.reduce((s: number, o: any) => s + Number(o.total), 0) ?? 0;
  const count = orders?.length ?? 0;
  const avg = count > 0 ? totalRevenue / count : 0;

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const hasAlerts = alerts && (isArtisan ? alerts.pendingOrders > 0 || alerts.pendingPayments > 0 : false);

  return (
    <>
      {hasAlerts && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Alertes</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {alerts.pendingOrders > 0 && (
              <Link to="/dashboard/orders" className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm hover:bg-amber-100">
                <ShoppingCart className="h-3.5 w-3.5" /> {alerts.pendingOrders} commandes en attente
              </Link>
            )}
            {alerts.pendingPayments > 0 && (
              <Link to="/dashboard/payouts" className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm hover:bg-amber-100">
                <DollarSign className="h-3.5 w-3.5" /> {alerts.pendingPayments} paiements en attente
              </Link>
            )}
            {unreadNotifs && unreadNotifs > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm">
                <Bell className="h-3.5 w-3.5" /> {unreadNotifs} notifications non lues
              </span>
            )}
          </div>
        </div>
      )}

      {!hasAlerts && unreadNotifs && unreadNotifs > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2 text-orange-700">
            <Bell className="h-5 w-5" />
            <span className="font-semibold">{unreadNotifs} notification{unreadNotifs > 1 ? "s" : ""} non lue{unreadNotifs > 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Package} label="Commandes" value={String(count)} />
        <Stat icon={Wallet} label={isArtisan ? "Chiffre d'affaires" : "Total dépensé"} value={`${totalRevenue.toFixed(2)} €`} />
        <Stat icon={TrendingUp} label="Panier moyen" value={`${avg.toFixed(2)} €`} />
        <Stat icon={isArtisan ? Activity : Star} label={isArtisan ? "Produits en ligne" : "Statut"} value={isArtisan ? String(artisanStats?.productsCount ?? 0) : "Client"} />
      </div>

      {isArtisan && artisanStats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs text-muted-foreground"><Activity className="mr-1 inline h-3 w-3" />Commandes traitées</div>
            <div className="mt-1 font-display text-2xl font-bold">{(artisanStats as any).ordersCount ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs text-muted-foreground"><DollarSign className="mr-1 inline h-3 w-3" />En attente de paiement</div>
            <div className="mt-1 font-display text-2xl font-bold text-or">{(artisanStats as any).pendingPayouts?.toFixed(2) ?? "0.00"} €</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs text-muted-foreground"><Star className="mr-1 inline h-3 w-3" />Note moyenne</div>
            <div className="mt-1 font-display text-2xl font-bold">{(artisanStats as any).avgRating?.toFixed(1) ?? "—"}</div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Dernières commandes</h2>
          {count > 5 && <Link to="/dashboard/orders" className="text-xs text-primary underline">Voir tout ({count})</Link>}
        </div>
        {!orders || orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucune commande pour le moment.</p>
        ) : (
          <OrdersTable orders={orders.slice(0, 5)} />
        )}
      </section>
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-or/10 text-terre"><Icon className="h-5 w-5" /></div>
      <div className="mt-4 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function OrdersTable({ orders }: { orders: any[] }) {
  const navigate = useNavigate();
  if (orders.length === 0) return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Pas encore de commandes.</div>;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 text-left">N°</th>
            <th className="text-left">Date</th>
            <th className="text-left">Paiement</th>
            <th className="text-left">Statut</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o: any) => (
            <tr key={o.id} className="border-b border-border/50 cursor-pointer hover:bg-muted/30" onClick={() => navigate({ to: "/order/$id", params: { id: o.id } })}>
              <td className="py-2 font-mono text-xs">{o.order_number ?? o.id.slice(0, 8)}</td>
              <td>{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
              <td className="text-xs">{o.payment_method ?? "—"}</td>
              <td><span className="rounded bg-muted px-2 py-0.5 text-xs">{o.status}</span></td>
              <td className="py-2 text-right font-semibold">{Number(o.total).toFixed(2)} €</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
