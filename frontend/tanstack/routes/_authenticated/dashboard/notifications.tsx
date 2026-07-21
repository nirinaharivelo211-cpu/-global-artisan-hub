import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/db.server";
import {
  Bell,
  CheckCheck,
  Loader2,
  Package,
  Truck,
  CreditCard,
  MessageSquare,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/notifications"
)({
  head: () => ({ meta: [{ title: "Notifications — TISSAGE" }] }),
  component: DashboardNotifications,
});

const ICON_MAP: Record<string, any> = {
  bell: Bell,
  commande: Package,
  livraison: Truck,
  paiement: CreditCard,
  produit: Package,
  avis: MessageSquare,
  systeme: ShieldAlert,
  stock: AlertCircle,
};

const COLOR_MAP: Record<string, string> = {
  default: "bg-muted text-foreground",
  success: "bg-vert/10 text-vert",
  destructive: "bg-rouge/10 text-rouge",
  warning: "bg-or/10 text-or",
  info: "bg-terre/10 text-terre",
};

function DashboardNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: notifs, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return getUserNotifications({ data: { userId: user.id } });
    },
  });

  const unreadCount = (notifs ?? []).filter((n: any) => !n.est_lu).length;

  async function handleMarkRead(id: string) {
    setLoadingId(id);
    try {
      await markNotificationRead({ data: { id } });
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    } catch {
      toast.error("Erreur");
    }
    setLoadingId(null);
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead({ data: { userId: user!.id } });
      toast.success("Toutes marquées comme lues");
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
              : "Tout est lu"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            <CheckCheck className="h-4 w-4" /> Tout marquer lu
          </button>
        )}
      </div>

      <div className="space-y-2">
        {(notifs ?? []).length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 h-8 w-8 opacity-40" />
            Aucune notification
          </div>
        ) : (
          (notifs as any[]).map((n: any) => {
            const Icon = ICON_MAP[n.icone] ?? Bell;
            const color = COLOR_MAP[n.couleur ?? "default"];
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition ${
                  !n.est_lu ? "border-l-2 border-l-primary" : ""
                }`}
              >
                <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.titre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(n.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {!n.est_lu && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    disabled={loadingId === n.id}
                    className="shrink-0 rounded p-1.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    {loadingId === n.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Marquer lu"
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
