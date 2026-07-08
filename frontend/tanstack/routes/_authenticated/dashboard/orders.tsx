import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getUserOrders } from "@/lib/api/db.server";
import { checkDbMode } from "@/lib/api/auth.server";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  head: () => ({ meta: [{ title: "Mes commandes — TISSAGE" }] }),
  component: MyOrders,
});

function MyOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const mode = (await checkDbMode()).dbMode;
      if (mode === "local") return (await getUserOrders({ data: { userId: user.id } })) as any[];
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!orders || orders.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Aucune commande.</div>;
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">N°</th>
              <th className="text-left">Date</th>
              <th className="text-left">Statut</th>
              <th className="text-left">Paiement</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr key={o.id} className="border-t border-border cursor-pointer hover:bg-muted/30" onClick={() => navigate({ to: "/order/$id", params: { id: o.id } })}>
                <td className="p-3 font-mono text-xs">{o.order_number ?? o.id.slice(0, 8)}</td>
                <td className="text-xs">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                <td><span className="rounded bg-muted px-2 py-0.5 text-xs">{o.status}</span></td>
                <td className="text-xs">{o.payment_method ?? "—"}</td>
                <td className="p-3 text-right font-semibold">{Number(o.total).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
