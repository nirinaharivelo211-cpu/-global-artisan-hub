import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "../components/site-header.tsx";
import { SiteFooter } from "../components/site-footer.tsx";
import { ARTISANS, COUNTRIES } from "../lib/data.ts";
import { getArtisans } from "../lib/api/db.server.ts";
import { ChevronRight, MapPin, Star, Search, X } from "lucide-react";

export const Route = createFileRoute("/artisans")({
  head: () => ({ meta: [{ title: "Artisans — TISSAGE" }, { name: "description", content: "Découvrez les artisans certifiés de Madagascar, du Sénégal, du Maroc, du Kenya et d'ailleurs." }] }),
  loader: async () => {
    try {
      const artisans = await getArtisans();
      if (artisans && artisans.length > 0) {
        const countries = [...new Set(artisans.map((a: any) => a.country))].sort() as string[];
        return { artisans, countries };
      }
    } catch (e) { console.error("Failed to load artisans:", e); }
    return { artisans: ARTISANS, countries: COUNTRIES };
  },
  pendingMinMs: 300,
  pendingComponent: () => <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>,
  component: Artisans,
});

function Artisans() {
  const { artisans: listSource, countries } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [certifiedOnly, setCertifiedOnly] = useState(false);

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return listSource.filter((a: any) => {
      if (ql && !`${a.name} ${a.specialty} ${a.country} ${a.city}`.toLowerCase().includes(ql)) return false;
      if (country && a.country !== country) return false;
      if (certifiedOnly && !a.certified) return false;
      return true;
    });
  }, [q, country, certifiedOnly]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-6">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" /><span className="text-foreground">Artisans</span>
        </nav>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Nos artisans</h1>
            <p className="mt-1 text-muted-foreground">{list.length} sur {listSource.length} artisans vérifiés · {countries.length} pays</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-full max-w-md items-center overflow-hidden rounded-lg border border-border bg-card">
              <Search className="ml-3 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" placeholder="Nom, spécialité, ville..." />
              {q && <button onClick={() => setQ("")} className="px-2"><X className="h-4 w-4 text-muted-foreground" /></button>}
            </div>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
              <option value="">Tous les pays</option>
              {countries.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
              <input type="checkbox" checked={certifiedOnly} onChange={(e) => setCertifiedOnly(e.target.checked)} className="accent-primary" /> Certifiés
            </label>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 md:grid-cols-2 lg:grid-cols-3">
        {list.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
            Aucun artisan trouvé.
          </div>
        ) : list.map((a: any) => (
          <Link key={a.id} to="/artisan/$id" params={{ id: a.id }} className="group rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-soft">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-or to-terre font-display text-xl font-bold text-white">
                {a.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold">{a.name}</h3>
                <p className="text-sm text-muted-foreground">{a.specialty}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {a.city}, {a.country}</p>
              </div>
              {a.certified && <span className="rounded-full bg-vert/10 px-2 py-1 text-[10px] font-semibold text-vert">CERTIFIÉ</span>}
            </div>
            <div className="mt-5 flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-or text-or" /> {a.rating}
              <span className="text-muted-foreground">({a.reviews} avis)</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-background p-3 text-center text-xs">
              <div><div className="font-display text-base font-bold">{a.products}</div><div className="text-muted-foreground">Produits</div></div>
              <div className="border-x border-border"><div className="font-display text-base font-bold">{a.experience} ans</div><div className="text-muted-foreground">Expérience</div></div>
              <div><div className="font-display text-base font-bold">{a.reviews}</div><div className="text-muted-foreground">Avis</div></div>
            </div>
          </Link>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}
