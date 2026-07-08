import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getArtisanPromotions, createPromotion, togglePromotion, deletePromotion } from "@/lib/api/db.server";
import { Loader2, Plus, Trash2, Power, PowerOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/promotions")({
  head: () => ({ meta: [{ title: "Promotions — TISSAGE" }] }),
  component: PromotionsPanel,
});

function PromotionsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: promos, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["artisan-promotions", user?.id],
    queryFn: async () => getArtisanPromotions({ data: { userId: user!.id } }),
  });
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(10);
  const [type, setType] = useState<"%" | "€">("%");
  const [maxUses, setMaxUses] = useState(0);
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    try {
      const res = await createPromotion({ data: { userId: user.id, code: code.toUpperCase(), discount, type, maxUses: maxUses || undefined } });
      if ((res as any)?.error) { toast.error((res as any).error); return; }
      toast.success("Code promo créé !");
      setCode(""); setDiscount(10); setMaxUses(0);
      qc.invalidateQueries({ queryKey: ["artisan-promotions"] });
    } catch { toast.error("Erreur"); }
    finally { setCreating(false); }
  }

  async function handleToggle(id: string) {
    try {
      await togglePromotion({ data: { id } });
      qc.invalidateQueries({ queryKey: ["artisan-promotions"] });
    } catch { toast.error("Erreur"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce code promo ?")) return;
    try {
      await deletePromotion({ data: { id } });
      toast.success("Code promo supprimé");
      qc.invalidateQueries({ queryKey: ["artisan-promotions"] });
    } catch { toast.error("Erreur"); }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Promotions & remises</h2>
      <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-5">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Code promo</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="ETE2026" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Remise</span>
          <input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as "%" | "€")} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
            <option value="%">Pourcentage (%)</option>
            <option value="€">Montant fixe (€)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Max utilisations (0 = illimité)</span>
          <input type="number" min="0" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={creating} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Créer</>}
          </button>
        </div>
      </form>
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !promos || (promos as any[]).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Aucun code promo. Créez-en un ci-dessus.</div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="p-3 text-left">Code</th><th className="text-left">Remise</th><th className="text-left">Utilisations</th><th className="text-left">Statut</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {(promos as any[]).map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-mono font-semibold">{p.code}</td>
                  <td>{Number(p.discount).toFixed(p.type === "€" ? 2 : 0)}{p.type}</td>
                  <td>{p.uses}{p.max_uses ? ` / ${p.max_uses}` : ""}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.active ? "bg-vert/15 text-vert" : "bg-muted text-muted-foreground"}`}>
                      {p.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => handleToggle(p.id)} className="rounded p-2 hover:bg-muted" title={p.active ? "Désactiver" : "Activer"}>
                        {p.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="rounded p-2 hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
