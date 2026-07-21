import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "../../../hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getB2BProfile, upsertB2BProfile } from "../../../lib/api/db.server";
import { Loader2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/b2b")({
  head: () => ({ meta: [{ title: "Espace B2B — TISSAGE" }] }),
  component: B2BPanel,
});

function B2BPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["b2b-profile", user?.id],
    queryFn: async () => getB2BProfile({ data: { userId: user!.id } }),
  });

  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [moq, setMoq] = useState(50);
  const [volumeDiscount, setVolumeDiscount] = useState(0);
  const [productionDelayDays, setProductionDelayDays] = useState(21);
  const [incotermPreferred, setIncotermPreferred] = useState("FOB");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setCompanyName((profile as any).company_name ?? "");
      setSiret((profile as any).siret ?? "");
      setMoq((profile as any).moq ?? 50);
      setVolumeDiscount((profile as any).volume_discount ?? 0);
      setProductionDelayDays((profile as any).production_delay_days ?? 21);
      setIncotermPreferred((profile as any).incoterm_preferred ?? "FOB");
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const res = await upsertB2BProfile({
        data: {
          userId: user.id, companyName, siret, moq, volumeDiscount,
          productionDelayDays, incotermPreferred,
        },
      });
      if ((res as any)?.error) { toast.error((res as any).error); return; }
      toast.success("Profil B2B enregistré !");
      qc.invalidateQueries({ queryKey: ["b2b-profile"] });
    } catch { toast.error("Erreur"); }
    finally { setSaving(false); }
  }

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Espace B2B / Export</h2>
      <p className="text-sm text-muted-foreground">Configurez vos conditions commerciales pour les acheteurs professionnels et exportateurs.</p>
      <form onSubmit={handleSave} className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Raison sociale</span>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="SARL Tissage Export" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Numéro SIRET / RC</span>
          <input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="..." className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Quantité minimum (MOQ)</span>
          <input type="number" min="1" value={moq} onChange={(e) => setMoq(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Remise volume (%)</span>
          <input type="number" min="0" max="100" step="0.5" value={volumeDiscount} onChange={(e) => setVolumeDiscount(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Délai de production (jours)</span>
          <input type="number" min="1" value={productionDelayDays} onChange={(e) => setProductionDelayDays(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Incoterm préféré</span>
          <input value={incotermPreferred} onChange={(e) => setIncotermPreferred(e.target.value)} placeholder="FOB, CIF, EXW..." className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </label>
        <div className="sm:col-span-2 flex items-center justify-between">
          <Link to="/b2b" className="text-sm text-primary underline">Voir la page B2B publique</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Enregistrer</>}
          </button>
        </div>
      </form>
    </div>
  );
}
