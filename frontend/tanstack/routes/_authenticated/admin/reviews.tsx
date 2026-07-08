import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllReviews, deleteReview } from "@/lib/api/db.server";
import { Loader2, Star, Trash2, MessageSquare, Download } from "lucide-react";
import { toast } from "sonner";
import { exportCsv } from "@/lib/csv-export";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({ meta: [{ title: "Avis — Admin TISSAGE" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const qc = useQueryClient();
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => getAllReviews({}),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteReview({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast.success("Avis supprimé"); },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!reviews || reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-muted-foreground">Aucun avis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => exportCsv(reviews, [
            { key: "rating", label: "Note" },
            { key: "product_name", label: "Produit" },
            { key: "user_name", label: "Utilisateur" },
            { key: "comment", label: "Commentaire" },
            { key: "created_at", label: "Date" },
          ], "avis")} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition">
            <Download className="h-3.5 w-3.5" /> Exporter CSV
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Note</th>
                <th className="p-3 text-left">Produit</th>
                <th className="p-3 text-left">Utilisateur</th>
                <th className="p-3 text-left">Commentaire</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" /> {r.rating}/5
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {r.product_image && <img src={r.product_image} className="h-8 w-8 rounded object-cover" />}
                      <span className="text-xs">{r.product_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs">{r.user_name ?? "—"}</td>
                  <td className="p-3 text-xs max-w-xs truncate">{r.comment ?? "—"}</td>
                  <td className="p-3 text-xs">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => { if (confirm("Supprimer cet avis ?")) deleteMut.mutate(r.id); }}
                      className="rounded-md p-1.5 text-rouge hover:bg-rouge/10"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          {reviews.length} avis au total
        </div>
      </div>
    </div>
  );
}
