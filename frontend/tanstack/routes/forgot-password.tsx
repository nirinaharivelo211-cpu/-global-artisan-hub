import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, Logo } from "../components/site-header.tsx";
import { SiteFooter } from "../components/site-footer.tsx";
import { supabase } from "../integrations/supabase/client.ts";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Mot de passe oublié — TISSAGE" }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      z.string().email().parse(email);
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Email envoyé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Email invalide");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-md px-6 py-16">
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-bold">Mot de passe oublié</h1>
        <p className="mt-2 text-sm text-muted-foreground">Recevez un lien sécurisé pour réinitialiser votre mot de passe.</p>

        {sent ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm">
            <p>Si un compte existe pour <strong>{email}</strong>, un email vient d'être envoyé. Pensez à vérifier vos spams.</p>
            <Link to="/auth" className="mt-4 inline-block text-primary hover:underline">← Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background px-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="flex-1 bg-transparent py-2.5 text-sm outline-none" placeholder="vous@exemple.com" />
              </div>
            </label>
            <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Envoyer le lien <ArrowRight className="h-4 w-4" /></>}
            </button>
            <Link to="/auth" className="block text-center text-xs text-muted-foreground hover:text-foreground">← Retour à la connexion</Link>
          </form>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
