import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrdersPaginated, transitionOrderStatus } from "../../../lib/api/db.server.ts";
import { Loader2, ShoppingCart, Search, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportCsv } from "../../../lib/csv-export.ts";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "Commandes — Admin TISSAGE" }] }),
  component: OrdersView,
});

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["awaiting_payment", "preparing", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["prete", "cancelled"],
  prete: ["shipped", "cancelled"],
  shipped: ["in_delivery", "cancelled"],
  in_delivery: ["delivered", "cancelled", "returned", "echec"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
  echec: [],
};

function OrdersView() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders-paginated", page, filter, search],
    queryFn: async () => getOrdersPaginated({ data: { page, limit: 20, filter: filter || undefined, search: search || undefined } }),
  });

  const orders = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const transitionMut = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) =>
      transitionOrderStatus({ data: { orderId, newStatus } }),
    onSuccess: (res: any) => {
      if (res.error) { toast.error(res.error); return; }
      toast.success(`Statut mis à jour`);
      qc.invalidateQueries({ queryKey: ["admin-orders-paginated"] });
    },
    onError: () => toast.error("Erreur"),
  });

  function handleFilter(v: string) {
    setFilter(v);
    setPage(1);
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  if (isLoading && !data) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const statuses = [...new Set(orders.map((o: any) => o.status))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Rechercher N° commande..." className="bg-transparent text-sm outline-none w-48" />
        </div>
        <select value={filter} onChange={e => handleFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none">
          <option value="">Tous les statuts</option>
          {statuses.map((s: any) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{total} commande(s)</span>
        {orders.length > 0 && (
          <button onClick={() => exportCsv(orders, [
            { key: "order_number", label: "N° commande" },
            { key: "status", label: "Statut" },
            { key: "total", label: "Total" },
            { key: "payment_method", label: "Paiement" },
            { key: "created_at", label: "Date" },
          ], "commandes")} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">Aucune commande</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">N°</th>
                  <th className="p-3 text-left">Client</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Paiement</th>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => {
                  const transitions = STATUS_TRANSITIONS[o.status] ?? [];
                  return (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <Link to={`/order/${o.id}`} className="font-mono text-xs text-primary underline">
                          {o.order_number ?? o.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="p-3 text-xs">{o.shipping_address?.fullName ?? o.user_id?.slice(0, 12) ?? "—"}</td>
                      <td className="p-3 text-xs">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3 text-xs">{o.payment_method ?? "—"}</td>
                      <td className="p-3">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{o.status.replace(/_/g, " ")}</span>
                      </td>
                      <td className="p-3 text-right font-semibold">{Number(o.total).toFixed(2)} €</td>
                      <td className="p-3 text-right">
                        {transitions.length > 0 && (
                          <div className="flex gap-1 justify-end">
                            {transitions.slice(0, 2).map((ns: string) => (
                              <button key={ns} onClick={() => transitionMut.mutate({ orderId: o.id, newStatus: ns })}
                                className="rounded bg-muted px-2 py-0.5 text-[10px] hover:bg-primary hover:text-primary-foreground transition">
                                {ns.replace(/_/g, " ")}
                              </button>
                            ))}
                            {transitions.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">+{transitions.length - 2}</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-30 hover:bg-muted">Précédent</button>
          <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-30 hover:bg-muted">Suivant</button>
        </div>
      )}
    </div>
  );
}
