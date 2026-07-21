import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "../../../hooks/use-auth.ts";
import { useQuery } from "@tanstack/react-query";
import { getHubs, getArtisanOrderStats } from "../../../lib/api/db.server.ts";
import { Loader2, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/shipping")({
  head: () => ({ meta: [{ title: "Livraison — TISSAGE" }] }),
  component: ShippingPanel,
});

function ShippingPanel() {
  const { user } = useAuth();
  const { data: hubs, isLoading } = useQuery({ queryKey: ["hubs-shipping"], queryFn: async () => getHubs({}) });
  const { data: stats } = useQuery({
    enabled: !!user, queryKey: ["artisan-stats-shipping", user?.id],
    queryFn: async () => getArtisanOrderStats({ data: { artisanId: user!.id } }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Livraison & hubs régionaux</h2>
        <p className="text-sm text-muted-foreground">Vos produits partent de votre hub de rattachement vers les clients via notre réseau logistique.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Commandes totales</div>
          <div className="mt-1 font-display text-2xl font-bold">{stats?.ordersCount ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Produits en ligne</div>
          <div className="mt-1 font-display text-2xl font-bold">{stats?.productsCount ?? 0}</div>
        </div>
      </div>

      <h3 className="font-display text-lg font-bold">Hubs partenaires</h3>
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (hubs ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucun hub configuré.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(hubs as any[]).map((h) => (
            <div key={h.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-terre" />
                <h4 className="font-semibold">{h.nom}</h4>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{h.ville}, {h.region}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span>Tél: {h.telephone ?? "—"}</span>
                <span>Contact: {h.contact ?? "—"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                {h.support_cod && <span className="rounded bg-vert/10 px-1.5 py-0.5 text-vert">COD</span>}
                {h.prix_par_km && <span className="rounded bg-muted px-1.5 py-0.5">{Number(h.prix_par_km).toLocaleString()} Ar/km</span>}
                {h.prix_par_kg && <span className="rounded bg-muted px-1.5 py-0.5">{Number(h.prix_par_kg).toLocaleString()} Ar/kg</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
