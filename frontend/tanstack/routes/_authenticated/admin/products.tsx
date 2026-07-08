import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProductsPaginated, deleteProduct, updateProduct, getCategoriesFull } from "@/lib/api/db.server";
import { Loader2, Search, Package, Eye, Trash2, Star, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportCsv } from "@/lib/csv-export";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({ meta: [{ title: "Produits — Admin TISSAGE" }] }),
  component: AdminProducts,
});

function AdminProducts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products-paginated", page, search, filterCat, sort],
    queryFn: async () => getProductsPaginated({ data: { page, limit: 20, search: search || undefined, filterCat: filterCat || undefined, sort: sort as any } }),
  });
  const { data: categories } = useQuery({
    queryKey: ["admin-categories-full"],
    queryFn: async () => getCategoriesFull({}),
  });

  const products = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleCat(v: string) { setFilterCat(v); setPage(1); }
  function handleSort(v: string) { setSort(v); setPage(1); }

  async function handleToggle(p: any) {
    try {
      await updateProduct({ data: { id: p.id, statut: p.statut === "actif" ? "inactif" : "actif" } });
      toast.success(`Produit ${p.statut === "actif" ? "désactivé" : "activé"}`);
      qc.invalidateQueries({ queryKey: ["admin-products-paginated"] });
    } catch { toast.error("Erreur"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteProduct({ data: { id } });
      toast.success("Produit supprimé");
      qc.invalidateQueries({ queryKey: ["admin-products-paginated"] });
    } catch { toast.error("Erreur"); }
  }

  if (isLoading && !data) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Rechercher un produit..." className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <select value={filterCat} onChange={(e) => handleCat(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
          <option value="">Toutes catégories</option>
          {(categories ?? []).map((c: any) => <option key={c.id} value={c.nom}>{c.nom}</option>)}
        </select>
        <select value={sort} onChange={(e) => handleSort(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
          <option value="new">Plus récents</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
          <option value="rating">Meilleure note</option>
          <option value="name">Nom A-Z</option>
        </select>
        <span className="text-xs text-muted-foreground">{total} produit(s)</span>
        {products.length > 0 && (
          <button onClick={() => exportCsv(products, [
            { key: "name", label: "Produit" },
            { key: "artisan", label: "Artisan" },
            { key: "category", label: "Catégorie" },
            { key: "price", label: "Prix" },
            { key: "rating", label: "Note" },
            { key: "statut", label: "Statut" },
          ], "produits")} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Produit</th>
              <th className="p-3 text-left">Artisan</th>
              <th className="p-3 text-left">Catégorie</th>
              <th className="p-3 text-left">Prix</th>
              <th className="p-3 text-left">Note</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Aucun produit trouvé</td></tr>
            ) : (
              products.map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.img ?? p.image} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs">{p.artisan}</td>
                  <td className="p-3 text-xs">{p.category}</td>
                  <td className="p-3 font-semibold">{Number(p.price).toFixed(2)} €</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                      <Star className="h-3 w-3 fill-current" /> {Number(p.rating ?? 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleToggle(p)} className={`rounded-full px-2 py-0.5 text-xs ${p.statut !== "inactif" ? "bg-vert/15 text-vert" : "bg-muted text-muted-foreground"}`}>
                      {p.statut !== "inactif" ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <Link to="/product/$id" params={{ id: p.id }} className="rounded p-2 hover:bg-muted"><Eye className="h-4 w-4" /></Link>
                      <button onClick={() => handleDelete(p.id)} className="rounded p-2 hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{products.length} / {total} produit(s)</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border border-border p-1.5 disabled:opacity-30 hover:bg-muted">Précédent</button>
            <span className="font-medium">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border border-border p-1.5 disabled:opacity-30 hover:bg-muted">Suivant</button>
          </div>
        </div>
      )}
    </div>
  );
}
