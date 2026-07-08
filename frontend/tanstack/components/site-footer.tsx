import { Link } from "@tanstack/react-router";
import { Globe, Camera, ExternalLink, PlayCircle } from "lucide-react";
import { Logo } from "./site-header";
import { FOOTER_COLUMNS } from "@/lib/menu.config";

export function SiteFooter() {
  return (
    <footer className="bg-noir text-creme/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm text-creme/60">
            TISSAGE est la plateforme internationale qui valorise les artisans et facilite la vente de leurs créations partout dans le monde.
          </p>
          <div className="mt-5 flex gap-3">
            {[Globe, Camera, ExternalLink, PlayCircle].map((Icon, i) => (
              <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full border border-creme/15 text-creme/70 transition hover:border-or hover:text-or">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-[10px] text-creme/40">
            {["VISA","MASTERCARD","PAYPAL","STRIPE","APPLE PAY","G PAY","MVOLA","ORANGE","AIRTEL"].map(p => (
              <span key={p} className="rounded border border-creme/15 px-2 py-1">{p}</span>
            ))}
          </div>
        </div>
        {FOOTER_COLUMNS.map(col => (
          <div key={col.title}>
            <h4 className="font-display text-sm font-semibold tracking-wider text-creme">{col.title.toUpperCase()}</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((link) => (
                <li key={link.label}><Link to={link.to} search={link.search} className="hover:text-or">{link.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-creme/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-creme/50 md:flex-row">
          <p>© 2026 TISSAGE. Tous droits réservés.</p>
          <p>Tisser les savoir-faire, connecter le monde.</p>
        </div>
      </div>
    </footer>
  );
}
