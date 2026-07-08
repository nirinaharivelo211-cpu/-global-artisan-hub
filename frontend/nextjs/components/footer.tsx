// @ts-nocheck
import Link from "next/link"
import Image from "next/image"
import { Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-3 gap-8 items-start">
          {/* Left: Logo and Text */}
          <div className="flex flex-col items-center justify-start text-center pt-0">
            <Link href="/" className="inline-block">
              <span className="font-serif text-2xl font-bold text-foreground">E-artisan</span>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">L’artisanat à portée de main. Authenticité, créativité et savoir-faire réunis pour vous.</p>
          </div>

          {/* Center: Contact */}
          <div className="flex flex-col items-center justify-start text-center pt-0">
            <h3 className="font-serif text-2xl font-bold text-foreground mb-4">Contact</h3>
            <div className="flex items-start justify-center gap-2 mb-4">
              <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">23, Rue Fernand Kasanga Tsimbazaza Antananarivo Madagascar</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <a href="mailto:info@mta.gov.mg" className="text-sm text-muted-foreground hover:text-foreground transition-colors">info@mta.gov.mg</a>
            </div>
          </div>

          {/* Right: Logo */}
          <div className="flex flex-col items-center justify-start text-center pt-0">
            <Image
              src="https://www.mta.gov.mg/wp-content/uploads/2024/10/cropped-MTA.png"
              alt="Logo"
              width={80}
              height={80}
              className="object-contain"
            />
            <p className="mt-2 text-sm text-muted-foreground">Ministère du Tourisme et de l'Artisanat</p>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} E-artisan. Ministére du Tourisme et de l'Artisanat.
          </p>
        </div>
      </div>
    </footer>
  )
}

