import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/lib/api/db.server";
import { Loader2, Plus, Eye, Pencil, Trash2, X, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/products")({
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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "", price: 0, artisan: "", country: "", material: "", description: "", image: "" });

  const myProducts = (allProducts ?? []).filter((p: any) => p.user_id === user?.id || p.artisan === user?.full_name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProduct({ data: { id: editingId, ...form } });
        toast.success("Produit modifié !");
      } else {
        const payload = { ...form, id: crypto.randomUUID(), userId: user?.id ?? "" };
        await createProduct({ data: payload });
        toast.success("Produit créé !");
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", category: "", price: 0, artisan: "", country: "", material: "", description: "", image: "" });
      qc.invalidateQueries({ queryKey: ["all-products"] });
    } catch { toast.error("Erreur"); }
  }

  function startEdit(p: any) {
    setForm({ name: p.name, category: p.category, price: p.price, artisan: p.artisan, country: p.country, material: p.material, description: p.description || "", image: p.image || "" });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function handleToggle(p: any) {
    try {
      await updateProduct({ data: { id: p.id, statut: p.statut === "actif" ? "inactif" : "actif" } });
      toast.success(`Produit ${p.statut === "actif" ? "désactivé" : "activé"}`);
      qc.invalidateQueries({ queryKey: ["all-products"] });
    } catch { toast.error("Erreur"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteProduct({ data: { id } });
      toast.success("Produit supprimé");
      qc.invalidateQueries({ queryKey: ["all-products"] });
    } catch { toast.error("Erreur"); }
  }

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Mes produits ({(myProducts as any[]).length})</h2>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center justify-between">
            <h3 className="font-semibold">{editingId ? "Modifier le produit" : "Nouveau produit"}</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <label className="block"><span className="text-xs font-medium text-muted-foreground">Nom du produit</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block"><span className="text-xs font-medium text-muted-foreground">Catégorie</span>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block"><span className="text-xs font-medium text-muted-foreground">Prix (€)</span>
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block"><span className="text-xs font-medium text-muted-foreground">Artisan</span>
            <input value={form.artisan} onChange={(e) => setForm({ ...form, artisan: e.target.value })} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block"><span className="text-xs font-medium text-muted-foreground">Pays</span>
            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block"><span className="text-xs font-medium text-muted-foreground">Matière</span>
            <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block sm:col-span-2"><span className="text-xs font-medium text-muted-foreground">Description</span>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Publier</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2 text-sm">Annuler</button>
          </div>
        </form>
      )}

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
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucun produit. Cliquez sur Ajouter.</td></tr>
            ) : (
              (myProducts as any[]).map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.img ?? p.image} alt={p.name} className="h-12 w-12 rounded-md object-cover" />
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.category} · {p.country}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-semibold">{Number(p.price).toFixed(2)} €</td>
                  <td>
                    <button onClick={() => handleToggle(p)} className={`rounded-full px-2 py-0.5 text-xs ${p.statut !== "inactif" ? "bg-vert/15 text-vert" : "bg-muted text-muted-foreground"}`}>
                      {p.statut !== "inactif" ? "En ligne" : "Masqué"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <Link to="/product/$id" params={{ id: p.id }} className="rounded p-2 hover:bg-muted"><Eye className="h-4 w-4" /></Link>
                      <button onClick={() => startEdit(p)} className="rounded p-2 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="rounded p-2 hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
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
