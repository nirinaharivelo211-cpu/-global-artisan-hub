import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "../components/site-header.tsx";
import { SiteFooter } from "../components/site-footer.tsx";
import { Building2, Hotel, Truck, Briefcase, Package, FileCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/b2b")({
  head: () => ({ meta: [{ title: "Espace B2B — TISSAGE" }, { name: "description", content: "Catalogue B2B pour hôtels, boutiques, importateurs, architectes et décorateurs. Devis, achat en gros, contrats fournisseurs." }] }),
  component: B2B,
});

function B2B() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-noir text-creme">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-or/40 bg-or/10 px-3 py-1 text-xs font-semibold text-or">ACHETEURS PROFESSIONNELS</span>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">L'artisanat authentique pour les <span className="text-gradient-or">professionnels</span></h1>
            <p className="mt-4 max-w-xl text-creme/80">Hôtels, boutiques, importateurs, décorateurs et architectes : sourcez des collections artisanales uniques avec contrats, devis et logistique intégrée.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">Demander un devis</button>
              <button className="rounded-md border border-creme/30 px-6 py-3 font-medium text-creme hover:bg-creme/10">Catalogue B2B</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[{ i: Hotel, l: "Hôtels & Resorts" },{ i: Building2, l: "Boutiques" },{ i: Truck, l: "Importateurs" },{ i: Briefcase, l: "Architectes & Déco" }].map(({ i: Icon, l }) => (
              <div key={l} className="rounded-xl border border-creme/10 bg-creme/5 p-5">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-or/20 text-or"><Icon className="h-5 w-5" /></div>
                <p className="mt-3 font-semibold">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-3xl font-bold">Solutions B2B clé en main</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { i: FileCheck, t: "Demande de devis", d: "Recevez des devis personnalisés en 48h auprès des artisans sélectionnés." },
            { i: Package, t: "Achat en gros", d: "Tarifs dégressifs dès 50 pièces, MOQ négociables avec l'artisan." },
            { i: Building2, t: "Catalogue B2B", d: "Catalogue privé multi-fournisseurs avec prix nets et fiches techniques." },
            { i: Briefcase, t: "Contrats fournisseurs", d: "Contrats-cadres, exclusivités géographiques et personnalisations." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-or/10 text-terre"><Icon className="h-6 w-6" /></div>
              <h3 className="mt-5 text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-16 grid gap-10 lg:grid-cols-[1fr_400px]">
          <div>
            <h2 className="text-3xl font-bold">Pourquoi nous choisir</h2>
            <ul className="mt-6 space-y-4">
              {[
                "Artisans certifiés et sourcing responsable",
                "Logistique mutualisée DHL/FedEx/UPS et fret maritime",
                "Documents douaniers générés automatiquement",
                "Personnalisation et co-création possibles",
                "Paiement à 30/60 jours pour comptes vérifiés",
              ].map(l => <li key={l} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-vert" /> {l}</li>)}
            </ul>
          </div>
          <form className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-display text-xl font-bold">Demande de devis</h3>
            <div className="mt-4 space-y-3">
              {[["Nom de l'entreprise","Acme Hôtel"],["Email professionnel","contact@acme.com"],["Pays","France"]].map(([l,p]) => (
                <div key={l}>
                  <label className="text-xs font-medium text-muted-foreground">{l}</label>
                  <input placeholder={p} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Votre besoin</label>
                <textarea rows={3} placeholder="Décrivez le projet, volumes, délais..." className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <button className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-medium text-primary-foreground hover:opacity-90">Envoyer la demande <ArrowRight className="h-4 w-4" /></button>
            </div>
          </form>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
