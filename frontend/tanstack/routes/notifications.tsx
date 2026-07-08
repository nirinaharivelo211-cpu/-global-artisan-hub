import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { checkDbMode } from "@/lib/api/auth.server";
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api/db.server";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck, Loader2, Package, Truck, CreditCard, MessageSquare, ShieldAlert, Info, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — TISSAGE" }] }),
  component: NotificationsPage,
});

const ICON_MAP: Record<string, any> = {
  bell: Bell, commande: Package, livraison: Truck, paiement: CreditCard,
  produit: Package, avis: MessageSquare, systeme: ShieldAlert, stock: AlertCircle,
};

const COLOR_MAP: Record<string, string> = {
  default: "bg-muted text-foreground",
  success: "bg-vert/10 text-vert",
  destructive: "bg-rouge/10 text-rouge",
  warning: "bg-or/10 text-or",
  info: "bg-terre/10 text-terre",
};

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: notifs, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const mode = (await checkDbMode()).dbMode;
      if (mode === "local") {
        return (await getUserNotifications({ data: { userId: user.id } })) as any[];
      }
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleMarkRead(id: string) {
    setLoadingId(id);
    try {
      await markNotificationRead({ data: { id } });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notif-count"] });
    } catch { toast.error("Erreur"); }
    setLoadingId(null);
  }

  async function handleMarkAllRead() {
    if (!user) return;
    try {
      await markAllNotificationsRead({ data: { userId: user.id } });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notif-count"] });
      toast.success("Toutes les notifications marquées comme lues");
    } catch { toast.error("Erreur"); }
  }

  const unreadCount = notifs?.filter((n: any) => !n.est_lu).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Notifications</h1>
            <p className="mt-1 text-muted-foreground">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !notifs || notifs.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Aucune notification pour le moment.</p>
            <Link to="/marketplace" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Découvrir le catalogue
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-2">
            {notifs.map((n: any) => {
              const Icon = ICON_MAP[n.icone] ?? Bell;
              const color = COLOR_MAP[n.couleur] ?? "bg-muted text-foreground";
              return (
                <li key={n.id} className={`rounded-xl border p-4 transition ${n.est_lu ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold">{n.titre}</h3>
                          {n.message && <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          </span>
                          {!n.est_lu && (
                            <button onClick={() => handleMarkRead(n.id)} disabled={loadingId === n.id} className="rounded-md p-1.5 text-xs text-muted-foreground hover:bg-muted" title="Marquer comme lu">
                              {loadingId === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                      {n.lien && (
                        <Link to={n.lien as any} className="mt-1 inline-block text-xs text-primary underline">Voir les détails</Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
