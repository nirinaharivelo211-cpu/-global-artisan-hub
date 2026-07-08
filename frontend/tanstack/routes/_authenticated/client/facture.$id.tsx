import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getOrderById, getOrderFacture, getOrderItems } from "@/lib/api/db.server";
import { Loader2, FileText, Printer, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/client/facture/$id")({
  head: () => ({ meta: [{ title: "Facture — TISSAGE" }] }),
  loader: async ({ params }) => ({ id: params.id }),
  component: FacturePage,
});

function FacturePage() {
  const { id } = Route.useParams();
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["facture-order", id],
    queryFn: async () => getOrderById({ data: { id } }),
  });
  const { data: facture } = useQuery({
    queryKey: ["facture", id],
    queryFn: async () => getOrderFacture({ data: { orderId: id } }),
  });

  if (orderLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!order) return <div className="mx-auto max-w-3xl px-6 py-20 text-center text-muted-foreground">Commande introuvable.</div>;

  const o = order as any;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux commandes
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
          <Printer className="h-4 w-4" /> Imprimer
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold">Facture</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {facture?.numero_facture ?? `FACT-${o.order_number ?? o.id.slice(0, 8)}`}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">TISSAGE</p>
            <p className="text-muted-foreground">Plateforme Artisanale</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-medium uppercase text-muted-foreground">Client</h3>
            <p className="mt-1 font-medium">{o.shipping_address?.full_name ?? o.user_id}</p>
            <p className="text-sm text-muted-foreground">{o.shipping_address?.email ?? ""}</p>
            <p className="text-sm text-muted-foreground">{o.shipping_address?.phone ?? ""}</p>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-medium uppercase text-muted-foreground">Date</h3>
            <p className="mt-1">{new Date(o.created_at).toLocaleDateString("fr-FR")}</p>
            <h3 className="mt-3 text-xs font-medium uppercase text-muted-foreground">Statut</h3>
            <p className="mt-1 capitalize">{o.status}</p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 text-left">Produit</th>
                <th className="text-right">Qté</th>
                <th className="text-right">Prix unitaire</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(o.items ?? []).map((item: any, i: number) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2">{item.product_name ?? "Produit"}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">{Number(item.unit_price).toFixed(2)} €</td>
                  <td className="text-right font-semibold">{Number(item.line_total ?? item.unit_price * item.quantity).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-right">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{Number(o.subtotal ?? o.total).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Livraison</span>
              <span>{Number(o.shipping ?? 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between gap-8 text-lg font-bold">
              <span>Total</span>
              <span>{Number(o.total).toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {facture?.qr_code && (
          <div className="mt-6 flex justify-center">
            <img src={facture.qr_code} alt="QR Code facture" className="h-24 w-24" />
          </div>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Merci de votre confiance !</p>
          <p className="mt-1">TISSAGE · Plateforme de commerce artisanal</p>
        </div>
      </div>
    </div>
  );
}
