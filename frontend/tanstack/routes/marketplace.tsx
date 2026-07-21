import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { ProductCard } from "../components/product-card";
import { PRODUCTS, COUNTRIES, MATERIALS } from "../lib/data";
import { getProducts, getCategoriesFull, getCountries, getMaterials } from "../lib/api/db.server";
import { ChevronRight, SlidersHorizontal, ArrowUpDown, Truck, ShieldCheck, Search, X } from "lucide-react";

const marketplaceSearchSchema = z.object({
  sort: z.enum(["popular", "price-asc", "price-desc", "new", "rating"]).optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/marketplace")({
  validateSearch: marketplaceSearchSchema,
  head: () => ({ meta: [{ title: "Marketplace — TISSAGE" }, { name: "description", content: "Catalogue mondial d'artisanat : filtrez par pays, catégorie, matière, prix, livraison rapide, commerce équitable." }] }),
  loader: async () => {
    try {
      const [products, dbCat, countries, materials] = await Promise.all([
        getProducts(), getCategoriesFull({}), getCountries(), getMaterials(),
      ]);
      const categories = dbCat.map(c => c.nom);
      if (products && products.length > 0) {
        return { products, categories, countries, materials };
      }
    } catch (e) { console.error("Failed to load marketplace data:", e); }
    return { products: PRODUCTS, categories: ["Tissage & Textile", "Poterie & Céramique", "Vannerie & Sparterie", "Bijouterie & Orfèvrerie", "Maroquinerie & Cuir", "Bois & Sculpture", "Ferronnerie & Métal", "Décoration & Art de la table", "Instruments & Musique"], countries: COUNTRIES, materials: MATERIALS };
  },
  pendingMinMs: 300,
  pendingComponent: () => <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>,
  component: Marketplace,
});

type Sort = "popular" | "price-asc" | "price-desc" | "new" | "rating";

