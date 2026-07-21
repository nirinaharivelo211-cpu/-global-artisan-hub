import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "../components/site-header.tsx";
import { SiteFooter } from "../components/site-footer.tsx";
import { Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Tarifs Artisan — TISSAGE" }] }),
  component: Pricing,
});

const PLANS = [
  { name: "Gratuit", price: "0 €", desc: "Pour démarrer.", commission: "10%", features: ["Jusqu'à 10 produits","Boutique en ligne","Paiements internationaux","Support standard"] },
  { name: "Premium", price: "29 €/mois", desc: "Pour les artisans actifs.", commission: "7%", popular: true, features: ["Produits illimités","SEO automatique","IA assistant inclus","Support prioritaire"] },
  { name: "Business", price: "79 €/mois", desc: "Pour développer à l'international.", commission: "5%", features: ["Traduction 6 langues","Statistiques avancées","Marketing & campagnes","Logistique mutualisée"] },
  { name: "Export Pro", price: "Sur devis", desc: "Pour les ateliers exportateurs.", commission: "5%", features: ["Compte gestionnaire dédié","Contrats B2B","Documents douaniers","Assistance export 1-1"] },
];

function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">Une tarification pour <span className="text-gradient-or">chaque artisan</span></h1>
        <p className="mt-4 text-muted-foreground">Démarrez gratuitement, progressez à votre rythme. Pas d'engagement.</p>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map(p => (
          <div key={p.name} className={`rounded-2xl border bg-card p-6 shadow-card ${p.popular ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
            {p.popular && <span className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">PLUS POPULAIRE</span>}
            <h3 className="font-display text-xl font-bold">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.desc}</p>
            <div className="mt-5 font-display text-3xl font-bold text-terre">{p.price}</div>
            <div className="text-xs text-muted-foreground">Commission : {p.commission} sur les ventes</div>
            <ul className="mt-5 space-y-2 text-sm">
              {p.features.map(f => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-vert" /> {f}</li>)}
            </ul>
            <button className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium ${p.popular ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border hover:bg-muted"}`}>
              Choisir <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </section>
      <SiteFooter />
    </div>
  );
}
