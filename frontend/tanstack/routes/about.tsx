import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "À propos — TISSAGE" }, { name: "description", content: "TISSAGE relie les artisans du monde aux acheteurs internationaux : authenticité, innovation, équité, collaboration, excellence." }] }),
  component: About,
});

const VALUES = [
  ["Authenticité", "Valoriser l'authenticité et l'héritage culturel."],
  ["Innovation", "Utiliser la technologie pour ouvrir de nouveaux marchés."],
  ["Équité", "Promouvoir un commerce équitable et responsable."],
  ["Collaboration", "Créer des ponts entre artisans et acheteurs du monde entier."],
  ["Excellence", "Soutenir l'excellence artisanale et la qualité."],
];

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-noir text-creme">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold md:text-6xl">Notre <span className="text-gradient-or">mission</span></h1>
          <p className="mt-6 text-lg text-creme/80">TISSAGE est la plateforme internationale qui relie les artisans, leurs savoir-faire et les acheteurs du monde entier — pour faire vivre l'artisanat à l'échelle planétaire.</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">Nos valeurs</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {VALUES.map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
              <div className="mx-auto h-10 w-10 rounded-full bg-gradient-to-br from-or to-terre" />
              <h3 className="mt-4 font-display font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-card/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-4">
          {[["+10 000","Artisans"],["+50 000","Produits"],["120+","Pays livrés"],["+200 000","Clients satisfaits"]].map(([n,l]) => (
            <div key={l} className="text-center">
              <div className="font-display text-4xl font-bold text-terre">{n}</div>
              <div className="text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
