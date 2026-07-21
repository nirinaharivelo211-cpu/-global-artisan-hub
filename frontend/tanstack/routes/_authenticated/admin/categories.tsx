import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategoriesFull, createCategory, updateCategory, deleteCategory } from "../../../lib/api/db.server";
import { Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "Catégories — Admin TISSAGE" }] }),
  component: AdminCategories,
});

function AdminCategories() {
  const qc = useQueryClient();
  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => getCategoriesFull({}),
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [newDesc, setNewDesc] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newNom.trim()) return;
    try {
      await createCategory({ data: { nom: newNom, description: newDesc } });
      toast.success("Catégorie créée");
      setShowAdd(false); setNewNom(""); setNewDesc("");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch { toast.error("Erreur"); }
  }

  async function handleSave(id: string) {
    try {
      await updateCategory({ data: { id, nom: editNom, description: editDesc } });
      toast.success("Catégorie mise à jour");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch { toast.error("Erreur"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette catégorie ?")) return;
    try {
      await deleteCategory({ data: { id } });
      toast.success("Catégorie supprimée");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch { toast.error("Erreur"); }
  }

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Ajouter une catégorie
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-3">
          <label className="block"><span className="text-xs font-medium text-muted-foreground">Nom</span>
            <input value={newNom} onChange={(e) => setNewNom(e.target.value)} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <label className="block sm:col-span-2"><span className="text-xs font-medium text-muted-foreground">Description</span>
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:col-span-3">Créer</button>
        </form>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr><th className="p-3 text-left">Nom</th><th className="text-left">Description</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody>
            {(categories ?? []).length === 0 ? (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Aucune catégorie</td></tr>
            ) : (
              (categories as any[]).map((c) => (
                <tr key={c.id} className="border-t border-border">
                  {editing === c.id ? (
                    <>
                      <td className="p-3"><input value={editNom} onChange={(e) => setEditNom(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1 text-sm outline-none" /></td>
                      <td><input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1 text-sm outline-none" /></td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => handleSave(c.id)} className="rounded p-2 hover:bg-muted text-vert"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setEditing(null)} className="rounded p-2 hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 font-medium">{c.nom}</td>
                      <td className="text-xs text-muted-foreground">{c.description || "—"}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => { setEditing(c.id); setEditNom(c.nom); setEditDesc(c.description ?? ""); }} className="rounded p-2 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(c.id)} className="rounded p-2 hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
