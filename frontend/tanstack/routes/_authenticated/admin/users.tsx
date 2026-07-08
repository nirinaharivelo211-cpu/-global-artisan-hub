import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getUsersPaginated, updateUserRole } from "@/lib/api/db.server";
import { Loader2, Check, X, Search, Users, Download } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { exportCsv } from "@/lib/csv-export";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Utilisateurs — Admin TISSAGE" }] }),
  component: UsersManager,
});

const ROLE_OPTIONS = ["admin", "artisan", "manager", "livreur"];

function UsersManager() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-users-paginated", page, search, roleFilter],
    queryFn: async () => getUsersPaginated({ data: { page, limit: 20, search: search || undefined, roleFilter: roleFilter || undefined } }),
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  async function toggleRole(userId: string, role: string, add: boolean) {
    try {
      await updateUserRole({ data: { userId, role, add } });
      toast.success(`Rôle ${role} ${add ? "ajouté" : "retiré"}`);
      refetch();
    } catch { toast.error("Erreur"); }
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  if (isLoading && !data) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Rechercher un utilisateur..." className="bg-transparent text-sm outline-none w-56" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none">
          <option value="">Tous les rôles</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{total} utilisateur(s)</span>
        {users.length > 0 && (
          <button onClick={() => exportCsv(users, [
            { key: "full_name", label: "Nom" },
            { key: "email", label: "Email" },
            { key: "country", label: "Pays" },
            { key: "is_active", label: "Actif" },
            { key: "created_at", label: "Inscrit le" },
          ], "utilisateurs")} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Nom</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Pays</th>
              <th className="p-3 text-left">Rôles</th>
              <th className="p-3 text-left">Actif</th>
              <th className="p-3 text-left">Inscrit</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucun utilisateur</td></tr>
            ) : (
              users.map((u: any) => {
                const userRoles: string[] = Array.isArray(u.roles) ? u.roles : [];
                return (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3 font-medium">{u.full_name || "—"}</td>
                    <td className="p-3 text-xs">{u.email}</td>
                    <td className="p-3 text-xs">{u.country || "—"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {ROLE_OPTIONS.map((role) => {
                          const has = userRoles.includes(role);
                          return (
                            <button key={role} onClick={() => toggleRole(u.id, role, !has)}
                              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${has ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {has ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />} {role}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${u.is_active ? "bg-vert/10 text-vert" : "bg-rouge/10 text-rouge"}`}>
                        {u.is_active ? "Oui" : "Non"}
                      </span>
                    </td>
                    <td className="p-3 text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-30 hover:bg-muted">Précédent</button>
          <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-30 hover:bg-muted">Suivant</button>
        </div>
      )}
    </div>
  );
}
