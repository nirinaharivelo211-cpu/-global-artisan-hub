import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck, Users, Package, Globe, Headphones, Truck, ArrowRight, ChevronRight, Star, MapPin, Sparkles, CreditCard, Heart,
} from "lucide-react";
import heroImg from "../assets/hero-weaving.jpg";
import baobabImg from "../assets/baobab.jpg";
import aAndry from "../assets/a-andry.jpg";
import aNadia from "../assets/a-nadia.jpg";
import aIssa from "../assets/a-issa.jpg";
import aMarie from "../assets/a-marie.jpg";
import aJean from "../assets/a-jean.jpg";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { PRODUCTS, PRODUCT_IMAGES } from "../lib/data";
import { getProducts, getAdminStats } from "../lib/api/db.server";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TISSAGE — Marketplace internationale des artisans du monde" },
      { name: "description", content: "Découvrez des créations artisanales authentiques d'Afrique, de Madagascar et du monde entier. Marketplace, logistique, IA et tourisme artisanal." },
    ],
  }),
  loader: async () => {
    let products, stats;
    try { products = await getProducts(); } catch (e) { console.error("Failed to load products:", e); }
    try { stats = await getAdminStats(); } catch (e) { console.error("Failed to load stats:", e); }
    return { products: (products && products.length > 0) ? products : PRODUCTS, stats };
  },
  pendingMinMs: 300,
  pendingComponent: () => <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>,
  component: Home,
});

const { pBasket, pStatue, pTextile, pJewelry, pVase, pBag } = PRODUCT_IMAGES;

const CATEGORIES_HOME = [
  { name: "Sculpture", img: pStatue },
  { name: "Vannerie", img: pBasket },
  { name: "Textile", img: pTextile },
  { name: "Bijoux", img: pJewelry },
  { name: "Décoration", img: pVase },
  { name: "Bois précieux", img: pStatue },
  { name: "Soie", img: pTextile },
  { name: "Accessoires", img: pBag },
  { name: "Corne de zébu", img: pVase },
];

const ARTISANS_HOME = [
  { name: "Ravelonarivo Andry", role: "Vannier traditionnel", city: "Antananarivo, Madagascar", rating: 4.9, reviews: 128, img: aAndry },
  { name: "Nadia Koné", role: "Tisseuse", city: "Bamako, Mali", rating: 4.8, reviews: 96, img: aNadia },
  { name: "Issa Diop", role: "Sculpteur sur bois", city: "Dakar, Sénégal", rating: 4.8, reviews: 70, img: aIssa },
  { name: "Marie Claire", role: "Créatrice de bijoux", city: "Abidjan, Côte d'Ivoire", rating: 4.7, reviews: 58, img: aMarie },
  { name: "Jean Baptiste", role: "Artisan décorateur", city: "Port-au-Prince, Haïti", rating: 4.8, reviews: 90, img: aJean },
];

const HERO_SLIDES = [
  {
    eyebrow: "Marketplace internationale",
    title: "Tisser les savoir-faire,",
    title2: "connecter le monde.",
    sub: "Découvrez des créations artisanales authentiques provenant d'Afrique, de Madagascar et du monde entier.",
    primary: { to: "/marketplace", label: "Découvrir les produits" },
    secondary: { to: "/artisans", label: "Rencontrer nos artisans" },
  },
  {
    eyebrow: "B2B & Export",
    title: "Achetez en gros,",
    title2: "exportez sans frontières.",
    sub: "Devis multi-fournisseurs, groupage maritime et douanes simplifiées pour vos volumes.",
    primary: { to: "/b2b", label: "Espace B2B" },
    secondary: { to: "/logistics", label: "Hub logistique" },
  },
  {
    eyebrow: "IA Tissage",
    title: "Vos produits,",
    title2: "traduits dans 6 langues.",
    sub: "L'IA génère fiches produits, SEO et réponses clients en français, anglais, espagnol, allemand, chinois et japonais.",
    primary: { to: "/ai", label: "Découvrir l'IA" },
    secondary: { to: "/auth", label: "Devenir artisan" },
  },
];

