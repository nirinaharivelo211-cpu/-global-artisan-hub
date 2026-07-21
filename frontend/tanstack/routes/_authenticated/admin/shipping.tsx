import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAllShipments, getHubs } from "../../../lib/api/db.server";
import { Loader2, Truck, MapPin, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/shipping")({
  head: () => ({ meta: [{ title: "Livraisons — Admin TISSAGE" }] }),
  component: ShippingPage,
});

function ShippingPage() {
  const { data: shipments, isLoading: loadingS } = useQuery({
    queryKey: ["admin-shipments"],
    queryFn: async () => getAllShipments({}),
  });
  const { data: hubs, isLoading: loadingH } = useQuery({
    queryKey: ["admin-hubs-ship"],
    queryFn: async () => getHubs({}),
  });

  if (loadingS || loadingH) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const activeHubs = (hubs ?? []).filter((h: any) => h.actif !== false);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-info/10 text-info"><Truck className="h-5 w-5" /></div>
          <div className="mt-4 font-display text-2xl font-bold">{(shipments ?? []).length}</div>
          <div className="text-xs text-muted-foreground">Livraisons totales</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-or/10 text-or"><MapPin className="h-5 w-5" /></div>
          <div className="mt-4 font-display text-2xl font-bold">{activeHubs.length}</div>
          <div className="text-xs text-muted-foreground">Hubs actifs / {(hubs ?? []).length} total</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-vert/10 text-vert"><Package className="h-5 w-5" /></div>
          <div className="mt-4 font-display text-2xl font-bold">{(shipments ?? []).filter((s: any) => !s.livreur_id).length}</div>
          <div className="text-xs text-muted-foreground">Non assignées</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Livraisons récentes</h2>
          {shipments && shipments.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">N° commande</th>
                    <th className="p-3 text-left">Statut</th>
                    <th className="p-3 text-left">Montant dû</th>
                    <th className="p-3 text-left">Paiement</th>
                    <th className="p-3 text-left">Date prévue</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s: any) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="p-3 font-mono text-xs">{s.order_number ?? s.order_id.slice(0, 8)}</td>
                      <td className="p-3">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{s.order_status}</span>
                      </td>
                      <td className="p-3 text-xs font-semibold">{Number(s.montant_du).toFixed(2)} €</td>
                      <td className="p-3 text-xs">{s.statut_paiement ?? "—"}</td>
                      <td className="p-3 text-xs">{new Date(s.date_prevue).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Aucune livraison enregistrée.</p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Hubs logistiques</h2>
          <div className="mt-4 space-y-3">
            {(hubs ?? []).map((h: any) => (
              <div key={h.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <MapPin className={`h-4 w-4 ${h.actif !== false ? "text-vert" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">{h.nom}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{h.ville}, {h.region}</p>
                <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                  <span>{h.prix_par_km ?? 0} €/km</span>
                  <span>{h.prix_par_kg ?? 0} €/kg</span>
                </div>
              </div>
            ))}
            {(!hubs || hubs.length === 0) && (
              <p className="text-sm text-muted-foreground">Aucun hub configuré.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
