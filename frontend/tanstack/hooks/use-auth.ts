import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/api/auth.server";

export type AppRole = "client" | "artisan" | "admin" | "manager" | "livreur";

type LocalUser = {
  id: string;
  email: string;
  full_name: string;
};

type LocalSession = {
  user: LocalUser;
  roles: AppRole[];
};

let dbModeCache: "local" | "supabase" | null = null;

async function getDbMode(): Promise<"local" | "supabase"> {
  if (dbModeCache) return dbModeCache;
  try {
    const { checkDbMode } = await import("@/lib/api/auth.server");
    const res = await checkDbMode();
    dbModeCache = res.dbMode;
    return res.dbMode;
  } catch {
    return "supabase";
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [localSession, setLocalSession] = useState<LocalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"local" | "supabase">("supabase");

  useEffect(() => {
    getDbMode().then((m) => {
      setMode(m);
      if (m === "local") {
        const token = localStorage.getItem("tissage_token");
        if (token) {
          getCurrentUser({ data: { token } })
            .then((result) => {
              if (result) setLocalSession(result as LocalSession);
              setLoading(false);
            })
            .catch(() => setLoading(false));
        } else {
          setLoading(false);
        }
      } else {
        try {
          const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            setLoading(false);
          });
          supabase.auth.getSession().then(({ data }) => {
            if (data) setSession(data.session);
            setLoading(false);
          }).catch(() => setLoading(false));
          return () => sub.subscription.unsubscribe();
        } catch {
          setLoading(false);
        }
      }
    });
  }, []);

  // Listen for local auth changes
  useEffect(() => {
    if (mode !== "local") return;
    function onChange() {
      const token = localStorage.getItem("tissage_token");
      if (!token) {
        setLocalSession(null);
        return;
      }
      getCurrentUser({ data: { token } })
        .then((result) => setLocalSession(result as LocalSession))
        .catch(() => setLocalSession(null));
    }
    window.addEventListener("tissage-auth-change", onChange);
    return () => window.removeEventListener("tissage-auth-change", onChange);
  }, [mode]);

  if (mode === "local") {
    return {
      session: null,
      user: localSession?.user
        ? ({ id: localSession.user.id, email: localSession.user.email, user_metadata: { full_name: localSession.user.full_name } } as User)
        : null,
      loading,
    };
  }

  return { session, user: session?.user ?? null, loading };
}

export function useProfile(user: User | null) {
  return useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Try local DB first
      const { checkDbMode } = await import("@/lib/api/auth.server");
      const mode = await checkDbMode();
      if (mode.dbMode === "local") {
        const token = localStorage.getItem("tissage_token");
        if (!token) return null;
        const result = await getCurrentUser({ data: { token } });
        if (result) {
          return {
            id: result.user.id,
            full_name: result.user.full_name,
            email: result.user.email,
            roles: result.roles,
          };
        }
        return null;
      }
      // Fallback to Supabase
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRoles(user: User | null) {
  return useQuery({
    enabled: !!user,
    queryKey: ["roles", user?.id],
    queryFn: async () => {
      if (!user) return [] as AppRole[];
      const { checkDbMode } = await import("@/lib/api/auth.server");
      const mode = await checkDbMode();
      if (mode.dbMode === "local") {
        const token = localStorage.getItem("tissage_token");
        if (!token) return [];
        const result = await getCurrentUser({ data: { token } });
        return (result?.roles as AppRole[]) ?? ["client"];
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}
