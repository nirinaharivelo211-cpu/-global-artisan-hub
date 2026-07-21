import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "../../../../hooks/use-auth.ts";
import { Box, Plus, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/products")({
  head: () => ({ meta: [{ title: "Mes produits — TISSAGE" }] }),
  component: ProductsLayout,
});

const PRODUCT_SUB_TABS = [
  { to: "/_authenticated/dashboard/products", label: "Liste", icon: Box, exact: true },
  { to: "/_authenticated/dashboard/products/new", label: "Nouveau", icon: Plus },
  { to: "/_authenticated/dashboard/products/categories", label: "Catégories", icon: Layers },
];

function ProductsLayout() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        {PRODUCT_SUB_TABS.map(({ to, label, icon: Icon, exact }) => {
          const tabPath = to === "/_authenticated/dashboard/products"
            ? "/dashboard/products"
            : "/" + to.replace("/_authenticated/", "");
          const isActive = exact
            ? location.pathname === tabPath
            : location.pathname.startsWith(tabPath);
          return (
            <Link
              key={to}
              to={to}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
