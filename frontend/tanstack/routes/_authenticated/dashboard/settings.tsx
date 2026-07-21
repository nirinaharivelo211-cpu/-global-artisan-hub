import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "../../../hooks/use-auth.ts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserProfile, updateUserProfile } from "../../../lib/api/db.server.ts";
import { Loader2, Save, User, Mail, Phone, MapPin, Globe, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Paramètres — TISSAGE" }] }),
  component: SettingsPanel,
});

function SettingsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["user-profile-settings", user?.id],
    queryFn: async () => getUserProfile({ data: { userId: user!.id } }),
  });
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName((profile as any).full_name ?? "");
      setPhone((profile as any).phone ?? "");
      setCountry((profile as any).country ?? "");
      setCity((profile as any).city ?? "");
      setDescription((profile as any).description ?? "");
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const res = await updateUserProfile({ data: { userId: user.id, fullName, phone, country, city, description } });
      if ((res as any)?.error) { toast.error((res as any).error); return; }
      toast.success("Profil mis à jour !");
      qc.invalidateQueries({ queryKey: ["user-profile-settings"] });
    } catch { toast.error("Erreur"); }
    finally { setSaving(false); }
  }

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Paramètres</h2>
      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Profil public</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><User className="h-3.5 w-3.5" /> Nom complet</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Mail className="h-3.5 w-3.5" /> Email</span>
              <input value={(profile as any)?.email ?? user?.email ?? ""} disabled className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Phone className="h-3.5 w-3.5" /> Téléphone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Globe className="h-3.5 w-3.5" /> Pays</span>
              <input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Ville</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Bio / Description</h3>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Parlez de vous, de votre artisanat..." />
        </section>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Enregistrer</>}
          </button>
        </div>
      </form>
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="text-xs text-muted-foreground">Membre depuis</div>
        <div className="mt-1 font-medium">{profile ? new Date((profile as any).created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }) : "—"}</div>
      </section>
    </div>
  );
}