function Home() {
  const { products: allProducts, stats } = Route.useLoaderData();
  const sUsers = stats ? `${(stats.users / 1000).toFixed(0)}k+` : "+10 000";
  const sProducts = stats ? `${(stats.products / 1000).toFixed(0)}k+` : "+50 000";
  const sArtisans = stats ? `${(stats.artisans / 1000).toFixed(0)}k+` : "+10 000";
  const [slide, setSlide] = useState(0);
  const [tab, setTab] = useState<"best" | "new" | "popular">("best");
  const s = HERO_SLIDES[slide];

  const products = tab === "new"
    ? [...allProducts].filter((p: any) => p.isNew).concat(allProducts).slice(0, 6)
    : tab === "popular"
    ? [...allProducts].sort((a: any, b: any) => b.reviews - a.reviews).slice(0, 6)
    : [...allProducts].sort((a: any, b: any) => b.rating - a.rating).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero with carousel dots */}
      <section className="relative overflow-hidden bg-noir text-creme">
        <img src={heroImg} alt="Artisan tissant un panier en raphia" width={1600} height={900} className="absolute inset-0 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/85 to-noir/30" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 md:py-28 lg:grid-cols-[1.1fr_1fr]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-or/40 bg-or/10 px-3 py-1 text-xs font-medium text-or">
              <Sparkles className="h-3 w-3" /> {s.eyebrow}
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] md:text-6xl lg:text-7xl">
              {s.title}<br />
              <span className="text-gradient-or">{s.title2}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-creme/80">{s.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={s.primary.to} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-soft transition hover:opacity-90">
                {s.primary.label} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to={s.secondary.to} className="inline-flex items-center gap-2 rounded-md border border-creme/30 bg-creme/5 px-6 py-3.5 font-semibold text-creme backdrop-blur transition hover:bg-creme/10">
                {s.secondary.label}
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[aAndry, aNadia, aIssa, aMarie, aJean].map((src, i) => (
                  <img key={i} src={src} alt="" width={36} height={36} className="h-9 w-9 rounded-full border-2 border-noir object-cover" />
                ))}
              </div>
              <p className="text-sm text-creme/70"><span className="font-semibold text-creme">{sArtisans} artisans</span> déjà rejoints</p>
            </div>
            <div className="mt-8 flex items-center gap-2">
              {HERO_SLIDES.map((_, i) => (
                <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-10 bg-or" : "w-4 bg-creme/30 hover:bg-creme/50"}`} />
              ))}
            </div>
          </div>
          <div className="hidden lg:block" />
        </div>

        {/* Certified badge */}
        <div className="absolute bottom-8 right-8 hidden max-w-xs rounded-xl border border-creme/15 bg-noir/75 p-4 backdrop-blur md:block">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-or/20"><ShieldCheck className="h-5 w-5 text-or" /></div>
            <div>
              <div className="font-display font-semibold">Artisanat certifié</div>
              <div className="text-xs text-creme/60">Authenticité • Qualité • Commerce équitable</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-8 md:grid-cols-3 lg:grid-cols-6">
            {[
              { i: Users, n: sArtisans, l: "Artisans" },
              { i: Package, n: sProducts, l: "Produits uniques" },
              { i: Globe, n: stats && stats.hubs ? `${stats.hubs}+` : "120+", l: "Pays livrés" },
              { i: ShieldCheck, n: "Paiements", l: "100% sécurisés" },
              { i: Truck, n: "Livraison", l: "internationale" },
              { i: Headphones, n: "Support 24/7", l: "À votre écoute" },
            ].map(({ i: Icon, n, l }) => (
            <div key={l} className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-or/10 text-terre"><Icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="font-display text-sm font-bold leading-tight">{n}</div>
                <div className="text-xs text-muted-foreground">{l}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Parcourir par catégories</h2>
          <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Voir toutes les catégories <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-10">
          {CATEGORIES_HOME.map(c => (
            <Link key={c.name} to="/marketplace" className="group">
              <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                <img src={c.img} alt={c.name} loading="lazy" width={200} height={200} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <p className="mt-2 text-center text-xs font-medium md:text-sm">{c.name}</p>
            </Link>
          ))}
          <Link to="/marketplace" className="group">
            <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-border bg-card text-muted-foreground transition group-hover:border-primary group-hover:text-primary">
              <div className="text-2xl font-bold">•••</div>
            </div>
            <p className="mt-2 text-center text-xs font-medium md:text-sm">Plus</p>
          </Link>
        </div>
      </section>

      {/* Featured products with tabs */}
      <section className="bg-card/40">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-2">
            <h2 className="text-2xl font-bold">Produits en vedette</h2>
            <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Voir tous les produits <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="-mt-px flex gap-1 border-b border-border">
            {([
              ["best", "Meilleures ventes"],
              ["new", "Nouveautés"],
              ["popular", "Populaires"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`-mb-px border-b-2 px-4 py-3 text-sm transition ${tab === k ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
            {products.map((p: any) => (
              <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group block overflow-hidden rounded-xl bg-background shadow-card transition hover:-translate-y-1 hover:shadow-soft">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img src={p.img} alt={p.name} loading="lazy" width={300} height={300} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <button onClick={(e) => e.preventDefault()} aria-label="Ajouter aux favoris" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/95 text-foreground/70 shadow hover:text-rouge">
                    <Heart className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold leading-tight">{p.name}</h3>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">Fait main · {p.country}</p>
                  <div className="mt-2 font-display text-base font-bold text-terre">{p.price.toFixed(2)} €</div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    {[...Array(5)].map((_, i) => <Star key={i} className={`h-3 w-3 ${i < Math.round(p.rating) ? "fill-or text-or" : "text-muted"}`} />)}
                    <span className="ml-1">({p.reviews})</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Artisans row */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold">À la rencontre de nos artisans</h2>
          <Link to="/artisans" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Voir tous les artisans <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {ARTISANS_HOME.map(a => (
            <Link key={a.name} to="/artisans" className="group overflow-hidden rounded-xl bg-card shadow-card transition hover:-translate-y-1 hover:shadow-soft">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img src={a.img} alt={a.name} loading="lazy" width={400} height={300} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-4 text-center">
                <h3 className="font-display font-semibold">{a.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.role}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {a.city}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-or text-or" /> <span className="font-semibold text-foreground">{a.rating}</span> ({a.reviews})
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why choose TISSAGE */}
      <section className="bg-creme/40">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-center font-display text-3xl font-bold">Pourquoi choisir TISSAGE ?</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3 lg:grid-cols-5">
            {[
              { i: ShieldCheck, t: "Authenticité garantie", d: "Des produits artisanaux authentiques et certifiés." },
              { i: CreditCard, t: "Paiements sécurisés", d: "Transactions 100% sécurisées et protégées." },
              { i: Truck, t: "Livraison internationale", d: "Partout dans le monde avec suivi en temps réel." },
              { i: Heart, t: "Soutien aux artisans", d: "Une plateforme engagée pour le commerce équitable." },
              { i: Headphones, t: "Service client 24/7", d: "Notre équipe est disponible à tout moment." },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-or/15 text-terre">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 pillars ecosystem */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">L'écosystème TISSAGE</span>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Marketplace + Logistique + IA + Tourisme</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { i: Package, t: "Marketplace internationale", d: "Catalogue mondial, filtres avancés, B2B et enchères.", to: "/marketplace" },
            { i: Truck, t: "Hub logistique", d: "DHL/FedEx/UPS, groupage maritime, douanes, IA transporteur.", to: "/logistics" },
            { i: Sparkles, t: "IA Tissage", d: "Fiches produits, traduction 6 langues, SEO et réponses clients.", to: "/ai" },
            { i: Globe, t: "Tourisme artisanal", d: "Réservez des visites d'ateliers et formations artisanales.", to: "/tourism" },
          ].map(({ i: Icon, t, d, to }) => (
            <Link key={t} to={to} className="group rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-or/10 text-terre"><Icon className="h-6 w-6" /></div>
              <h3 className="mt-5 text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Découvrir <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Payments band */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Paiements acceptés partout dans le monde</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {["Visa", "Mastercard", "PayPal", "Stripe", "Apple Pay", "Google Pay", "MVola", "Orange Money", "Airtel Money", "PayDunya"].map(p => (
              <span key={p} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground/80">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter with baobab */}
      <section className="relative overflow-hidden">
        <img src={baobabImg} alt="" width={1600} height={400} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-noir/90 to-noir/60" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-14 text-creme md:flex-row md:justify-between">
          <div className="max-w-lg">
            <h3 className="font-display text-2xl font-bold md:text-3xl">Restez connecté avec TISSAGE</h3>
            <p className="mt-2 text-sm text-creme/80">Recevez nos nouveautés, nos histoires d'artisans et nos offres exclusives.</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="flex w-full max-w-lg overflow-hidden rounded-md bg-creme">
            <input type="email" required placeholder="Votre adresse email" className="flex-1 bg-transparent px-4 py-3 text-sm text-noir outline-none placeholder:text-noir/50" />
            <button className="bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">S'inscrire</button>
          </form>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
