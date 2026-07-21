import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "../../../hooks/use-auth.ts";
import { useQuery } from "@tanstack/react-query";
import { getOrdersInDelivery, transitionOrderStatus } from "../../../lib/api/db.server.ts";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, CheckCircle2, Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/livreur/finaliser")({
  head: () => ({ meta: [{ title: "Finaliser livraison — TISSAGE" }] }),
  component: FinaliserLivraison,
});

function FinaliserLivraison() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders-in-delivery"],
    queryFn: async () => getOrdersInDelivery({}),
  });
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const filtered = search ? (orders ?? []).filter((o: any) =>
    (o.order_number ?? o.id).toLowerCase().includes(search.toLowerCase())
  ) : (orders ?? []);

  async function handleFinalize(id: string) {
    setFinalizing(true);
    try {
      await transitionOrderStatus({ data: { orderId: id, newStatus: "delivered" } });
      toast.success("Livraison finalisée !");
      setConfirmId(null);
    } catch { toast.error("Erreur lors de la finalisation"); }
    finally { setFinalizing(false); }
  }

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Finaliser une livraison</h2>
        <p className="text-sm text-muted-foreground">Recherchez une commande en cours de livraison et marquez-la comme livrée.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par N° commande..." className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">N° commande</th>
              <th className="text-left">Client</th>
              <th className="text-left">Statut</th>
              <th className="text-left">Total</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">
                {search ? "Aucun résultat" : "Aucune commande en livraison"}
              </td></tr>
            ) : (
              filtered.map((o: any) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{o.order_number ?? o.id.slice(0, 8)}</td>
                  <td className="text-xs">{o.user_name ?? o.user_email ?? o.user_id?.slice(0, 12) ?? "—"}</td>
                  <td><span className="rounded bg-muted px-2 py-0.5 text-xs">{o.status}</span></td>
                  <td className="font-semibold">{Number(o.total).toFixed(2)} €</td>
                  <td className="p-3 text-right">
                    {confirmId === o.id ? (
                      <div className="inline-flex gap-2">
                        <button onClick={() => handleFinalize(o.id)} disabled={finalizing} className="inline-flex items-center gap-1 rounded-md bg-vert px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                          {finalizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Confirmer
                        </button>
                        <button onClick={() => setConfirmId(null)} className="rounded-md border border-border px-3 py-1.5 text-xs">Annuler</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(o.id)} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                        <Truck className="h-3 w-3" /> Finaliser
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
