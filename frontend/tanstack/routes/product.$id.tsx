import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "../components/site-header.tsx";
import { SiteFooter } from "../components/site-footer.tsx";
import { PRODUCTS } from "../lib/data.ts";
import { getProductById, getProductReviews } from "../lib/api/db.server.ts";
import { ChevronRight, Heart, Share2, ShieldCheck, Truck, Package, Star, Minus, Plus, MapPin, Award, Loader2, User } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAddToCart } from "../hooks/use-cart.ts";
import { useAuth } from "../hooks/use-auth.ts";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    try {
      const product = await getProductById({ data: { id: params.id } });
      if (product) return { product };
    } catch (e) { console.error("Failed to load product:", e); }
    const product = PRODUCTS.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name} — TISSAGE` },
      { name: "description", content: `${loaderData?.product.name} par ${loaderData?.product.artisan} — ${loaderData?.product.country}. Authentique, certifié, livraison internationale.` },
    ],
  }),
  notFoundComponent: () => <div className="p-20 text-center">Produit introuvable. <Link to="/marketplace" className="text-primary underline">Retour au catalogue</Link></div>,
  errorComponent: ({ reset }) => <div className="p-20 text-center"><button onClick={reset} className="text-primary underline">Réessayer</button></div>,
  component: ProductPage,
});

function ProductPage() {
  const navigate = useNavigate();
  const { product: p } = Route.useLoaderData();
  const { user } = useAuth();
  const addToCart = useAddToCart();
  const [qty, setQty] = useState(1);
  const [selectedImg, setSelectedImg] = useState(0);

  const { data: reviews } = useQuery({
    queryKey: ["product-reviews", p.id],
    queryFn: async () => getProductReviews({ data: { productId: p.id } }),
  });

  const gallery = [p.img];

  function handleAdd(buyNow = false) {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/product/${p.id}` } });
      return;
    }
    addToCart.mutate(
      {
        product_id: p.id,
        product_name: p.name,
        product_image: p.img,
        artisan_name: p.artisan,
        unit_price: p.price,
        quantity: qty,
      },
      { onSuccess: () => buyNow && navigate({ to: "/cart" }) },
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-6">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Accueil</Link><ChevronRight className="h-3.5 w-3.5" />
          <Link to="/marketplace" className="hover:text-foreground">{p.category}</Link><ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{p.name}</span>
        </nav>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 lg:grid-cols-[1fr_460px]">
          <div className="grid grid-cols-[80px_1fr] gap-4">
            <div className="flex flex-col gap-2">
              {gallery.map((g, i) => (
                <button key={i} onClick={() => setSelectedImg(i)} className={`aspect-square overflow-hidden rounded-lg border ${selectedImg === i ? "border-primary" : "border-border"}`}>
                  <img src={g} alt="" loading="lazy" width={80} height={80} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="overflow-hidden rounded-2xl bg-card">
              <img src={gallery[selectedImg]} alt={p.name} width={800} height={800} className="h-full w-full object-cover" />
            </div>
          </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/marketplace" className="text-xs font-semibold uppercase tracking-widest text-primary">{p.category}</Link>
            {p.certified && <span className="rounded bg-vert/10 px-2 py-0.5 text-[10px] font-semibold text-vert">CERTIFIÉ</span>}
            {p.isNew && <span className="rounded bg-or px-2 py-0.5 text-[10px] font-semibold text-noir">NOUVEAU</span>}
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-tight">{p.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1 text-or">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.floor(p.rating) ? "fill-or" : ""}`} />)}
            </div>
            <span className="text-muted-foreground">{p.rating} · {p.reviews} avis</span>
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <div className="font-display text-4xl font-bold text-terre">{p.price.toFixed(2)} €</div>
              <p className="text-xs text-muted-foreground">TVA incluse · expédié sous 3 jours</p>
            </div>
            <span className="rounded-full bg-vert/10 px-3 py-1 text-xs font-semibold text-vert">En stock · 12 disponibles</span>
          </div>

          <ul className="mt-5 space-y-1.5 rounded-xl border border-border bg-card p-4 text-sm">
            <li><span className="text-muted-foreground">Matière :</span> {p.material}</li>
            <li><span className="text-muted-foreground">Origine :</span> {p.country}</li>
            <li><span className="text-muted-foreground">Dimensions :</span> 30 cm × 25 cm</li>
            <li><span className="text-muted-foreground">Poids :</span> 480 g</li>
          </ul>

          <div className="mt-5 flex items-center gap-3">
            <div className="inline-flex items-center rounded-md border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-10 w-10 place-items-center hover:bg-muted"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="grid h-10 w-10 place-items-center hover:bg-muted"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={() => handleAdd(false)} disabled={addToCart.isPending} className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {addToCart.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Ajouter au panier
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-md border border-border hover:text-rouge"><Heart className="h-4 w-4" /></button>
            <button className="grid h-10 w-10 place-items-center rounded-md border border-border"><Share2 className="h-4 w-4" /></button>
          </div>
          <button onClick={() => handleAdd(true)} disabled={addToCart.isPending} className="mt-3 w-full rounded-md border border-border bg-card px-5 py-3 font-medium hover:bg-muted disabled:opacity-60">
            Acheter maintenant
          </button>
          {!user && <p className="mt-2 text-center text-xs text-muted-foreground">Connectez-vous pour acheter et être livré.</p>}

          <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-border bg-card p-3"><ShieldCheck className="h-4 w-4 text-terre" /><div className="mt-1 font-semibold">Paiement sécurisé</div><div className="text-muted-foreground">100% protégé</div></div>
            <div className="rounded-lg border border-border bg-card p-3"><Truck className="h-4 w-4 text-terre" /><div className="mt-1 font-semibold">Livraison int.</div><div className="text-muted-foreground">5-10 jours</div></div>
            <div className="rounded-lg border border-border bg-card p-3"><Award className="h-4 w-4 text-terre" /><div className="mt-1 font-semibold">Authentique</div><div className="text-muted-foreground">Certifié</div></div>
          </div>

          <Link to="/artisan/$id" params={{ id: encodeURIComponent(p.artisan) }} className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-or to-terre font-bold text-white">{p.artisan.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}</div>
            <div className="flex-1">
              <div className="font-semibold">{p.artisan}</div>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.country}</div>
            </div>
            <span className="text-sm font-medium text-primary">Voir l'artisan →</span>
          </Link>
        </div>
      </div>

      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-3">
            <article>
              <h2 className="font-display text-xl font-bold">Histoire du produit</h2>
              <p className="mt-3 text-sm text-muted-foreground">Cette pièce est tissée à la main dans la région d'Antananarivo selon une technique traditionnelle malgache transmise de génération en génération. Chaque exemplaire est unique.</p>
            </article>
            <article>
              <h2 className="font-display text-xl font-bold">Histoire de l'artisan</h2>
              <p className="mt-3 text-sm text-muted-foreground">{p.artisan} pratique son art depuis plus de 12 ans, alliant authenticité et modernité.</p>
            </article>
            <article>
              <h2 className="font-display text-xl font-bold">Certificat d'authenticité</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-vert" /> Artisanat d'art Madagascar</li>
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-vert" /> Commerce équitable certifié</li>
                <li className="flex gap-2"><Package className="h-4 w-4 text-terre" /> N° série : TSG-{p.id.toUpperCase()}-2026</li>
              </ul>
            </article>
          </div>
        </div>
          </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h2 className="font-display text-2xl font-bold">Avis clients</h2>
          {reviews && reviews.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-or to-terre text-xs font-bold text-white">
                      {(r.user_name || "A").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{r.user_name || "Client"}</div>
                      <div className="flex items-center gap-1 text-or">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-or" : "fill-none"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {r.comment && <p className="mt-3 text-sm text-muted-foreground">{r.comment}</p>}
                  <p className="mt-2 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Aucun avis pour le moment. Soyez le premier à donner votre avis !</p>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
