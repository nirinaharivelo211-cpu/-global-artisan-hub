import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, Logo } from "../components/site-header.tsx";
import { SiteFooter } from "../components/site-footer.tsx";
import { supabase } from "../integrations/supabase/client.ts";
import { Lock, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Réinitialiser le mot de passe — TISSAGE" }] }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase handles the recovery token via URL hash and emits PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also check current session in case the event already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Au moins 6 caractères");
    if (pwd !== pwd2) return toast.error("Les mots de passe ne correspondent pas");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe mis à jour");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-md px-6 py-16">
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-bold">Nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choisissez un mot de passe fort, au moins 6 caractères.</p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6">
          {!ready && <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Vérification du lien de récupération…</p>}
          <Field label="Nouveau mot de passe" value={pwd} onChange={setPwd} />
          <Field label="Confirmer" value={pwd2} onChange={setPwd2} />
          <button disabled={busy || !ready} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Mettre à jour <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background px-3">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <input type="password" value={value} onChange={(e) => onChange(e.target.value)} required minLength={6} className="flex-1 bg-transparent py-2.5 text-sm outline-none" placeholder="••••••••" />
      </div>
    </label>
  );
}
