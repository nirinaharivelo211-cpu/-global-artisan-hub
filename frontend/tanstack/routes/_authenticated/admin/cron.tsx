import { createFileRoute } from "@tanstack/react-router";
import { runCronAutoCancelUnpaid, runCronReactivateProducts, runCronReactivateUsers, runCronLowStock } from "@/lib/api/db.server";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cron")({
  head: () => ({ meta: [{ title: "Tâches auto. — Admin TISSAGE" }] }),
  component: CronJobs,
});

function CronJobs() {
  const [running, setRunning] = useState<string | null>(null);

  async function runJob(name: string, fn: () => Promise<any>) {
    setRunning(name);
    try {
      const result = await fn();
      toast.success(`${name}: ${JSON.stringify(result)}`);
    } catch { toast.error(`Erreur ${name}`); }
    finally { setRunning(null); }
  }

  const jobs = [
    { id: "cancel", label: "Annuler commandes impayées", desc: "Rappel J+2, annulation J+5", color: "bg-rouge/10 text-rouge", fn: () => runCronAutoCancelUnpaid({}) },
    { id: "reactivate-products", label: "Réactiver produits suspendus", desc: "Produits suspendus depuis >5 jours", color: "bg-vert/10 text-vert", fn: () => runCronReactivateProducts({}) },
    { id: "reactivate-users", label: "Réactiver utilisateurs suspendus", desc: "Utilisateurs suspendus depuis >7 jours", color: "bg-vert/10 text-vert", fn: () => runCronReactivateUsers({}) },
    { id: "low-stock", label: "Vérifier stocks faibles", desc: "Notifier artisans des stocks sous seuil", color: "bg-or/10 text-or", fn: () => runCronLowStock({}) },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Tâches automatisées (cron)</h2>
      <p className="text-sm text-muted-foreground">Exécutez manuellement les tâches cron de la plateforme. Normalement automatisées via un scheduler externe.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {jobs.map((j) => (
          <div key={j.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{j.label}</h3>
                <p className="text-xs text-muted-foreground">{j.desc}</p>
              </div>
              <button onClick={() => runJob(j.id, j.fn)} disabled={running === j.id} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${j.color} disabled:opacity-50`}>
                {running === j.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                {running === j.id ? "En cours..." : "Exécuter"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
