import type { ComponentType } from "react";
import {
  TrendingUp, BarChart3, Users, ShoppingCart, Package, Layers,
  MapPin, Truck, CreditCard, MessageSquare, Bell, Activity, Clock,
  Box, Tag, Building2, Settings, ClipboardCheck,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  exact?: boolean;
  search?: Record<string, string>;
  hasSubmenu?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  requires?: string;
}

export interface FooterLink {
  label: string;
  to: string;
  search?: Record<string, string>;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const MAIN_NAV: NavItem[] = [
  { to: "/", label: "Accueil", exact: true },
  { to: "/marketplace", label: "Produits" },
  { to: "/artisans", label: "Artisans" },
  { to: "/b2b", label: "B2B" },
  { to: "/tourism", label: "Tourisme" },
  { to: "/about", label: "À propos" },
  { to: "/contact", label: "Contact" },
];



export const ADMIN_TABS: TabItem[] = [
  { id: "/_authenticated/admin", label: "Tableau de bord", icon: TrendingUp },
  { id: "/_authenticated/admin/analytics", label: "Analytiques", icon: BarChart3 },
  { id: "/_authenticated/admin/users", label: "Utilisateurs", icon: Users },
  { id: "/_authenticated/admin/orders", label: "Commandes", icon: ShoppingCart },
  { id: "/_authenticated/admin/products", label: "Produits", icon: Package },
  { id: "/_authenticated/admin/categories", label: "Catégories", icon: Layers },
  { id: "/_authenticated/admin/hubs", label: "Hubs", icon: MapPin },
  { id: "/_authenticated/admin/shipping", label: "Livraisons", icon: Truck },
  { id: "/_authenticated/admin/paiements", label: "Paiements", icon: CreditCard },
  { id: "/_authenticated/admin/reviews", label: "Avis", icon: MessageSquare },
  { id: "/_authenticated/admin/notifications", label: "Notifications", icon: Bell },
  { id: "/_authenticated/admin/logs", label: "Activité", icon: Activity },
  { id: "/_authenticated/admin/cron", label: "Tâches auto.", icon: Clock },
];

export const DASHBOARD_TABS: TabItem[] = [
  { id: "/_authenticated/dashboard", label: "Vue d'ensemble", icon: BarChart3 },
  { id: "/_authenticated/dashboard/orders", label: "Commandes", icon: ShoppingCart },
  { id: "/_authenticated/dashboard/products", label: "Mes produits", icon: Box, requires: "artisan" },
  { id: "/_authenticated/dashboard/promotions", label: "Promotions", icon: Tag, requires: "artisan" },
  { id: "/_authenticated/dashboard/shipping", label: "Livraison", icon: Truck, requires: "artisan" },
  { id: "/_authenticated/dashboard/payouts", label: "Paiements", icon: CreditCard, requires: "artisan" },
  { id: "/_authenticated/dashboard/b2b", label: "Espace B2B", icon: Building2 },
  { id: "/_authenticated/dashboard/settings", label: "Paramètres", icon: Settings },
];

export const LIVREUR_TABS: TabItem[] = [
  { id: "/_authenticated/livreur", label: "Vue d'ensemble", icon: Truck },
  { id: "/_authenticated/livreur/finaliser", label: "Finaliser livraison", icon: ClipboardCheck },
];

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Marketplace",
    links: [
      { label: "Catégories", to: "/marketplace", search: { q: "" } },
      { label: "Artisans", to: "/artisans" },
      { label: "Nouveautés", to: "/marketplace", search: { sort: "new" } },
      { label: "Collections", to: "/marketplace" },
      { label: "Acheter en B2B", to: "/b2b" },
    ],
  },
  {
    title: "Artisans",
    links: [
      { label: "Devenir artisan", to: "/auth" },
      { label: "Tableau de bord", to: "/dashboard" },
      { label: "IA Tissage", to: "/ai" },
      { label: "Tarification", to: "/pricing" },
    ],
  },
  {
    title: "Logistique",
    links: [
      { label: "Hub logistique", to: "/logistics" },
      { label: "Suivi colis", to: "/logistics" },
      { label: "Documents douaniers", to: "/logistics" },
      { label: "Transporteurs", to: "/logistics" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", to: "/about" },
      { label: "Blog", to: "/blog" },
      { label: "Contact", to: "/contact" },
      { label: "Tourisme artisanal", to: "/tourism" },
      { label: "Support", to: "/support" },
    ],
  },
];
