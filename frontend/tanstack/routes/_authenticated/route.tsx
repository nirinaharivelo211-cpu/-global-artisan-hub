import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/api/auth.server";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Try local auth first
    const token = typeof window !== "undefined" ? localStorage.getItem("tissage_token") : null;
    if (token) {
      const result = await getCurrentUser({ data: { token } });
      if (result?.user) {
        return { user: result.user };
      }
      localStorage.removeItem("tissage_token");
    }

    // Fallback to Supabase auth
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </div>
  );
}
