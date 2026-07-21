import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { DASHBOARD_TABS } from "@/lib/menu.config";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — TISSAGE" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user } = useAuth();
  const { data: roles } = useRoles(user);
  const location = useLocation();
  const isArtisan = roles?.includes("artisan");

  const visibleTabs = DASHBOARD_TABS.filter((t) => !t.requires || isArtisan);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Tableau de bord</h1>
            <p className="mt-1 text-muted-foreground">{isArtisan ? "Espace artisan" : "Espace client"} · {user?.email}</p>
          </div>
          {isArtisan && (
            <Link to="/_authenticated/dashboard/products/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Nouveau produit
            </Link>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-border bg-card p-3 h-fit lg:sticky lg:top-32">
            <nav className="space-y-1">
              {visibleTabs.map(({ id, label, icon: Icon }) => {
                const tabPath = id === "/_authenticated/dashboard" || id === "/_authenticated/dashboard/"
                  ? "/dashboard"
                  : "/" + id.replace("/_authenticated/", "");
                const isActive = tabPath === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname === tabPath || location.pathname.startsWith(tabPath + "/");
                return (
                  <Link
                    key={id}
                    to={id}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition ${isActive ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted"}`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-6">
            <Outlet />
          </div>
        </div>
      </div>
  );
}
