import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { getArticles } from "../lib/api/db.server";
import { Calendar, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/blog")({
  head: () => ({ meta: [{ title: "Blog TISSAGE — Histoires, techniques, actualités" }, { name: "description", content: "Articles, histoires d'artisans, techniques de fabrication et actualités du monde artisanal." }] }),
  loader: async () => {
    try {
      const articles = await getArticles();
      if (articles && articles.length > 0) return { articles };
    } catch (e) { console.error("Failed to load blog articles:", e); }
    return { articles: null };
  },
  pendingMinMs: 300,
  pendingComponent: () => <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>,
  component: Blog,
});

function Blog() {
  const { articles } = Route.useLoaderData();

  const list = articles ?? [
    { title: "Le raphia de Madagascar : un savoir-faire millénaire", category: "Techniques", published_at: "2026-06-10", excerpt: "Découvrez l'art ancestral de la vannerie malgache, transmis de génération en génération." },
    { title: "Comment Diallo a doublé son chiffre d'affaires en 6 mois", category: "Histoires", published_at: "2026-06-05", excerpt: "Le sculpteur sénégalais partage son expérience sur TISSAGE et l'export vers l'Europe." },
    { title: "L'IA au service des artisans : 5 cas concrets", category: "IA Tissage", published_at: "2026-05-28", excerpt: "Traduction, SEO, fiches produits : comment l'IA libère du temps aux artisans." },
    { title: "Logistique mutualisée : 40% d'économies sur le fret", category: "Logistique", published_at: "2026-05-20", excerpt: "Le hub TISSAGE permet aux artisans de partager les coûts d'expédition." },
    { title: "La soie sauvage de Fianarantsoa", category: "Techniques", published_at: "2026-05-12", excerpt: "Plongée dans un atelier de tissage traditionnel des hauts plateaux malgaches." },
    { title: "B2B : comment les hôtels de luxe sourcent l'artisanat", category: "B2B", published_at: "2026-05-02", excerpt: "Les nouvelles attentes des grands groupes hôteliers en matière d'authenticité." },
  ];

  function formatDate(d: string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-noir text-creme">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h1 className="text-4xl font-bold md:text-5xl">Le journal <span className="text-gradient-or">TISSAGE</span></h1>
          <p className="mt-3 max-w-2xl text-creme/80">Articles, histoires d'artisans, techniques de fabrication, actualités du monde artisanal.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {list.map((a: any) => (
          <article key={a.title} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-soft">
            <div className="aspect-[16/9] bg-gradient-to-br from-terre/30 to-or/30" />
            <div className="p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">{a.category}</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3" /> {formatDate(a.published_at)}</span>
              </div>
              <h2 className="mt-3 font-display text-lg font-bold leading-tight">{a.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{a.excerpt}</p>
              <a href="#" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Lire l'article <ArrowRight className="h-3.5 w-3.5" /></a>
            </div>
          </article>
        ))}
      </section>
      <SiteFooter />
    </div>
  );
}
