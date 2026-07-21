import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "../components/site-header.tsx";
import { SiteFooter } from "../components/site-footer.tsx";
import { ProductCard } from "../components/product-card.tsx";
import { ARTISANS, PRODUCTS } from "../lib/data.ts";
import { getArtisanById, getArtisanProducts } from "../lib/api/db.server.ts";
import { ChevronRight, MapPin, Star, ShieldCheck, Award, Globe, Camera, PlayCircle, Play, Languages, Mail } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/artisan/$id")({
  loader: async ({ params }) => {
    try {
      const artisan = await getArtisanById({ data: { id: params.id } });
      if (artisan) {
        const products = await getArtisanProducts({ data: { artisanName: artisan.name } });
        return { artisan, products };
      }
    } catch (e) { console.error("Failed to load artisan:", e); }
    let artisan = ARTISANS.find(a => a.id === params.id);
    if (!artisan) artisan = ARTISANS.find(a => a.name === decodeURIComponent(params.id));
    if (!artisan) throw notFound();
    return { artisan, products: PRODUCTS.filter(p => p.artisan === artisan.name) };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.artisan.name} — Artisan TISSAGE` }, { name: "description", content: `${loaderData?.artisan.specialty} · ${loaderData?.artisan.city}, ${loaderData?.artisan.country}` }] }),
  notFoundComponent: () => <div className="p-20 text-center">Artisan introuvable. <Link to="/artisans" className="text-primary underline">Retour</Link></div>,
  errorComponent: ({ reset }) => <div className="p-20"><button onClick={reset}>Réessayer</button></div>,
  component: ArtisanPage,
});

function ArtisanPage() {
  const navigate = useNavigate();
  const { artisan: a, products } = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ["Boutique", "Portfolio", "Histoire", "Avis clients"];
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-4">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Accueil</Link><ChevronRight className="h-3.5 w-3.5" />
          <Link to="/artisans" className="hover:text-foreground">Artisans</Link><ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{a.name}</span>
        </nav>
      </div>

      {/* Hero card */}
      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="grid gap-6 rounded-2xl border border-border bg-card p-6 lg:grid-cols-[280px_1fr_280px]">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-or/30 to-terre/30">
            <div className="grid h-full w-full place-items-center font-display text-6xl font-bold text-white">{a.name.split(" ").map((n: string)=>n[0]).slice(0,2).join("")}</div>
            <button className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-noir/80 text-creme"><Play className="h-4 w-4" /></button>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{a.name}</h1>
              {a.certified && <span className="inline-flex items-center gap-1 rounded-full bg-vert/10 px-2 py-1 text-xs font-semibold text-vert"><ShieldCheck className="h-3 w-3" /> Artisan certifié</span>}
            </div>
            <p className="mt-1 text-muted-foreground">{a.specialty}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {a.city}, {a.country}</p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <div className="flex items-center text-or">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.floor(a.rating) ? "fill-or" : ""}`} />)}</div>
              {a.rating} <span className="text-muted-foreground">({a.reviews} avis)</span>
            </div>
            <p className="mt-4 max-w-2xl text-sm text-foreground/80">
              Passionné par son art depuis plus de {a.experience} ans, {a.name} perpétue les savoir-faire traditionnels en créant des pièces uniques alliant authenticité et modernité. Son atelier est situé à {a.city}.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                {[{ Icon: Globe, label: "Site web" }, { Icon: Camera, label: "Instagram" }, { Icon: PlayCircle, label: "Vidéo" }].map(({ Icon, label }, i) => (
                  <button key={i} title={label} className="grid h-8 w-8 place-items-center rounded-full border border-border text-foreground/60 hover:text-primary"><Icon className="h-4 w-4" /></button>
                ))}
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Languages className="h-3.5 w-3.5" /> Français · English · Malagasy</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certifications</h4>
              <ul className="mt-2 space-y-2 text-sm">
                <li className="flex gap-2"><Award className="h-4 w-4 text-or" /> Artisanat d'art {a.country}</li>
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-vert" /> Commerce équitable</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-background p-3 text-center"><div className="font-display text-xl font-bold text-terre">{a.products}</div><div className="text-xs text-muted-foreground">Produits</div></div>
              <div className="rounded-xl border border-border bg-background p-3 text-center"><div className="font-display text-xl font-bold text-terre">{a.experience}</div><div className="text-xs text-muted-foreground">Années</div></div>
            </div>
            <button onClick={() => navigate({ to: "/contact", search: { artisan: a.name } })} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"><Mail className="h-4 w-4" /> Contacter l'artisan</button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-border">
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)} className={`-mb-px border-b-2 px-4 py-3 text-sm transition ${i === activeTab ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {activeTab === 0 && (
          <>
            <h2 className="text-2xl font-bold">Boutique de l'artisan ({products.length})</h2>
            <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
              {(products.length ? products : []).map((p: any) => <ProductCard key={p.id} p={p} />)}
            </div>
          </>
        )}
        {activeTab === 1 && (
          <div className="text-center py-10 text-muted-foreground">
            <p>Portfolio de {a.name} — Galerie photo à venir.</p>
          </div>
        )}
        {activeTab === 2 && (
          <article className="max-w-3xl">
            <h2 className="text-2xl font-bold">Histoire de {a.name}</h2>
            <p className="mt-4 text-muted-foreground">
              Passionné par son art depuis plus de {a.experience} ans, {a.name} perpétue les savoir-faire traditionnels 
              de {a.country} en créant des pièces uniques alliant authenticité et modernité. 
              Son atelier est situé à {a.city}, où il/elle transmet son savoir aux nouvelles générations.
            </p>
          </article>
        )}
        {activeTab === 3 && (
          <div className="text-center py-10 text-muted-foreground">
            <p>Les avis clients apparaîtront ici.</p>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
