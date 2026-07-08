import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Sparkles, Languages, Wand2, MessageCircle, Search, Send } from "lucide-react";

export const Route = createFileRoute("/ai")({
  head: () => ({ meta: [{ title: "IA Tissage — Centre d'Intelligence Artificielle" }, { name: "description", content: "Assistant IA pour artisans : génération de fiches produits, traduction en 6 langues, optimisation SEO, réponse automatique aux clients." }] }),
  component: AIPage,
});

const LANGS = [["Français","🇫🇷"],["English","🇬🇧"],["Español","🇪🇸"],["Deutsch","🇩🇪"],["中文","🇨🇳"],["日本語","🇯🇵"]];

function AIPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden bg-noir text-creme">
        <div className="tissage-pattern absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <span className="inline-flex rounded-full border border-or/40 bg-or/10 px-3 py-1 text-xs font-semibold text-or">CENTRE D'INTELLIGENCE ARTIFICIELLE</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">L'IA qui <span className="text-gradient-or">amplifie</span> votre savoir-faire</h1>
          <p className="mt-4 max-w-2xl text-creme/80">L'Assistant Artisan vous aide à rédiger, traduire, optimiser et vendre vos créations dans le monde entier — en quelques secondes.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { i: Wand2, t: "Fiches produits", d: "Génération automatique de descriptions captivantes en quelques secondes." },
          { i: Languages, t: "Traduction", d: "6 langues : FR · EN · ES · DE · 中文 · 日本語." },
          { i: Search, t: "Optimisation SEO", d: "Titres, meta descriptions et mots-clés optimisés pour Google." },
          { i: MessageCircle, t: "Réponse clients", d: "Assistant 24/7 qui répond aux questions clients à votre place." },
        ].map(({ i: Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-or/10 text-terre"><Icon className="h-6 w-6" /></div>
            <h3 className="mt-5 text-lg font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      {/* Demo */}
      <section className="bg-card/50">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">Démo : Assistant Artisan</h2>
            <p className="mt-2 text-muted-foreground">Posez une question, demandez une description, traduisez votre fiche produit.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {LANGS.map(([l, f]) => <button key={l} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary"><span className="mr-1.5">{f}</span>{l}</button>)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5 shadow-card">
            <div className="space-y-3">
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">Rédige une description pour mon panier en raphia naturel de Madagascar.</div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm">
                <Sparkles className="mb-1 inline h-3.5 w-3.5 text-primary" /> Magnifique panier tressé main au cœur de Madagascar, en raphia naturel d'exception. Une pièce unique alliant la tradition vannière malgache à un design intemporel — parfait pour la décoration, le rangement ou le marché du dimanche.
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <input placeholder="Décrivez votre produit ou posez une question..." className="flex-1 bg-transparent text-sm outline-none" />
              <button className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90"><Send className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Démo statique · l'IA sera connectée lorsque vous activerez Lovable AI.</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
