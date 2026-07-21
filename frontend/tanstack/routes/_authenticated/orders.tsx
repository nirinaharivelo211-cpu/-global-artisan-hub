import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "../../hooks/use-auth.ts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client.ts";
import { getUserOrders, getOrderItems } from "../../lib/api/db.server.ts";
import { checkDbMode } from "../../lib/api/auth.server.ts";
import { Package, Truck, CheckCircle2, Clock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Mes commandes — TISSAGE" }] }),
  component: Orders,
});

type Order = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  carrier: string | null;
  tracking_number: string | null;
  created_at: string;
  items?: { product_name: string; product_image: string | null; quantity: number; line_total: number }[];
};

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "En attente", color: "bg-muted text-foreground", icon: Clock },
  paid: { label: "Payée", color: "bg-vert/10 text-vert", icon: CheckCircle2 },
  processing: { label: "En préparation", color: "bg-or/10 text-or", icon: Package },
  shipped: { label: "Expédiée", color: "bg-terre/10 text-terre", icon: Truck },
  delivered: { label: "Livrée", color: "bg-vert/10 text-vert", icon: CheckCircle2 },
  cancelled: { label: "Annulée", color: "bg-rouge/10 text-rouge", icon: Clock },
};

function Orders() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const mode = (await checkDbMode()).dbMode;
      if (mode === "local") {
        const orders = await getUserOrders({ data: { userId: user.id } });
        const enriched = await Promise.all(
          (orders as any[]).map(async (o) => {
            const items = await getOrderItems({ data: { orderId: o.id } });
            return { ...o, items };
          })
        );
        return enriched as Order[];
      }
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total, currency, carrier, tracking_number, created_at, order_items(product_name, product_image, quantity, line_total)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold">Mes commandes</h1>
      <p className="mt-1 text-muted-foreground">Historique complet et suivi de livraison.</p>

        {isLoading ? (
          <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !data || data.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Aucune commande pour l'instant.</p>
            <Link to="/marketplace" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Découvrir le catalogue</Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {data.map((o) => {
              const meta = STATUS_META[o.status] ?? STATUS_META.pending;
              const Icon = meta.icon;
              const items = o.items ?? (o as any).order_items ?? [];
              return (
                <li key={o.id} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
                  <Link to="/order/$id" params={{ id: o.id }} className="block">
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-display font-bold">N° {o.order_number}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.color}`}>
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                  </header>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {items.map((it: any, i: number) => (
                      <li key={i} className="flex items-center gap-3 rounded-lg bg-background p-2">
                        <img src={it.product_image ?? ""} alt="" width={40} height={40} className="h-10 w-10 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-sm font-medium">{it.product_name}</div>
                          <div className="text-xs text-muted-foreground">× {it.quantity} · {it.line_total.toFixed(2)} €</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                    <div className="text-muted-foreground">
                      {o.carrier && <>Transport <span className="font-semibold text-foreground">{o.carrier}</span>{o.tracking_number ? ` · ${o.tracking_number}` : ""}</>}
                    </div>
                    <div className="font-display text-lg font-bold text-terre">{o.total.toFixed(2)} {o.currency}                    </div>
                  </footer>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
  );
}

