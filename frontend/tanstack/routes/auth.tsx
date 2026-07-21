import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, Logo } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { Mail, Lock, User, ArrowRight, Loader2, Briefcase, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "../hooks/use-auth";
import { checkDbMode, registerUser, loginUser } from "../lib/api/auth.server";

type SearchParams = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: "Connexion / Inscription — TISSAGE" }] }),
  component: Auth,
});

const emailSchema = z.string().trim().email("Email invalide").max(255);
const passwordSchema = z.string().min(6, "Au moins 6 caractères").max(72);
const nameSchema = z.string().trim().min(2, "Nom trop court").max(80);

function Auth() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { user, loading } = useAuth();
  const [dbMode, setDbMode] = useState<"local" | "supabase" | null>(null);

  useEffect(() => {
    checkDbMode().then((res) => setDbMode(res.dbMode)).catch(() => setDbMode("supabase"));
  }, []);

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"client" | "artisan">("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: redirect || "/", replace: true });
    }
  }, [user, loading, redirect, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (dbMode === "local") {
        if (tab === "signup") {
          nameSchema.parse(name);
          emailSchema.parse(email);
          passwordSchema.parse(password);
          const result = await registerUser({ data: { email, password, fullName: name, role } });
          if (result.error) { toast.error(result.error); return; }
          if (result.token) localStorage.setItem("tissage_token", result.token);
          toast.success("Compte créé !");
        } else {
          emailSchema.parse(email);
          passwordSchema.parse(password);
          const result = await loginUser({ data: { email, password } });
          if (result.error) { toast.error(result.error); return; }
          if (result.token) localStorage.setItem("tissage_token", result.token);
          toast.success("Connecté");
        }
        window.dispatchEvent(new Event("tissage-auth-change"));
        navigate({ to: redirect || "/", replace: true });
      } else {
        if (tab === "signup") {
          nameSchema.parse(name);
          emailSchema.parse(email);
          passwordSchema.parse(password);
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: { full_name: name, role },
            },
          });
          if (error) throw error;
          toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
        } else {
          emailSchema.parse(email);
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          toast.success("Connecté");
        }
      }
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.errors[0]?.message : err instanceof Error ? err.message : "Erreur";
      toast.error(msg || "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + (redirect || "/"),
        },
      });
      if (error) {
        toast.error("Connexion Google impossible");
        setSubmitting(false);
      }
    } catch {
      toast.error("Connexion Google impossible");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2">
        <div className="hidden lg:block">
          <Logo />
          <h1 className="mt-8 font-display text-4xl font-bold leading-tight">
            Rejoignez la <span className="text-gradient-or">communauté</span> TISSAGE
          </h1>
          <p className="mt-4 text-muted-foreground">
            Achetez en toute sécurité ou vendez vos créations dans 120+ pays. Bénéficiez de notre IA, de la logistique mutualisée et d'un tableau de bord professionnel.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Paiement sécurisé en 1 clic",
              "Suivi de commande en temps réel",
              "Réservation d'ateliers et formations",
              "Boutique pro pour artisans (gratuite)",
            ].map((l) => (
              <li key={l} className="flex gap-2"><span className="text-primary">✓</span> {l}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="flex rounded-lg bg-muted p-1">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {t === "login" ? "Se connecter" : "S'inscrire"}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {tab === "signup" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Je suis…</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setRole("client")} className={`rounded-md border p-3 text-left text-sm transition ${role === "client" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                      <ShoppingBag className="h-4 w-4 text-terre" />
                      <div className="mt-1 font-semibold">Acheteur</div>
                      <div className="text-xs text-muted-foreground">Acheter & réserver</div>
                    </button>
                    <button type="button" onClick={() => setRole("artisan")} className={`rounded-md border p-3 text-left text-sm transition ${role === "artisan" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                      <Briefcase className="h-4 w-4 text-terre" />
                      <div className="mt-1 font-semibold">Artisan</div>
                      <div className="text-xs text-muted-foreground">Vendre mes créations</div>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nom complet</label>
                  <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background px-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-transparent py-2.5 text-sm outline-none" placeholder="Votre nom" required />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background px-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent py-2.5 text-sm outline-none" placeholder="vous@exemple.com" required />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Mot de passe</label>
                {tab === "login" && <Link to="/forgot-password" className="text-xs text-primary hover:underline">Oublié ?</Link>}
              </div>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background px-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent py-2.5 text-sm outline-none" placeholder="••••••••" required minLength={6} />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>{tab === "login" ? "Se connecter" : "Créer mon compte"} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
            {dbMode !== "local" && (
              <>
                <div className="relative my-2 text-center text-xs text-muted-foreground">
                  <span className="bg-card px-2 relative z-10">ou</span>
                  <span className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
                </div>
                <button type="button" onClick={handleGoogle} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60">
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                  Continuer avec Google
                </button>
              </>
            )}
            <p className="text-center text-xs text-muted-foreground">
              {tab === "login" ? "Pas de compte ? " : "Déjà inscrit ? "}
              <button type="button" onClick={() => setTab(tab === "login" ? "signup" : "login")} className="font-semibold text-primary">
                {tab === "login" ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          </form>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
