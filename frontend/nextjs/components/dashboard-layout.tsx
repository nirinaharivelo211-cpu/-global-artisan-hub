// @ts-nocheck
"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Truck,
  User,
  BarChart3,
  QrCode,
  UserCheck,
  Tag,
  TruckIcon,
  TrendingUp,
  UserPlus,
  Building2,
  Wallet,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/context/auth-context"
import { useProfile } from "@/context/profile-context"
import { getInitials } from "@/lib/utils"
import NotificationDropdown from "./notification-dropdown"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
  matchPaths?: string[]
}

interface DashboardLayoutProps {
  children: React.ReactNode
  role: "admin" | "manager" | "artisan" | "client" | "livreur"
}

const roleConfig = {
  admin: {
    title: "Admin Dashboard",
    navItems: [
      { name: "Vue d'ensemble", href: "/dashboard/admin", icon: LayoutDashboard },
      { name: "Artisans", href: "/dashboard/admin/artisans", icon: UserCheck },
      { name: "Clients", href: "/dashboard/admin/clients", icon: Users },
      { name: "Managers / Livreurs", href: "/dashboard/admin/users", icon: UserPlus, adminOnly: true },
      { name: "Catégories", href: "/dashboard/admin/categories", icon: Tag },
      { name: "Produits", href: "/dashboard/admin/products", icon: Package },
      { name: "Hubs", href: "/dashboard/admin/hubs", icon: Building2 },
      { name: "Commandes", href: "/dashboard/admin/orders", icon: ShoppingCart },
      { name: "Paiements", href: "/dashboard/admin/paiements", icon: CreditCard },
      { name: "Profil", href: "/dashboard/admin/profile", icon: User },
    ],
  },
  manager: {
    title: "Manager Dashboard",
    navItems: [
      { name: "Vue d'ensemble", href: "/dashboard/admin", icon: LayoutDashboard },
      { name: "Produits", href: "/dashboard/admin/products", icon: Package },
      { name: "Commandes", href: "/dashboard/admin/orders", icon: ShoppingCart },
      { name: "Paiements", href: "/dashboard/admin/paiements", icon: CreditCard },
      { name: "Profil", href: "/dashboard/admin/profile", icon: User },
    ],
  },
  artisan: {
    title: "Tableau de bord",
    navItems: [
      { name: "Vue d'ensemble", href: "/dashboard/artisan", icon: LayoutDashboard },
      { name: "Produits", href: "/dashboard/artisan/products", icon: Package },
      { name: "Commandes", href: "/dashboard/artisan/orders", icon: ShoppingCart },
      { name: "Ventes", href: "/dashboard/artisan/sales", icon: BarChart3 },
      { name: "Revenus", href: "/dashboard/artisan/revenus", icon: Wallet },
      { name: "QR Code", href: "/dashboard/artisan/qr-code", icon: QrCode },
      { name: "Profil", href: "/dashboard/artisan/profile", icon: User },
    ],
  },
  client: {
    title: "Mon Compte",
    navItems: [
      { name: "Vue d'ensemble", href: "/dashboard/client", icon: LayoutDashboard },
      { name: "Commandes", href: "/dashboard/client/orders", icon: ShoppingCart },
      { name: "Profil", href: "/dashboard/client/profile", icon: User },
    ],
  },
  livreur: {
    title: "Tableau de bord Livreur",
    navItems: [
      { name: "Vue d'ensemble", href: "/dashboard/livreur", icon: LayoutDashboard },
      { name: "Livraisons", href: "/dashboard/livreur/deliveries", icon: Truck, matchPaths: ["/dashboard/livreur/finaliser"] },
      { name: "Profil", href: "/dashboard/livreur/profile", icon: User },
    ],
  },
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { user, logout, isLoading } = useAuth()
  const { profile } = useProfile()

  const normalizedRole = role === "admin" && user?.role === "manager" ? "manager" : role
  const config = roleConfig[normalizedRole]

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace("/")
      return
    }
    if (user.role !== role && user.role !== "manager" && role !== "admin") {
      router.replace("/")
      return
    }
  }, [user, role, isLoading])

  // Utiliser l'avatar du profil s'il existe, sinon utiliser celui de l'utilisateur authentifié
  const displayAvatar = profile?.avatar || user?.avatar || "/placeholder-user.jpg"
  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : user ? `${user.firstName} ${user.lastName}` : "User"
  const displayRole = profile?.role || user?.role || role

  const handleLogout = () => {
    logout()
    router.replace("/")
  }

  const NavItems = () => (
    <nav className="space-y-1">
      {config.navItems
        .filter((item: NavItem) => {
          // Hide admin-only items (like "Ajouter un utilisateur") if user is manager
          if (item.adminOnly && user?.role === "manager") {
            return false
          }
          return true
        })
        .map((item) => {
        const isRootDashboard =
          item.href === "/dashboard/admin" ||
          item.href === "/dashboard/artisan" ||
          item.href === "/dashboard/client" ||
          item.href === "/dashboard/livreur"
        const isActive =
          pathname === item.href ||
          (!isRootDashboard && pathname.startsWith(`${item.href}/`)) ||
          (item.matchPaths || []).some((p) => pathname === p || pathname.startsWith(`${p}/`))
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - Sticky */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-card lg:flex flex-col relative overflow-hidden">
        {/* Abstract circles */}
        <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-amber-200/35 pointer-events-none" />
        <div className="absolute top-20 -left-6 h-24 w-24 rounded-full bg-amber-800/18 pointer-events-none" />
        <div className="absolute top-1/2 -right-4 h-16 w-16 rounded-full bg-amber-300/30 pointer-events-none" />

        <div className="flex h-16 items-center justify-center border-b border-border px-6 relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold">E-artisan</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <NavItems />
        </div>

        {/* Logout Button */}
        <div className="border-t border-border p-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center border-b border-border bg-card px-4 lg:px-6 relative overflow-hidden">
          {/* Abstract circles */}
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-amber-200/30 pointer-events-none" />
          <div className="absolute -bottom-6 left-1/4 h-16 w-16 rounded-full bg-amber-800/18 pointer-events-none" />
          {/* Left Section - Mobile Menu + Welcome Text */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-card overflow-hidden">
                <SheetTitle className="h-0 w-0 overflow-hidden opacity-0">Menu de navigation</SheetTitle>
                <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-amber-200/35 pointer-events-none" />
                <div className="absolute top-20 -left-6 h-24 w-24 rounded-full bg-amber-800/18 pointer-events-none" />

                <div className="flex h-16 items-center justify-center border-b border-border px-6">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <span className="font-serif text-xl font-bold">E-artisan</span>
                  </Link>
                </div>
                <div className="p-4">
                  <NavItems />
                </div>
              </SheetContent>
            </Sheet>

            {/* Welcome Text - Desktop Only */}
            <div className="hidden lg:block">
              <span className="text-base font-medium text-foreground">
                Bienvenue {user ? `${user.firstName} ${user.lastName}` : ''}
              </span>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right Section - Notifications + Profile */}
          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={displayAvatar} />
                    <AvatarFallback className="bg-gradient-to-br from-amber-700 to-amber-950 text-white">
                      {user ? getInitials(user.firstName, user.lastName) : getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:block">
                    {displayName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{displayRole}</p>
              </div>
              <DropdownMenuSeparator />
              {role === "client" && (
                <DropdownMenuItem asChild>
                  <Link href="/">Retour au catalogue</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full min-w-0 overflow-hidden overflow-y-auto p-4 lg:p-6 bg-white">{children}</main>
      </div>
    </div>
  )
}

