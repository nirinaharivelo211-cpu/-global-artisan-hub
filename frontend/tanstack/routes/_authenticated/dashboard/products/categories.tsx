import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCategoriesFull,
  getProducts,
} from "../../../../lib/api/db.server.ts";
import { useAuth } from "../../../../hooks/use-auth.ts";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/products/categories"
)({
  head: () => ({ meta: [{ title: "Catégories — TISSAGE" }] }),
  component: ArtisanCategories,
});

function ArtisanCategories() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ["artisan-categories"],
    queryFn: async () => getCategoriesFull({}),
  });

  const { data: allProducts, isLoading: prodLoading } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => getProducts({}),
  });

  const myProducts = (allProducts ?? []).filter(
    (p: any) => p.user_id === user?.id || p.artisan === user?.full_name
  );

  const categoryStats = (categories ?? []).map((cat: any) => {
    const count = myProducts.filter(
      (p: any) => p.category === cat.nom
    ).length;
    return { ...cat, productCount: count };
  });

  const usedCategories = categoryStats.filter((c) => c.productCount > 0);
  const unusedCategories = categoryStats.filter((c) => c.productCount === 0);

  if (catLoading || prodLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Mes catégories</h2>
        <p className="text-sm text-muted-foreground">
          Répartition de vos produits par catégorie
        </p>
      </div>

      {usedCategories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">
            Catégories utilisées
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {usedCategories.map((cat: any) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{cat.nom}</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {cat.productCount} produit{cat.productCount > 1 ? "s" : ""}
                  </span>
                </div>
                {cat.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cat.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {unusedCategories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">
            Catégories disponibles sans produits
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unusedCategories.map((cat: any) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-dashed border-border bg-card/50 p-4 opacity-60"
              >
                <span className="font-medium text-sm">{cat.nom}</span>
                {cat.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cat.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {categoryStats.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          Aucune catégorie disponible.
        </div>
      )}
    </div>
  );
}
