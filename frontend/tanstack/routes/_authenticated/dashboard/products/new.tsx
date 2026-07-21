import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../../../hooks/use-auth.ts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts, createProduct, getCategoriesFull } from "../../../../lib/api/db.server.ts";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/products/new")({
  head: () => ({ meta: [{ title: "Nouveau produit — TISSAGE" }] }),
  component: NewProduct,
});

function NewProduct() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: categories } = useQuery({
    queryKey: ["artisan-categories"],
    queryFn: async () => getCategoriesFull({}),
  });

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: 0,
    artisan: user?.full_name || "",
    country: "",
    material: "",
    description: "",
    image: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        id: crypto.randomUUID(),
        userId: user?.id ?? "",
      };
      await createProduct({ data: payload });
      toast.success("Produit créé !");
      qc.invalidateQueries({ queryKey: ["all-products"] });
      navigate({ to: "/_authenticated/dashboard/products" });
    } catch {
      toast.error("Erreur lors de la création");
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate({ to: "/_authenticated/dashboard/products" })}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </button>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
      >
        <h2 className="sm:col-span-2 font-display text-lg font-bold">
          Nouveau produit
        </h2>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Nom du produit
          </span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Catégorie
          </span>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="">Choisir une catégorie</option>
            {(categories ?? []).map((c: any) => (
              <option key={c.id} value={c.nom}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Prix (€)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            required
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Nom de l'atelier
          </span>
          <input
            value={form.artisan}
            onChange={(e) => setForm({ ...form, artisan: e.target.value })}
            required
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Pays</span>
          <input
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            required
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Matière
          </span>
          <input
            value={form.material}
            onChange={(e) => setForm({ ...form, material: e.target.value })}
            required
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">
            Description
          </span>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">
            URL de l'image
          </span>
          <input
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <div className="sm:col-span-2 flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Publier le produit
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/_authenticated/dashboard/products" })}
            className="rounded-md border border-border px-6 py-2.5 text-sm"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
