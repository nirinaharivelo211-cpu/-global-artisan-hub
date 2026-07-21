import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "../../../../hooks/use-auth.ts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts, updateProduct, deleteProduct } from "../../../../lib/api/db.server.ts";
import { Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/products/")({
  head: () => ({ meta: [{ title: "Mes produits — TISSAGE" }] }),
  component: MyProducts,
});

function MyProducts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: allProducts, isLoading } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => getProducts({}),
  });

  const myProducts = (allProducts ?? []).filter(
    (p: any) => p.user_id === user?.id || p.artisan === user?.full_name
  );

  async function handleToggle(p: any) {
    try {
      await updateProduct({
        data: { id: p.id, statut: p.statut === "actif" ? "inactif" : "actif" },
      });
      toast.success(`Produit ${p.statut === "actif" ? "désactivé" : "activé"}`);
      qc.invalidateQueries({ queryKey: ["all-products"] });
    } catch {
      toast.error("Erreur");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteProduct({ data: { id } });
      toast.success("Produit supprimé");
      qc.invalidateQueries({ queryKey: ["all-products"] });
    } catch {
      toast.error("Erreur");
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">
        Mes produits ({(myProducts as any[]).length})
      </h2>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Produit</th>
              <th className="text-left">Prix</th>
              <th className="text-left">Statut</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(myProducts as any[]).length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Aucun produit. Cliquez sur "Nouveau" pour en créer un.
                </td>
              </tr>
            ) : (
              (myProducts as any[]).map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.img ?? p.image}
                        alt={p.name}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.category} · {p.country}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="font-semibold">{Number(p.price).toFixed(2)} €</td>
                  <td>
                    <button
                      onClick={() => handleToggle(p)}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.statut !== "inactif"
                          ? "bg-vert/15 text-vert"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.statut !== "inactif" ? "En ligne" : "Masqué"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <Link
                        to="/product/$id"
                        params={{ id: p.id }}
                        className="rounded p-2 hover:bg-muted"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded p-2 hover:bg-muted text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
