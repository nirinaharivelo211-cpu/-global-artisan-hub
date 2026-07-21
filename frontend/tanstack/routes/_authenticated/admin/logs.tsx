import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getRecentActivity } from "../../../lib/api/db.server";
import { Loader2, Activity, LogIn, ShoppingCart, UserPlus, Download } from "lucide-react";
import { exportCsv } from "../../../lib/csv-export";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  head: () => ({ meta: [{ title: "Activité — Admin TISSAGE" }] }),
  component: LogsPage,
});

const typeIcons: Record<string, typeof LogIn> = {
  session: LogIn,
  order: ShoppingCart,
  user: UserPlus,
};

const typeColors: Record<string, string> = {
  session: "text-info bg-info/10",
  order: "text-primary bg-primary/10",
  user: "text-vert bg-vert/10",
};

function LogsPage() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => getRecentActivity({}),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Activité récente</h2>
        {activities && activities.length > 0 && (
          <button onClick={() => exportCsv(activities, [
            { key: "type", label: "Type" },
            { key: "description", label: "Description" },
            { key: "user_name", label: "Utilisateur" },
            { key: "created_at", label: "Date" },
          ], "activite")} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition">
            <Download className="h-3.5 w-3.5" /> Exporter CSV
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mt-4 space-y-2">
          {(activities ?? []).length > 0 ? (
            (activities ?? []).map((a: any) => {
              const Icon = typeIcons[a.type] ?? Activity;
              const color = typeColors[a.type] ?? "text-muted-foreground bg-muted";
              return (
                <div key={`${a.type}-${a.id}`} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.description}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.user_name ?? a.user_email ?? "—"}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucune activité récente.</p>
          )}
        </div>
      </div>
    </div>
  );
}
