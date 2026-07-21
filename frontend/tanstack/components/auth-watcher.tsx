import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { Router } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function AuthWatcher({
  queryClient,
  router,
}: {
  queryClient: QueryClient;
  router: Router<any>;
}) {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  return null;
}
