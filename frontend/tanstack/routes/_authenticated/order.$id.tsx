import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useAuth } from "../../hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getOrderById, getOrderItems } from "../../lib/api/db.server";
import { Package, Truck, CheckCircle2, Clock, Loader2, MapPin, CreditCard, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/order/$id")({
  head: () => ({ meta: [{ title: "Détail commande — TISSAGE" }] }),
  component: OrderDetail,
});

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "En attente", color: "bg-muted text-foreground", icon: Clock },
  confirmed: { label: "Confirmée", color: "bg-terre/10 text-terre", icon: Clock },
  awaiting_payment: { label: "Paiement en attente", color: "bg-or/10 text-or", icon: Clock },
  paid: { label: "Payée", color: "bg-vert/10 text-vert", icon: CheckCircle2 },
  preparing: { label: "En préparation", color: "bg-or/10 text-or", icon: Package },
  prete: { label: "Prête", color: "bg-terre/10 text-terre", icon: Package },
  shipped: { label: "Expédiée", color: "bg-terre/10 text-terre", icon: Truck },
  in_delivery: { label: "En livraison", color: "bg-terre/10 text-terre", icon: Truck },
  delivered: { label: "Livrée", color: "bg-vert/10 text-vert", icon: CheckCircle2 },
  cancelled: { label: "Annulée", color: "bg-rouge/10 text-rouge", icon: Clock },
  returned: { label: "Retournée", color: "bg-rouge/10 text-rouge", icon: Package },
  echec: { label: "Échec", color: "bg-rouge/10 text-rouge", icon: Clock },
};

const STEP_ORDER = [
  "pending", "confirmed", "awaiting_payment", "paid",
  "preparing", "prete", "shipped", "in_delivery", "delivered",
];

function OrderDetail() {
  const { user } = useAuth();
  const { id } = Route.useParams();
  const { data: order, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["order", id],
    queryFn: async () => {
      const o = await getOrderById({ data: { id } });
      if (!o) throw notFound();
      const items = await getOrderItems({ data: { orderId: id } });
      return { ...o, items };
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!order) return null;

  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  const Icon = meta.icon;
  const currentStep = STEP_ORDER.indexOf(order.status);

  const shipping = order.shipping_address as Record<string, string> | null;
  const items = order.items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Commande {order.order_number ?? `#${order.id.slice(0, 8)}`}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Passée le {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.color}`}>
            <Icon className="h-3.5 w-3.5" /> {meta.label}
          </span>
        </div>

        <div className="mt-8">
          <h2 className="font-display text-lg font-bold">Suivi de commande</h2>
          <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-2">
            {STEP_ORDER.map((s, i) => {
              const m = STATUS_META[s];
              if (!m) return null;
              const done = i <= currentStep;
              const current = i === currentStep;
              return (
                <div key={s} className="flex items-center gap-1 shrink-0">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    current ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                    done ? "bg-vert/10 text-vert" : "bg-muted text-muted-foreground"
                  }`}>
                    {done && i < currentStep ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>{m.label}</span>
                  {i < STEP_ORDER.length - 1 && <div className={`h-0.5 w-8 ${i < currentStep ? "bg-vert" : "bg-muted"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold"><Package className="h-4 w-4 text-terre" /> Articles</h2>
            <ul className="mt-4 space-y-3">
              {items.map((it: any, i: number) => (
                <li key={i} className="flex items-center gap-3">
                  <img src={it.product_image ?? ""} alt="" width={48} height={48} className="h-12 w-12 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{it.product_name}</div>
                    <div className="text-xs text-muted-foreground">× {it.quantity} · {it.artisan_name ?? "Artisan"}</div>
                  </div>
                  <div className="text-sm font-semibold shrink-0">{Number(it.line_total).toFixed(2)} €</div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd>{Number(order.subtotal).toFixed(2)} €</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Livraison</dt><dd>{Number(order.shipping).toFixed(2)} €</dd></div>
              <div className="flex justify-between border-t border-border pt-2 font-bold text-terre"><dt>Total</dt><dd>{Number(order.total).toFixed(2)} €</dd></div>
            </dl>
          </section>

          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-terre" /> Adresse de livraison</h2>
              {shipping ? (
                <div className="mt-3 text-sm space-y-1">
                  <p className="font-medium">{shipping.full_name}</p>
                  <p className="text-muted-foreground">{shipping.line1}</p>
                  {shipping.line2 && <p className="text-muted-foreground">{shipping.line2}</p>}
                  <p className="text-muted-foreground">{shipping.postal_code ? `${shipping.postal_code} ` : ""}{shipping.city}</p>
                  <p className="text-muted-foreground">{shipping.country}</p>
                  <p className="text-xs text-muted-foreground">Tél: {shipping.phone}</p>
                </div>
              ) : <p className="mt-3 text-sm text-muted-foreground">Non renseignée</p>}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4 text-terre" /> Paiement</h2>
              <div className="mt-3 text-sm space-y-1">
                <p className="text-muted-foreground">Méthode : <span className="font-medium text-foreground">{order.payment_method}</span></p>
                <p className="text-muted-foreground">Transporteur : <span className="font-medium text-foreground">{order.carrier ?? "Hub régional"}</span></p>
                {order.region && <p className="text-muted-foreground">Région : {order.region}</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-terre" /> Chronologie</h2>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  { l: "Commande créée", d: order.created_at },
                  { l: "Confirmée", d: order.date_confirmation },
                  { l: "En préparation", d: order.date_preparation },
                  { l: "Livrée", d: order.date_livraison },
                ].filter(e => e.d).map((e, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div><span className="text-muted-foreground">{e.l} :</span> {new Date(e.d).toLocaleDateString("fr-FR")}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/orders" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            ← Mes commandes
          </Link>
          <Link to="/support" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <FileText className="h-4 w-4" /> Aide
          </Link>
        </div>
      </div>
  );
}