function Marketplace() {
  const { products: allProducts, categories: catsList, countries: countriesList, materials: matsList } = Route.useLoaderData();
  const search = useSearch({ from: "/marketplace" });
  const [q, setQ] = useState(search.q ?? "");
  const [sort, setSort] = useState<Sort>(search.sort ?? "popular");
  const [minP, setMinP] = useState<string>("");
  const [maxP, setMaxP] = useState<string>("");
  const [countries, setCountries] = useState<Set<string>>(new Set());
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [mats, setMats] = useState<Set<string>>(new Set());
  const [fast, setFast] = useState(false);
  const [fair, setFair] = useState(false);
  const [cert, setCert] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function toggle(set: Set<string>, key: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setter(next);
  }

  const filtered = useMemo(() => {
    const min = minP ? Number(minP) : -Infinity;
    const max = maxP ? Number(maxP) : Infinity;
    const ql = q.trim().toLowerCase();
    let list = allProducts.filter((p: any) => {
      if (ql && !`${p.name} ${p.artisan} ${p.category} ${p.material} ${p.country}`.toLowerCase().includes(ql)) return false;
      if (countries.size && !countries.has(p.country)) return false;
      if (cats.size && !cats.has(p.category)) return false;
      if (mats.size && !mats.has(p.material)) return false;
      if (fast && !p.fastShip) return false;
      if (fair && !p.fairTrade) return false;
      if (cert && !p.certified) return false;
      if (p.price < min || p.price > max) return false;
      return true;
    });
    switch (sort) {
      case "price-asc": list = [...list].sort((a: any, b: any) => a.price - b.price); break;
      case "price-desc": list = [...list].sort((a: any, b: any) => b.price - a.price); break;
      case "new": list = list.filter((p: any) => p.isNew); break;
      case "rating": list = [...list].sort((a: any, b: any) => b.rating - a.rating); break;
      default: list = [...list].sort((a: any, b: any) => b.reviews - a.reviews);
    }
    return list;
  }, [q, sort, minP, maxP, countries, cats, mats, fast, fair, cert]);

  const activeCount = countries.size + cats.size + mats.size + (fast ? 1 : 0) + (fair ? 1 : 0) + (cert ? 1 : 0) + (minP ? 1 : 0) + (maxP ? 1 : 0);

  function reset() {
    setCountries(new Set()); setCats(new Set()); setMats(new Set());
    setFast(false); setFair(false); setCert(false); setMinP(""); setMaxP(""); setQ("");
  }

  const Filters = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-wider">FILTRES</h3>
        {activeCount > 0 && (
          <button onClick={reset} className="text-xs text-primary hover:underline">Réinitialiser ({activeCount})</button>
        )}
      </div>
      <div className="border-b border-border py-4">
        <h4 className="mb-3 text-sm font-semibold">Prix (€)</h4>
        <div className="flex items-center gap-2">
          <input type="number" value={minP} onChange={(e) => setMinP(e.target.value)} placeholder="Min" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <input type="number" value={maxP} onChange={(e) => setMaxP(e.target.value)} placeholder="Max" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
        </div>
      </div>
      <FilterGroup title="Pays" items={countriesList} selected={countries} onToggle={(k) => toggle(countries, k, setCountries)} />
      <FilterGroup title="Catégorie" items={catsList} selected={cats} onToggle={(k) => toggle(cats, k, setCats)} />
      <FilterGroup title="Matière" items={matsList} selected={mats} onToggle={(k) => toggle(mats, k, setMats)} />
      <div className="space-y-2 py-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} className="accent-primary" /> <Truck className="h-4 w-4 text-muted-foreground" /> Livraison rapide</label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={fair} onChange={(e) => setFair(e.target.checked)} className="accent-primary" /> <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Commerce équitable</label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cert} onChange={(e) => setCert(e.target.checked)} className="accent-primary" /> Artisans certifiés</label>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-6">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Marketplace</span>
        </nav>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            {sort === "new" ? (
              <>
                <h1 className="text-3xl font-bold">Nouveautés</h1>
                <p className="mt-1 text-muted-foreground">{filtered.length} nouveaux produits · {countriesList.length} pays · {catsList.length} catégories</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold">Catalogue mondial</h1>
                <p className="mt-1 text-muted-foreground">{filtered.length} sur {allProducts.length} produits · {countriesList.length} pays · {catsList.length} catégories</p>
              </>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 text-sm">
            <div className="flex min-w-[260px] flex-1 items-center overflow-hidden rounded-md border border-border bg-card">
              <Search className="ml-3 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" placeholder="Rechercher produit, artisan, pays..." />
              {q && <button onClick={() => setQ("")} className="px-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent text-sm outline-none">
                <option value="popular">Populaires</option>
                <option value="new">Nouveautés</option>
                <option value="rating">Mieux notés</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
              </select>
            </div>
            <button onClick={() => setDrawerOpen(true)} className="lg:hidden inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"><SlidersHorizontal className="h-4 w-4" /> Filtres {activeCount > 0 && <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">{activeCount}</span>}</button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 lg:grid-cols-[280px_1fr]">
        <aside className="hidden h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-32 lg:block">
          {Filters}
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto bg-card p-5 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Filtres</h3>
                <button onClick={() => setDrawerOpen(false)} className="p-1"><X className="h-5 w-5" /></button>
              </div>
              {Filters}
              <button onClick={() => setDrawerOpen(false)} className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground">Voir {filtered.length} résultats</button>
            </div>
          </div>
        )}

        <div>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-16 text-center">
              <p className="text-muted-foreground">Aucun produit ne correspond à votre recherche.</p>
              <button onClick={reset} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Réinitialiser les filtres</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p: any) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function FilterGroup({ title, items, selected, onToggle }: { title: string; items: string[]; selected: Set<string>; onToggle: (k: string) => void }) {
  return (
    <div className="border-b border-border py-4">
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <div className="max-h-44 space-y-2 overflow-auto pr-1">
        {items.map(i => (
          <label key={i} className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80 hover:text-foreground">
            <input type="checkbox" checked={selected.has(i)} onChange={() => onToggle(i)} className="rounded border-border accent-primary" /> {i}
          </label>
        ))}
      </div>
    </div>
  );
}
