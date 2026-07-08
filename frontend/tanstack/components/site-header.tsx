import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Heart, ShoppingCart, Bell, User as UserIcon, Globe, Headphones, ChevronDown, ShieldCheck, Truck, LogOut, Package, LayoutDashboard } from "lucide-react";
import { useAuth, useProfile, useRoles } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { supabase } from "@/integrations/supabase/client";
import { checkDbMode, logoutUser } from "@/lib/api/auth.server";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { MAIN_NAV, type NavItem } from "@/lib/menu.config";
import { getCategoriesFull } from "@/lib/api/db.server";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden>
        <g transform="translate(24 24) rotate(45)">
          <rect x="-16" y="-16" width="32" height="32" fill="none" stroke="var(--or)" strokeWidth="2.5" />
          <path d="M-16 0 L0 -16 L16 0 L0 16 Z" fill="none" stroke="var(--or)" strokeWidth="2.5" />
          <path d="M-10 -10 L10 10 M10 -10 L-10 10" stroke="var(--terre)" strokeWidth="2" />
          <circle cx="0" cy="-16" r="2" fill="var(--or)" />
          <circle cx="0" cy="16" r="2" fill="var(--or)" />
          <circle cx="-16" cy="0" r="2" fill="var(--or)" />
          <circle cx="16" cy="0" r="2" fill="var(--or)" />
        </g>
      </svg>
      <div className="leading-tight">
        <div className={`font-display text-2xl font-bold tracking-[0.22em] ${light ? "text-creme" : "text-foreground"}`}>TISSAGE</div>
        <div className={`text-[10px] tracking-wider ${light ? "text-creme/70" : "text-muted-foreground"}`}>Tisser les savoir-faire, connecter le monde.</div>
      </div>
    </Link>
  );
}



function NavLink({ to, label, exact, search, children }: NavItem & { children?: ReactNode }) {
  return (
    <Link
      to={to}
      search={search}
      className="relative whitespace-nowrap px-4 py-3 text-foreground/75 transition-colors duration-200 hover:text-primary"
      activeProps={{
        className: "relative whitespace-nowrap px-4 py-3 text-primary font-semibold after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
      }}
      activeOptions={{ exact: exact ?? false }}
    >
      {label}{children}
    </Link>
  );
}

function CategoryDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const { data: categories } = useQuery({
    queryKey: ["header-categories"],
    queryFn: async () => getCategoriesFull({}),
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative hidden lg:flex items-stretch">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 border-r border-border bg-muted px-4 text-sm text-foreground/80 hover:bg-muted/70 rounded-l-lg"
      >
        {selected || "Toutes les catégories"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`absolute left-0 top-full z-[100] mt-1 w-56 origin-top-right rounded-xl border border-border bg-popover p-1.5 shadow-soft transition-all duration-200 ease-out ${
          open ? "visible translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => { setSelected(""); setOpen(false); navigate({ to: "/marketplace" }); }}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Toutes les catégories
        </button>
        <div className="my-1 border-t border-border/50" />
        {(categories ?? []).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => { setSelected(cat.nom); setOpen(false); navigate({ to: "/marketplace", search: { q: cat.nom } }); }}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-sm transition hover:bg-muted ${
              selected === cat.nom ? "text-primary font-medium" : "text-foreground/80 hover:text-foreground"
            }`}
          >
            {cat.nom}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile(user);
  const { data: roles } = useRoles(user);
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <Link to="/auth" className="flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary">
        <UserIcon className="h-4 w-4" /> Se connecter
      </Link>
    );
  }

  const isArtisan = roles?.includes("artisan");
  const isAdmin = roles?.includes("admin");
  const isLivreur = roles?.includes("livreur");

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    const mode = (await checkDbMode()).dbMode;
    if (mode === "local") {
      const token = localStorage.getItem("tissage_token");
      if (token) await logoutUser({ data: { token } });
      localStorage.removeItem("tissage_token");
      window.dispatchEvent(new Event("tissage-auth-change"));
    } else {
      await supabase.auth.signOut();
    }
    toast.success("Déconnecté");
    navigate({ to: "/", replace: true });
    setOpen(false);
  }

  const initials = (profile?.full_name || user.email || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-3 text-sm hover:bg-muted">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-or to-terre text-xs font-bold text-white">{initials}</span>
        <span className="hidden max-w-[100px] truncate sm:inline">{profile?.full_name || user.email?.split("@")[0]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-soft">
            <div className="border-b border-border px-4 py-3 text-xs">
              <div className="font-semibold text-foreground">{profile?.full_name || "Mon compte"}</div>
              <div className="truncate text-muted-foreground">{user.email}</div>
            </div>
            <Link to="/orders" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"><Package className="h-4 w-4" /> Mes commandes</Link>
            <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"><UserIcon className="h-4 w-4" /> Mon profil</Link>
            {isArtisan && (
              <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"><LayoutDashboard className="h-4 w-4" /> Tableau de bord</Link>
            )}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"><ShieldCheck className="h-4 w-4" /> Admin</Link>
            )}
            {isLivreur && (
              <Link to="/livreur" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"><Truck className="h-4 w-4" /> Livreur</Link>
            )}
            <button onClick={handleSignOut} className="flex w-full items-center gap-2 border-t border-border px-4 py-2 text-sm text-rouge hover:bg-muted">
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CartButton() {
  const { user } = useAuth();
  const { data: cart } = useCart();
  const count = cart?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <Link to={user ? "/cart" : "/auth"} search={user ? undefined : { redirect: "/cart" }} className="relative flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary">
      <ShoppingCart className="h-4 w-4" /> Panier
      {count > 0 && (
        <span className="absolute -right-3 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-or px-1 text-[10px] font-bold text-noir">{count}</span>
      )}
    </Link>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const { data: roles } = useRoles(user);

  useQuery({
    enabled: !!user,
    queryKey: ["notif-count", user?.id],
    refetchInterval: 30000,
    queryFn: async () => {
      if (!user) return 0;
      try {
        const { getUnreadCount } = await import("@/lib/api/db.server");
        const count = await getUnreadCount({ data: { userId: user.id } });
        setUnread(count as unknown as number);
        return count;
      } catch { return 0; }
    },
  });

  if (!user) return null;

  return (
    <Link to="/notifications" className="relative flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary">
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-rouge px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
      )}
    </Link>
  );
}

export function SiteHeader() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { data: roles } = useRoles(user);
  const showArtisanBtn = !user || !roles?.includes("artisan");

  return (
    <>
      <div className="bg-noir text-creme/85 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2">
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-or" /> Livraison internationale</span>
            <span className="hidden sm:inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-or" /> Paiements sécurisés</span>
            <Link to="/support" className="hidden md:inline-flex items-center gap-1.5 hover:text-or"><Headphones className="h-3.5 w-3.5 text-or" /> Support 24/7</Link>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 hover:text-or"><Globe className="h-3.5 w-3.5" /> Français <ChevronDown className="h-3 w-3" /></button>
            <button className="hidden sm:flex items-center gap-1 hover:text-or">EUR <ChevronDown className="h-3 w-3" /></button>
          </div>
        </div>
      </div>

      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
          <Logo />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/marketplace", search: { q: search } });
            }}
            className="hidden flex-1 items-center md:flex"
          >
            <div className="flex w-full rounded-lg border border-border bg-card shadow-sm">
              <CategoryDropdown />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="search"
                placeholder="Rechercher un produit, un artisan..."
                className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" aria-label="Rechercher" className="bg-primary px-5 text-primary-foreground hover:opacity-90 rounded-r-lg">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
          <nav className="hidden items-center gap-5 lg:flex">
            <button className="flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary"><Heart className="h-4 w-4" /> Favoris</button>
            <NotificationBell />
            <CartButton />
            <UserMenu />
            {showArtisanBtn && (
              <Link to="/auth" className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90">
                Devenir artisan
              </Link>
            )}
          </nav>
        </div>

        <div className="border-t border-border bg-background overflow-visible">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-6 text-sm overflow-visible">
            {MAIN_NAV.map((l, i) => (
              <NavLink key={i} to={l.to} label={l.label} exact={l.exact} search={l.search} />
            ))}
            <div className="ml-auto hidden items-center gap-4 xl:flex">
              <Link to="/logistics" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"><Truck className="h-3.5 w-3.5" /> Logistique</Link>
              {user && (
                <Link to="/orders" className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">Mes commandes</Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
