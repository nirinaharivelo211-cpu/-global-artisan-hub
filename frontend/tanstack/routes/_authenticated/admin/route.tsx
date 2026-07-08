import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { ADMIN_TABS } from "@/lib/menu.config";
import { ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("tissage_token") : null;
    if (token) {
      const result = await getCurrentUser({ data: { token } });
      if (result?.roles?.includes("admin")) return {};
    }
  },
  head: () => ({ meta: [{ title: "Admin — TISSAGE" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useAuth();
  const { data: roles, isLoading } = useRoles(user);
  const location = useLocation();
  const isAdmin = roles?.includes("admin");

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mt-8 rounded-2xl border border-rouge/30 bg-rouge/5 p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-rouge" />
          <p className="mt-4 font-semibold">Accès réservé aux administrateurs.</p>
          <p className="mt-1 text-sm text-muted-foreground">Demandez à un admin de vous accorder ce rôle.</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold">Console d'administration</h1>
      <p className="mt-1 text-muted-foreground">Gestion complète de la plateforme TISSAGE.</p>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {ADMIN_TABS.map(({ id, label, icon: Icon }) => {
            const tabPath = id === "/_authenticated/admin" || id === "/_authenticated/admin/"
              ? "/admin"
              : "/" + id.replace("/_authenticated/", "");
            const isActive = location.pathname === tabPath;
            return (
              <Link
                key={id}
                to={id}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition ${isActive ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-muted"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
  );
}
