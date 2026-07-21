import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useProfile, useRoles } from "../../hooks/use-auth";
import { supabase } from "../../integrations/supabase/client";
import { updateProfile, checkDbMode } from "../../lib/api/auth.server";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Mon profil — TISSAGE" }] }),
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile(user);
  const { data: roles } = useRoles(user);
  const [form, setForm] = useState({ full_name: "", phone: "", country: "", city: "", language: "fr", currency: "EUR" });
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"local" | "supabase">("supabase");

  useEffect(() => {
    checkDbMode().then((res) => setMode(res.dbMode)).catch(() => {});
  }, []);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        country: profile.country ?? "",
        city: profile.city ?? "",
        language: profile.language ?? "fr",
        currency: profile.currency ?? "EUR",
      });
    }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      if (mode === "local") {
        await updateProfile({ data: { userId: user.id, ...form } });
      } else {
        const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
        if (error) throw error;
      }
      toast.success("Profil mis à jour");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold">Mon profil</h1>
      <p className="mt-1 text-muted-foreground">{user?.email} · {roles?.join(", ") || "client"}</p>

      <form onSubmit={save} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <Field label="Nom complet" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} className="sm:col-span-2" />
        <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Pays" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
        <Field label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        <Field label="Langue" value={form.language} onChange={(v) => setForm({ ...form, language: v })} />
        <Field label="Devise" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} />
        <div className="sm:col-span-2">
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
    </label>
  );
}
