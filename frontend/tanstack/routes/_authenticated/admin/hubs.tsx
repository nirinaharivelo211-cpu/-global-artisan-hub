import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getHubs, createHub, getZonesByHub, createZone } from "@/lib/api/db.server";
import { Loader2, Plus, Layers } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/hubs")({
  component: HubsManager,
});

function HubsManager() {
  const qc = useQueryClient();
  const { data: hubs, isLoading } = useQuery({ queryKey: ["admin-hubs"], queryFn: async () => getHubs({}) });
  const [showForm, setShowForm] = useState(false);
  const [expandedHub, setExpandedHub] = useState<string | null>(null);

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Ajouter un hub
        </button>
      </div>

      {showForm && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          try {
            await createHub({ data: { nom: fd.get("nom") as string, region: fd.get("region") as string, ville: fd.get("ville") as string } });
            toast.success("Hub créé");
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["admin-hubs"] });
          } catch { toast.error("Erreur"); }
        }} className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-3">
          <label className="block"><span className="text-xs font-medium text-muted-foreground">Nom</span><input name="nom" required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" /></label>
          <label className="block"><span className="text-xs font-medium text-muted-foreground">Région</span><input name="region" required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" /></label>
          <label className="block"><span className="text-xs font-medium text-muted-foreground">Ville</span><input name="ville" required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" /></label>
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:col-span-3">Créer le hub</button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(hubs ?? []).length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Aucun hub configuré.</div>
        ) : (
          (hubs as any[]).map((h) => (
            <HubCard key={h.id} hub={h} expanded={expandedHub === h.id} onToggle={() => setExpandedHub(expandedHub === h.id ? null : h.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function HubCard({ hub: h, expanded, onToggle }: { hub: any; expanded: boolean; onToggle: () => void }) {
  const qc = useQueryClient();
  const { data: zones } = useQuery({
    enabled: expanded,
    queryKey: ["hub-zones", h.id],
    queryFn: async () => getZonesByHub({ data: { hubId: h.id } }),
  });
  const [showZoneForm, setShowZoneForm] = useState(false);

  async function handleCreateZone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createZone({
        data: { hubId: h.id, nom: fd.get("nom") as string, ville: fd.get("ville") as string, distanceKm: Number(fd.get("distance_km")) || undefined, delaiJours: Number(fd.get("delai_jours")) || undefined },
      });
      toast.success("Zone créée");
      setShowZoneForm(false);
      qc.invalidateQueries({ queryKey: ["hub-zones", h.id] });
    } catch { toast.error("Erreur"); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{h.nom}</h3>
            <p className="text-xs text-muted-foreground">{h.ville}, {h.region}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${h.actif ? "bg-vert/10 text-vert" : "bg-muted text-muted-foreground"}`}>
            {h.actif ? "Actif" : "Inactif"}
          </span>
        </div>
        {h.telephone && <p className="mt-2 text-xs">{h.telephone}</p>}
        {h.regions_servees?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(h.regions_servees as string[]).map((r: string) => (
              <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{r}</span>
            ))}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>Prix/km: {Number(h.prix_par_km).toLocaleString()} Ar</span>
          <span>Prix/kg: {Number(h.prix_par_kg).toLocaleString()} Ar</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {h.support_cod && <span className="rounded bg-vert/10 px-2 py-0.5 text-vert">COD dispo</span>}
          {h.mvola_number && <span className="rounded bg-vert/5 px-2 py-0.5 text-vert">MVola: {h.mvola_number}</span>}
          {h.airtel_money_number && <span className="rounded bg-or/5 px-2 py-0.5 text-or">Airtel: {h.airtel_money_number}</span>}
          {h.orange_money_number && <span className="rounded bg-rouge/5 px-2 py-0.5 text-rouge">Orange: {h.orange_money_number}</span>}
        </div>
        <button onClick={onToggle} className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
          <Layers className="h-3.5 w-3.5" /> {expanded ? "Masquer les zones" : `${zones?.length ?? 0} zones de livraison`}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-3">
          {(!zones || zones.length === 0) ? (
            <p className="text-xs text-muted-foreground">Aucune zone de livraison.</p>
          ) : (
            <div className="space-y-2">
              {(zones as any[]).map((z: any) => (
                <div key={z.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{z.nom}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{z.ville}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{z.distance_km} km</span>
                    <span>{z.delai_estime_jours} jours</span>
                    <span className={z.actif ? "text-vert" : "text-muted-foreground"}>{z.actif ? "Actif" : "Inactif"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showZoneForm ? (
            <form onSubmit={handleCreateZone} className="grid gap-3 sm:grid-cols-4">
              <label className="block"><span className="text-xs text-muted-foreground">Nom</span><input name="nom" required className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none" /></label>
              <label className="block"><span className="text-xs text-muted-foreground">Ville</span><input name="ville" className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none" /></label>
              <label className="block"><span className="text-xs text-muted-foreground">Distance (km)</span><input name="distance_km" type="number" step="0.1" className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none" /></label>
              <div className="flex items-end gap-2">
                <button type="submit" className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Ajouter</button>
                <button type="button" onClick={() => setShowZoneForm(false)} className="rounded border border-border px-3 py-1.5 text-xs">Annuler</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowZoneForm(true)} className="flex items-center gap-1 text-xs text-primary"><Plus className="h-3 w-3" /> Ajouter une zone</button>
          )}
        </div>
      )}
    </div>
  );
}
