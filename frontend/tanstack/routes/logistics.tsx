import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "../components/site-header.tsx";
import { SiteFooter } from "../components/site-footer.tsx";
import { Plane, Ship, Truck, FileText, Calculator, MapPin, Sparkles, Package, ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/logistics")({
  head: () => ({ meta: [{ title: "Hub Logistique — TISSAGE" }, { name: "description", content: "Centre d'exportation : DHL, FedEx, UPS, fret aérien et maritime mutualisé. IA logistique pour choisir le meilleur transporteur." }] }),
  component: Logistics,
});

function Logistics() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-noir text-creme">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <span className="inline-flex rounded-full border border-or/40 bg-or/10 px-3 py-1 text-xs font-semibold text-or">CENTRE D'EXPORTATION</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">Un hub logistique mondial pour vos exportations</h1>
          <p className="mt-4 max-w-2xl text-creme/80">DHL, FedEx, UPS, EMS, Colissimo, fret aérien et maritime mutualisé : envoyez vos créations dans 120+ pays avec les meilleurs tarifs et tous les documents douaniers générés automatiquement.</p>
        </div>
      </section>

      {/* Simulator */}
      <section className="mx-auto max-w-7xl px-6 -mt-12">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Simulez vos frais d'expédition</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            {[["De","Madagascar"],["Vers","France"],["Poids (kg)","2"],["Volume (L)","8"]].map(([l,p]) => (
              <div key={l}>
                <label className="text-xs font-medium text-muted-foreground">{l}</label>
                <input defaultValue={p} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
            ))}
            <button className="self-end rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90">Calculer</button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              { c: "DHL Express", p: "78,40 €", d: "3-5 jours", best: true },
              { c: "FedEx International", p: "82,10 €", d: "4-6 jours" },
              { c: "Fret aérien mutualisé", p: "52,80 €", d: "7-10 jours", saver: true },
            ].map(o => (
              <div key={o.c} className={`rounded-xl border p-4 ${o.best ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{o.c}</span>
                  {o.best && <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">RECOMMANDÉ IA</span>}
                  {o.saver && <span className="rounded bg-vert px-2 py-0.5 text-[10px] font-bold text-white">ÉCO</span>}
                </div>
                <div className="mt-2 font-display text-2xl font-bold text-terre">{o.p}</div>
                <div className="text-xs text-muted-foreground">{o.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Carriers */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-3xl font-bold">Réseau logistique mondial</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <Plane className="h-6 w-6 text-terre" />
            <h3 className="mt-3 font-display text-lg font-bold">Transport aérien</h3>
            <p className="mt-1 text-sm text-muted-foreground">DHL · FedEx · UPS · EMS · Colissimo</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-2"><Package className="h-4 w-4 text-or" /> Regroupement de colis</li>
              <li className="flex gap-2"><Package className="h-4 w-4 text-or" /> Conteneur aérien partagé</li>
              <li className="flex gap-2"><Package className="h-4 w-4 text-or" /> Réduction de coûts jusqu'à 40%</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <Ship className="h-6 w-6 text-terre" />
            <h3 className="mt-3 font-display text-lg font-bold">Transport maritime</h3>
            <p className="mt-1 text-sm text-muted-foreground">Maersk · CMA CGM · MSC</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-2"><Package className="h-4 w-4 text-or" /> Groupage LCL (Less than Container Load)</li>
              <li className="flex gap-2"><Package className="h-4 w-4 text-or" /> Conteneur partagé entre artisans</li>
              <li className="flex gap-2"><Package className="h-4 w-4 text-or" /> FCL pour les gros volumes</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl font-bold">Génération automatique des documents</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              { t: "Facture export", i: FileText },
              { t: "Bon de livraison", i: Truck },
              { t: "Déclaration douanière", i: ShieldCheck },
              { t: "Certificat d'origine", i: MapPin },
            ].map(({ t, i: Icon }) => (
              <div key={t} className="rounded-xl border border-border bg-card p-5 shadow-card">
                <Icon className="h-6 w-6 text-terre" />
                <p className="mt-3 font-semibold">{t}</p>
                <p className="mt-1 text-xs text-muted-foreground">Généré automatiquement à la commande</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI logistics */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-terre to-or p-8 text-creme md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-creme/80"><Sparkles className="h-4 w-4" /> IA Logistique</div>
              <h3 className="mt-2 font-display text-2xl font-bold md:text-3xl">L'algorithme TISSAGE choisit pour vous</h3>
              <p className="mt-3 text-creme/85">Suivant le poids, le volume, la destination et l'assurance, notre IA recommande le meilleur transporteur, le meilleur prix et le délai optimal.</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-md bg-noir px-6 py-3 font-medium text-creme hover:bg-noir/80">Suivre un colis <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
