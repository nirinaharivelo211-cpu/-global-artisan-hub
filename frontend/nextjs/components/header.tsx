// @ts-nocheck
"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ShoppingBag, Menu, X, User, LogOut, LayoutDashboard, ChevronDown, Home, Package, Info, Phone, ShoppingCart, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCart } from "@/context/cart-context"
import { useAuth } from "@/context/auth-context"
import { useProfile } from "@/context/profile-context"
import { CartSidebar } from "@/components/cart-sidebar"
import NotificationDropdown from "@/components/notification-dropdown"
import { getInitials } from "@/lib/utils"

const navigation = [
  { name: "Accueil", href: "/", icon: Home },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Nous", href: "/about", icon: Info },
  { name: "Contact", href: "/contact", icon: Phone },
]

function AuthNavbar({
  user,
  logout,
  getDashboardPath,
  totalItems,
  setCartOpen,
  displayAvatar,
  displayName,
  displayRole,
  mobile = false,
}: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={displayAvatar} />
            <AvatarFallback className="bg-gradient-to-br from-amber-700 to-amber-950 text-white text-xs">
              {displayName ? getInitials(displayName.split(' ')[0], displayName.split(' ')[1]) : 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{displayName ? displayName.split(' ')[0] : ''}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{displayRole}</p>
            </div>
            {mobile && (
              <div className="flex items-center gap-1">
                <NotificationDropdown />
                <Sheet open={false} onOpenChange={setCartOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-7 w-7" onClick={() => setCartOpen(true)}>
                      <ShoppingBag className="h-4 w-4" />
                      {totalItems > 0 && (
                        <Badge className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center bg-amber-700 text-white">
                          {totalItems}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                </Sheet>
              </div>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={getDashboardPath()} className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Mon tableau de bord
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function GuestNavbar({ totalItems, setCartOpen, handleCartClick }: any) {
  return (
    <div className="flex items-center gap-2">
      <Link href="/login">
        <Button variant="ghost" className="text-sm hidden sm:inline-flex">Se connecter</Button>
        <Button variant="ghost" size="icon" className="inline-flex sm:hidden">
          <User className="h-5 w-5" />
        </Button>
      </Link>
    </div>
  )
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const { totalItems } = useCart()
  const { user, logout, getDashboardPath } = useAuth()
  const { profile } = useProfile()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideInFromLeft {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(0);
        }
      }
      @keyframes slideOutToLeft {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(-100%);
        }
      }
      .sheet-animate-in {
        animation: slideInFromLeft 0.3s ease-out forwards;
      }
      .sheet-animate-out {
        animation: slideOutToLeft 0.3s ease-in forwards;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Utiliser les informations du profile si disponibles, sinon celles de l'utilisateur
  const displayAvatar = profile?.avatar || user?.avatar || "/placeholder-user.jpg"
  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : user ? `${user.firstName} ${user.lastName}` : ""
  const displayRole = profile?.role || user?.role || ""

  // Ouvrir automatiquement le panier si on revient après login avec redirect=/cart
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const redirect = urlParams.get('redirect')
    if (redirect === '/cart' && user) {
      setCartOpen(true)
      // Nettoyer l'URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('redirect')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [user])

  const handleCartClick = () => {
    setCartOpen(true)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-4">
            <Image
              src="https://www.mta.gov.mg/wp-content/uploads/2024/10/cropped-MTA.png"
              alt="E-artisan Logo"
              width={100}
              height={100}
              className="object-contain"
            />
            <span className="font-serif text-2xl font-bold text-foreground hidden sm:inline">E-artisan</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-m-2.5">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open main menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className={`w-full max-w-sm bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 [&>button]:hidden ${mobileMenuOpen ? 'sheet-animate-in' : 'sheet-animate-out'}`}>
              <SheetHeader>
                <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
              </SheetHeader>
              <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="font-serif text-2xl font-bold text-black">E-artisan</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X className="h-6 w-6 text-slate-600" />
                </Button>
              </div>
              <div className="mt-8 flow-root animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                <div className="space-y-6">
                  {/* Navigation principale */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Navigation</p>
                    {navigation.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-all duration-200 ${
                            isActive 
                              ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-sm' 
                              : 'text-black hover:bg-slate-100'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-black'}`} />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>

                  {/* Actions */}
                  <div className="space-y-1 pt-4 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Compte</p>
                    {user ? (
                      <>
                        <Link
                          href={getDashboardPath()}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-black hover:bg-slate-100 transition-all duration-200"
                        >
                          <LayoutDashboard className="h-5 w-5 text-black" />
                          Mon tableau de bord
                        </Link>
                        <button
                          onClick={() => {
                            logout()
                            setMobileMenuOpen(false)
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                        >
                          <LogOut className="h-5 w-5" />
                          Se déconnecter
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/cart"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-black hover:bg-slate-100 transition-all duration-200"
                        >
                          <ShoppingCart className="h-5 w-5 text-black" />
                          Panier
                          {totalItems > 0 && (
                            <Badge className="ml-auto bg-amber-700 text-white">
                              {totalItems}
                            </Badge>
                          )}
                        </Link>
                        <Link
                          href="/login"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-black hover:bg-slate-100 transition-all duration-200"
                        >
                          <LogIn className="h-5 w-5 text-black" />
                          Se connecter
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4 items-center">
          {/* Notification dropdown only for connected users */}
          {user && <NotificationDropdown />}
          
          {/* Cart icon always visible */}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" onClick={handleCartClick}>
                <ShoppingBag className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-amber-700 text-white">
                    {totalItems}
                  </Badge>
                )}
                <span className="sr-only">Shopping cart</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg bg-background">
              <CartSidebar onClose={() => setCartOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Profile dropdown */}
          {user ? (
            <AuthNavbar
              user={user}
              logout={logout}
              getDashboardPath={getDashboardPath}
              totalItems={totalItems}
              setCartOpen={setCartOpen}
              displayAvatar={displayAvatar}
              displayName={displayName}
              displayRole={displayRole}
              mobile={false}
            />
          ) : (
            <GuestNavbar totalItems={totalItems} setCartOpen={setCartOpen} handleCartClick={handleCartClick} />
          )}
        </div>

        {/* Mobile navbar */}
        <div className="flex lg:hidden gap-2 items-center">
          {user ? (
            <AuthNavbar
              user={user}
              logout={logout}
              getDashboardPath={getDashboardPath}
              totalItems={totalItems}
              setCartOpen={setCartOpen}
              displayAvatar={displayAvatar}
              displayName={displayName}
              displayRole={displayRole}
              mobile={true}
            />
          ) : (
            <>
              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" onClick={handleCartClick}>
                    <ShoppingBag className="h-5 w-5" />
                    {totalItems > 0 && (
                      <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-amber-700 text-white">
                        {totalItems}
                      </Badge>
                    )}
                    <span className="sr-only">Shopping cart</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg bg-background">
                  <CartSidebar onClose={() => setCartOpen(false)} />
                </SheetContent>
              </Sheet>
              <GuestNavbar totalItems={totalItems} setCartOpen={setCartOpen} handleCartClick={handleCartClick} />
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

