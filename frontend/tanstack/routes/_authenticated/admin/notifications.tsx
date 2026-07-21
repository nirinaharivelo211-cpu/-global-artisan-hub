import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllNotificationsAdmin, sendBulkNotification } from "../../../lib/api/db.server";
import { Loader2, Bell, Send, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Admin TISSAGE" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [titre, setTitre] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("");

  const { data: notifs, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => getAllNotificationsAdmin({}),
  });

  const sendMut = useMutation({
    mutationFn: async () => sendBulkNotification({ data: { titre, message, targetRole: targetRole || undefined } }),
    onSuccess: (res: any) => {
      toast.success(`Notification envoyée à ${res.count} utilisateur(s)`);
      setShowForm(false); setTitre(""); setMessage(""); setTargetRole("");
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: () => toast.error("Erreur d'envoi"),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Gestion des notifications</h2>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Send className="h-4 w-4" /> {showForm ? "Fermer" : "Envoyer une notification"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-base font-bold">Nouvelle notification broadcast</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Titre *</label>
              <input value={titre} onChange={e => setTitre(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="Titre de la notification" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none" rows={3} placeholder="Message..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cibler un rôle (optionnel)</label>
              <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
                <option value="">Tous les utilisateurs</option>
                <option value="client">Clients</option>
                <option value="artisan">Artisans</option>
                <option value="livreur">Livreurs</option>
                <option value="admin">Administrateurs</option>
                <option value="manager">Managers</option>
              </select>
            </div>
            <button onClick={() => sendMut.mutate()} disabled={!titre || sendMut.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Statut</th>
                <th className="p-3 text-left">Titre</th>
                <th className="p-3 text-left">Message</th>
                <th className="p-3 text-left">Destinataire</th>
                <th className="p-3 text-left">Catégorie</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {(notifs ?? []).map((n: any) => (
                <tr key={n.id} className="border-t border-border">
                  <td className="p-3">
                    {n.est_lu
                      ? <Check className="h-4 w-4 text-vert" />
                      : <X className="h-4 w-4 text-muted-foreground" />}
                  </td>
                  <td className="p-3 text-xs font-medium">{n.titre}</td>
                  <td className="p-3 text-xs max-w-xs truncate">{n.message ?? "—"}</td>
                  <td className="p-3 text-xs">{n.user_name ?? n.user_email ?? "—"}</td>
                  <td className="p-3 text-xs"><span className="rounded bg-muted px-2 py-0.5 text-xs">{n.categorie}</span></td>
                  <td className="p-3 text-xs">{new Date(n.created_at).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!notifs || notifs.length === 0) && (
          <div className="p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">Aucune notification</p>
          </div>
        )}
      </div>
    </div>
  );
}
